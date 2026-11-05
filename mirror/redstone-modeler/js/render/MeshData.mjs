import * as THREE from "../../lib/three.module.min.js?v=462b4e5";

/** Vertex shading is multiplied with sRGB textures, so convert to the linear space three.js expects. */
const to_linear = v => v ** 2.2;

/**
 * Collects quads into one indexed buffer geometry.
 */
export class MeshData {
    /**
     * @param {{width: number, height: number}} atlas
     */
    constructor(atlas) {
        this.atlas = atlas;
        this.positions = [];
        this.uvs = [];
        this.colors = [];
        this.indices = [];
        /** Block cell of every quad, in insertion order */
        this.cells = [];
    }

    /**
     * @param {import("./BlockMesher.mjs?v=462b4e5").Quad} quad
     * @param {{x: number, y: number, w: number, h: number}} rect Texture rectangle in the atlas, pixels
     * @param {number[]} offset Block position
     * @param {number[]} tint RGB 0..1
     * @param {number[]} cell
     * @param {number} [brightness] Multiplier, used to dim blocks behind the 2D plane
     */
    add(quad, rect, offset, tint, cell, brightness = 1) {
        const start = this.positions.length / 3;
        const shade = to_linear(quad.shade * brightness);
        const rgb = quad.tint >= 0 ? tint.map(to_linear) : [1, 1, 1];
        for (let i = 0; i < 4; i++) {
            this.positions.push(
                quad.pos[i * 3] + offset[0],
                quad.pos[i * 3 + 1] + offset[1],
                quad.pos[i * 3 + 2] + offset[2],
            );
            this.uvs.push(
                (rect.x + quad.uv[i * 2] / 16 * rect.w) / this.atlas.width,
                (rect.y + quad.uv[i * 2 + 1] / 16 * rect.h) / this.atlas.height,
            );
            this.colors.push(rgb[0] * shade, rgb[1] * shade, rgb[2] * shade);
        }
        this.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
        this.cells.push(cell);
    }

    get empty() {
        return this.cells.length === 0;
    }

    to_geometry() {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
        geometry.setIndex(this.indices);
        geometry.computeBoundingSphere();
        return geometry;
    }
}
