import * as THREE from "../../lib/three.module.min.js?v=462b4e5";
import { MeshData } from "./MeshData.mjs?v=462b4e5";

/**
 * Renders small isometric pictures of single blocks, for the block list and hotbar.
 */
export class IconRenderer {
    constructor(size = 64) {
        this.size = size;
        this.canvas = document.createElement("canvas");
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(size, size, false);
        this.renderer.setClearColor(0x000000, 0);
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-0.95, 0.95, 0.95, -0.95, 0.1, 20);
        this.camera.position.set(0.5 + 3, 0.5 + 2.4, 0.5 + 3);
        this.camera.lookAt(0.5, 0.5, 0.5);
        /** @type {import("./Resources.mjs?v=462b4e5").Resources|null} */
        this.resources = null;
        this.cache = new Map();
    }

    set_resources(resources) {
        this.resources = resources;
        this.cache.clear();
    }

    /**
     * @param {string} name Block id
     * @param {Record<string, string>} state
     * @returns {string} Data URL
     */
    icon(name, state) {
        const key = `${name}|${Object.entries(state).sort().join(",")}`;
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const { resources } = this;
        const solid = new MeshData(resources.atlas);
        const translucent = new MeshData(resources.atlas);
        const full_state = { ...resources.pack.default_state(name), ...state };
        const tint = resources.tint(name, full_state);
        for (const quad of resources.pack.geometry(name, full_state).quads) {
            const rect = resources.pack.texture(quad.tex);
            (rect.translucent ? translucent : solid).add(quad, rect, [0, 0, 0], tint, null);
        }
        const meshes = [];
        for (const [data, material] of [[solid, resources.cutout], [translucent, resources.translucent]]) {
            if (!data.empty) {
                const mesh = new THREE.Mesh(data.to_geometry(), material);
                this.scene.add(mesh);
                meshes.push(mesh);
            }
        }
        this.renderer.render(this.scene, this.camera);
        const url = this.canvas.toDataURL("image/png");
        for (const mesh of meshes) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
        }
        this.cache.set(key, url);
        return url;
    }
}
