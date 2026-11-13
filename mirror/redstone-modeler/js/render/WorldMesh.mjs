import * as THREE from "../../lib/three.module.min.js?v=462b4e5";
import { DIRS } from "./BlockMesher.mjs?v=462b4e5";
import { MeshData } from "./MeshData.mjs?v=462b4e5";
import { CHUNK, World } from "../model/World.mjs?v=462b4e5";

const DIR_OFFSET = {
    down: [0, -1, 0],
    up: [0, 1, 0],
    north: [0, 0, -1],
    south: [0, 0, 1],
    west: [-1, 0, 0],
    east: [1, 0, 0],
};

/** Up to this many chunks are always built at once; a bigger job is spread over frames */
const BUILD_AT_ONCE = 8;
/** Milliseconds per call of `update` spent on building chunks, once there are more than BUILD_AT_ONCE */
const BUDGET_MS = 8;

/**
 * Geometry of the blocks, one pair of meshes (opaque and see-through) for each chunk of 16 x 16 x 16.
 * Only the chunks that changed are built again. Faces covered by an opaque full block are skipped,
 * also when the block is in the next chunk. A change of the 2D slice or of the resources builds all
 * chunks again, a few at a time when there are many, so the page keeps responding.
 * Vertices are relative to the chunk, which keeps them precise in large worlds.
 */
export class WorldMesh {
    /**
     * @param {import("../model/World.mjs?v=462b4e5").World} world
     */
    constructor(world) {
        this.world = world;
        /** @type {{axis: number, index: number, side: number}|null} */
        this.slice = null;
        /** @type {import("./Resources.mjs?v=462b4e5").Resources|null} */
        this.resources = null;
        this.group = new THREE.Group();
        /** @type {Map<number, THREE.Mesh[]>} */
        this.chunk_meshes = new Map();
        /** Chunks that still have to be built */
        this.pending = new Set();
        this.built_slice = undefined;
        this.built_resources = null;
        this._meshes = null;
    }

    /** @returns {THREE.Mesh[]} All meshes; `userData.cells` of each gives the block of every quad */
    get meshes() {
        this._meshes ??= [...this.chunk_meshes.values()].flat();
        return this._meshes;
    }

    set_resources(resources) {
        this.resources = resources;
    }

    /**
     * Shows a 2D slice: blocks nearer to the camera than the plane are hidden, blocks behind it are dimmed.
     * @param {{axis: number, index: number, side: number}|null} slice
     *   axis 0/1/2 is x/y/z, side is +1 or -1, the side of the world the camera is on
     */
    set_slice(slice) {
        this.slice = slice;
    }

    /** @returns {-1|0|1} 1 hidden, 0 on the plane, -1 behind the plane */
    _depth(x, y, z) {
        if (!this.slice) {
            return 0;
        }
        const { axis, index, side } = this.slice;
        const delta = ([x, y, z][axis] - index) * side;
        return Math.sign(delta);
    }

    _drop(key) {
        for (const mesh of this.chunk_meshes.get(key) ?? []) {
            this.group.remove(mesh);
            mesh.geometry.dispose();
        }
        if (this.chunk_meshes.delete(key)) {
            this._meshes = null;
        }
    }

    /** Whether everything is built */
    get idle() {
        return this.pending.size === 0 && this.world.dirty.size === 0
            && this.built_slice === this.slice && this.built_resources === this.resources;
    }

    /**
     * Builds what changed.
     * @param {number} [budget] Milliseconds to spend when there is a lot to build; `Infinity` builds everything
     */
    update(budget = BUDGET_MS) {
        for (const key of this.world.take_dirty()) {
            this.pending.add(key);
        }
        if (this.built_slice !== this.slice || this.built_resources !== this.resources) {
            const before = this.built_slice;
            const resources_same = this.built_resources === this.resources;
            this.built_slice = this.slice;
            this.built_resources = this.resources;
            // Moving the plane along its axis only changes the chunks the plane passed through
            // (a block next to the plane decides about its neighbour's faces, hence the margin of one)
            const moved = resources_same && before && this.slice && before.axis === this.slice.axis && before.side === this.slice.side;
            const low = moved ? Math.min(before.index, this.slice.index) - 1 : 0;
            const high = moved ? Math.max(before.index, this.slice.index) + 1 : 0;
            for (const key of [...this.world.chunks.keys(), ...this.chunk_meshes.keys()]) {
                if (moved) {
                    const start = World.chunk_coords(key)[this.slice.axis] * CHUNK;
                    if (start + CHUNK - 1 < low || start > high) {
                        continue;
                    }
                }
                this.pending.add(key);
            }
        }
        if (this.pending.size === 0) {
            return;
        }
        if (!this.resources) {
            for (const key of this.pending) {
                this._drop(key);
            }
            this.pending.clear();
            return;
        }
        const all = this.pending.size <= BUILD_AT_ONCE;
        const start = performance.now();
        for (const key of this.pending) {
            this.pending.delete(key);
            this._build(key);
            if (!all && performance.now() - start >= budget) {
                break;
            }
        }
    }

    /** Builds everything that is waiting. */
    flush() {
        this.update(Infinity);
    }

    _build(key) {
        this._drop(key);
        const chunk = this.world.chunks.get(key);
        if (!chunk) {
            return;
        }
        const { resources } = this;
        const { pack } = resources;
        const solid = new MeshData(resources.atlas);
        const translucent = new MeshData(resources.atlas);
        const geometry_of = block => pack.geometry(block.name, block.props);
        const ox = chunk.cx * CHUNK;
        const oy = chunk.cy * CHUNK;
        const oz = chunk.cz * CHUNK;

        for (const [x, y, z, block] of this.world._chunk_entries(chunk)) {
            const depth = this._depth(x, y, z);
            if (depth > 0) {
                continue;
            }
            const brightness = depth < 0 ? 0.45 : 1;
            const { quads } = geometry_of(block);
            let tint = null;
            for (const quad of quads) {
                if (quad.cull >= 0) {
                    const [dx, dy, dz] = DIR_OFFSET[DIRS[quad.cull]];
                    const neighbour = this._depth(x + dx, y + dy, z + dz) > 0 ? null : this.world.get(x + dx, y + dy, z + dz);
                    if (neighbour && geometry_of(neighbour).occludes) {
                        continue;
                    }
                }
                if (quad.tint >= 0) {
                    tint ??= resources.tint(block.name, { ...pack.default_state(block.name), ...block.props });
                }
                const rect = pack.texture(quad.tex);
                (rect.translucent ? translucent : solid).add(quad, rect, [x - ox, y - oy, z - oz], tint ?? [1, 1, 1], [x, y, z], brightness);
            }
        }

        const meshes = [];
        for (const [data, material, order] of [[solid, resources.cutout, 0], [translucent, resources.translucent, 1]]) {
            if (!data.empty) {
                const mesh = new THREE.Mesh(data.to_geometry(), material);
                mesh.position.set(ox, oy, oz);
                mesh.renderOrder = order;
                mesh.userData.cells = data.cells;
                this.group.add(mesh);
                meshes.push(mesh);
            }
        }
        if (meshes.length > 0) {
            this.chunk_meshes.set(key, meshes);
            this._meshes = null;
        }
    }
}
