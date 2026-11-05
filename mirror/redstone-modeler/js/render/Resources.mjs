import * as THREE from "../../lib/three.module.min.js?v=462b4e5";
import { make_tint } from "./Tint.mjs?v=462b4e5";

/**
 * Everything the renderer needs from a loaded pack: geometry source, atlas texture, materials.
 */
export class Resources {
    /**
     * @param {import("../pack/CompiledPack.mjs?v=462b4e5").CompiledPack} pack
     * @param {HTMLCanvasElement} atlas_image The texture atlas; a canvas is the texture source browsers handle most reliably
     */
    constructor(pack, atlas_image) {
        this.pack = pack;
        this.tint = make_tint(pack.colormaps, pack.data.tint_colors, pack.data.tint_rules);
        this.texture = new THREE.CanvasTexture(atlas_image);
        this.texture.flipY = false;
        this.texture.premultiplyAlpha = false;
        this.texture.colorSpace = THREE.SRGBColorSpace;
        this.texture.magFilter = THREE.NearestFilter;
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.generateMipmaps = false;
        this.texture.needsUpdate = true;
        this.cutout = new THREE.MeshBasicMaterial({ map: this.texture, vertexColors: true, alphaTest: 0.1 });
        this.translucent = new THREE.MeshBasicMaterial({
            map: this.texture,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            alphaTest: 0.01,
        });
    }

    get atlas() {
        return this.pack.data.atlas;
    }

    dispose() {
        this.texture.dispose();
        this.cutout.dispose();
        this.translucent.dispose();
    }
}
