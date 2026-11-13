/**
 * Turns Minecraft block models into quads. Pure math, no WebGL, so it can be unit tested.
 *
 * Coordinates: x east, y up, z south, like in the game. Model files use 0..16, quads are
 * returned in 0..1 block space. Vertex order and uv conventions follow Minecraft's face baking.
 */

export const DIRS = ["down", "up", "north", "south", "west", "east"];

const DIR_VEC = {
    down: [0, -1, 0],
    up: [0, 1, 0],
    north: [0, 0, -1],
    south: [0, 0, 1],
    west: [-1, 0, 0],
    east: [1, 0, 0],
};

// 0 picks the element's `from` coordinate, 1 picks `to`. Counter-clockwise seen from outside.
const FACE_VERTS = {
    down: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
    up: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
    north: [[1, 1, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0]],
    south: [[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]],
    west: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]],
    east: [[1, 1, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0]],
};

export const MISSING = "minecraft:missing";

const EPS = 1e-6;

function clean(v) {
    return Math.abs(v) < EPS ? 0 : Math.round(v / EPS) * EPS;
}

/**
 * Right-handed rotation of a point around an axis through the origin.
 * @param {number[]} p
 * @param {"x"|"y"|"z"} axis
 * @param {number} degrees
 */
export function rotate_point([x, y, z], axis, degrees) {
    const rad = degrees * Math.PI / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    if (axis === "x") {
        return [x, y * c - z * s, y * s + z * c];
    }
    if (axis === "y") {
        return [x * c + z * s, y, -x * s + z * c];
    }
    return [x * c - y * s, x * s + y * c, z];
}

/**
 * Blockstate rotation: Minecraft turns models by -x about the x axis, then by -y about the y axis.
 * @param {number[]} p Point relative to the block centre
 */
function rotate_state(p, rot_x, rot_y) {
    let out = p;
    if (rot_x) {
        out = rotate_point(out, "x", -rot_x);
    }
    if (rot_y) {
        out = rotate_point(out, "y", -rot_y);
    }
    return out.map(clean);
}

function dir_of_vector(v) {
    let best = -1;
    let best_dot = -Infinity;
    DIRS.forEach((dir, index) => {
        const d = DIR_VEC[dir];
        const dot = v[0] * d[0] + v[1] * d[1] + v[2] * d[2];
        if (dot > best_dot) {
            best_dot = dot;
            best = index;
        }
    });
    return best;
}

function default_uv(dir, from, to) {
    switch (dir) {
        case "down": return [from[0], 16 - to[2], to[0], 16 - from[2]];
        case "up": return [from[0], from[2], to[0], to[2]];
        case "north": return [16 - to[0], 16 - to[1], 16 - from[0], 16 - from[1]];
        case "south": return [from[0], 16 - to[1], to[0], 16 - from[1]];
        case "west": return [from[2], 16 - to[1], to[2], 16 - from[1]];
        default: return [16 - to[2], 16 - to[1], 16 - from[2], 16 - from[1]];
    }
}

/** World-aligned uv used by `uvlock`, so textures do not turn with the block. */
function locked_uv(dir, p) {
    switch (dir) {
        case "down": return [p[0], 16 - p[2]];
        case "up": return [p[0], p[2]];
        case "north": return [16 - p[0], 16 - p[1]];
        case "south": return [p[0], 16 - p[1]];
        case "west": return [p[2], 16 - p[1]];
        default: return [16 - p[2], 16 - p[1]];
    }
}

function shade_of(normal) {
    const [nx, ny, nz] = normal;
    return (ny > 0 ? 1 : 0.5) * Math.abs(ny) + 0.8 * Math.abs(nz) + 0.6 * Math.abs(nx);
}

/**
 * @typedef {object} Quad
 * @property {number[]} pos 4 corners, 3 numbers each, in block space 0..1
 * @property {number[]} uv 4 corners, 2 numbers each, in 0..16 texture space
 * @property {string} tex Texture id
 * @property {number} cull Index into DIRS of the face to cull against, or -1
 * @property {number} shade Brightness 0..1
 * @property {number} tint Tint index, or -1
 */

/**
 * @param {object} element Model element with resolved textures
 * @param {{x: number, y: number, uvlock: boolean}} variant
 * @returns {Quad[]}
 */
export function build_element(element, variant) {
    const quads = [];
    const { from, to } = element;
    const rotation = element.rotation;
    for (const [dir, face] of Object.entries(element.faces ?? {})) {
        if (!FACE_VERTS[dir]) {
            continue;
        }
        let corners = FACE_VERTS[dir].map(([a, b, c]) => [
            a ? to[0] : from[0],
            b ? to[1] : from[1],
            c ? to[2] : from[2],
        ]);
        if (rotation && rotation.angle) {
            const origin = rotation.origin ?? [8, 8, 8];
            const scale = rotation.rescale ? 1 / Math.cos(rotation.angle * Math.PI / 180) : 1;
            corners = corners.map((p) => {
                let rel = p.map((v, i) => v - origin[i]);
                if (scale !== 1) {
                    rel = rel.map((v, i) => "xyz"[i] === rotation.axis ? v : v * scale);
                }
                return rotate_point(rel, rotation.axis, rotation.angle).map((v, i) => v + origin[i]);
            });
        }
        if (variant.x || variant.y) {
            corners = corners.map(p => rotate_state(p.map(v => v - 8), variant.x, variant.y).map(v => v + 8));
        }

        const uv = [];
        const final_dir = DIRS[dir_of_vector(
            rotate_state(DIR_VEC[dir], variant.x, variant.y),
        )];
        if (variant.uvlock && (variant.x || variant.y)) {
            for (const p of corners) {
                uv.push(...locked_uv(final_dir, p));
            }
        }
        else {
            const uvs = face.uv ?? default_uv(dir, from, to);
            const turn = ((face.rotation ?? 0) / 90 | 0) % 4;
            for (let i = 0; i < 4; i++) {
                const k = (i + turn + 4) % 4;
                uv.push(uvs[k === 0 || k === 1 ? 0 : 2], uvs[k === 0 || k === 3 ? 1 : 3]);
            }
        }

        const [p0, p1, p2] = corners;
        const a = p1.map((v, i) => v - p0[i]);
        const b = p2.map((v, i) => v - p0[i]);
        const normal = [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
        const length = Math.hypot(...normal) || 1;
        quads.push({
            pos: corners.flatMap(p => p.map(v => v / 16)),
            uv,
            tex: face.texture ?? MISSING,
            cull: face.cullface ? dir_of_vector(rotate_state(DIR_VEC[face.cullface] ?? [0, 0, 0], variant.x, variant.y)) : -1,
            shade: element.shade === false ? 1 : shade_of(normal.map(v => v / length)),
            tint: face.tintindex ?? -1,
        });
    }
    return quads;
}

function is_full_cube(element, is_opaque) {
    if (element.rotation?.angle) {
        return false;
    }
    if (!element.from.every(v => v === 0) || !element.to.every(v => v === 16)) {
        return false;
    }
    return DIRS.every(dir => element.faces?.[dir] && is_opaque(element.faces[dir].texture ?? MISSING));
}

/**
 * Builds the geometry of one block state.
 * @param {{x: number, y: number, uvlock: boolean, model: {elements: object[]}}[]} variants
 * @param {(texture_id: string) => boolean} is_opaque
 * @returns {{quads: Quad[], occludes: boolean}}
 */
export function build_block(variants, is_opaque) {
    const quads = [];
    let occludes = false;
    for (const variant of variants) {
        for (const element of variant.model.elements) {
            quads.push(...build_element(element, variant));
            occludes ||= is_full_cube(element, is_opaque);
        }
    }
    return { quads, occludes };
}

export const MISSING_MODEL = {
    elements: [{
        from: [0, 0, 0],
        to: [16, 16, 16],
        faces: Object.fromEntries(DIRS.map(dir => [dir, { uv: [0, 0, 16, 16], texture: null }])),
    }],
};
