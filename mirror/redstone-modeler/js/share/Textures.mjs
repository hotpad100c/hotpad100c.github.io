import { deflateSync } from "../../lib/fflate.module.js?v=462b4e5";
import { Reader, Writer } from "./Compact.mjs?v=462b4e5";

/**
 * Textures in one of three forms, whichever compresses best:
 *
 *   palette:     all textures share one palette, most used colours first, and every pixel is a palette
 *                index. Wins when the textures use few colours; the palette costs 3 or 4 bytes a colour.
 *   planes:      every texture as its red, green, blue (and alpha) plane.
 *   interleaved: every texture as red, green, blue (and alpha) of one pixel after another.
 *
 * Anything that is fully transparent becomes the same colour, since nobody can see the difference.
 * (Storing the difference to the pixel on the left, like PNG does, made noisy pixel art bigger, so it is not done.)
 *
 *   textures = count, form (0 palette, 1 planes, 2 interleaved), then
 *   palette:     palette size, `1` if it has alpha else `0`, the colours (red, green, blue, alpha if any),
 *                then for each texture width, height and a varint index per pixel
 *   the others:  for each texture width, height, `1` if it has alpha else `0`, then the values
 */
const FORM_PALETTE = 0;
const FORM_PLANES = 1;
const FORM_INTERLEAVED = 2;

const MAX_SIDE = 4096;
const MAX_PIXELS = 32_000_000;
const MAX_PALETTE = 1_000_000;

/** @typedef {{w: number, h: number, rgba: Uint8ClampedArray|Uint8Array}} Picture */

function color_key(r, g, b, a) {
    return a === 0 ? 0 : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

function split_key(key) {
    return [(key >>> 24) & 255, (key >>> 16) & 255, (key >>> 8) & 255, key & 255];
}

/**
 * Median cut: repeatedly splits the group of colours that spreads most along one channel, at the
 * middle of its pixels, until there are `count` groups; each group becomes its average colour.
 * @param {{key: number, count: number}[]} colors Distinct colours, none of them fully transparent
 * @param {number} count
 * @returns {Map<number, number>} Colour to the colour that replaces it
 */
export function reduce_colors(colors, count) {
    const items = colors.map(({ key, count: n }) => ({ key, n, c: split_key(key) }));
    const boxes = [items];
    const spread = (box) => {
        let best = { channel: 0, size: -1 };
        for (let channel = 0; channel < 4; channel++) {
            let low = 255;
            let high = 0;
            for (const item of box) {
                low = Math.min(low, item.c[channel]);
                high = Math.max(high, item.c[channel]);
            }
            if (high - low > best.size) {
                best = { channel, size: high - low };
            }
        }
        return best;
    };
    while (boxes.length < count) {
        let pick = -1;
        let pick_size = 0;
        boxes.forEach((box, i) => {
            if (box.length > 1) {
                const { size } = spread(box);
                if (size > pick_size) {
                    pick = i;
                    pick_size = size;
                }
            }
        });
        if (pick < 0) {
            break;
        }
        const box = boxes[pick];
        const { channel } = spread(box);
        box.sort((a, b) => a.c[channel] - b.c[channel] || a.key - b.key);
        const total = box.reduce((sum, item) => sum + item.n, 0);
        let seen = 0;
        let cut = 1;
        for (let i = 0; i < box.length - 1; i++) {
            seen += box[i].n;
            cut = i + 1;
            if (seen * 2 >= total) {
                break;
            }
        }
        boxes.splice(pick, 1, box.slice(0, cut), box.slice(cut));
    }
    const replacement = new Map();
    for (const box of boxes) {
        const total = box.reduce((sum, item) => sum + item.n, 0);
        const mean = [0, 1, 2, 3].map(channel => Math.round(box.reduce((sum, item) => sum + item.c[channel] * item.n, 0) / total));
        const key = color_key(...mean);
        for (const item of box) {
            replacement.set(item.key, key === 0 ? color_key(mean[0], mean[1], mean[2], 1) : key);
        }
    }
    return replacement;
}

function encode_palette(pictures, max_colors) {
    const counts = new Map();
    for (const { w, h, rgba } of pictures) {
        if (rgba.length !== w * h * 4) {
            throw new Error("A texture has the wrong number of pixels");
        }
        for (let i = 0; i < rgba.length; i += 4) {
            const key = color_key(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }

    let replacement = null;
    const opaque_colors = [...counts].filter(([key]) => key !== 0).map(([key, count]) => ({ key, count }));
    const room = max_colors - (counts.has(0) ? 1 : 0);
    if (opaque_colors.length > room) {
        replacement = reduce_colors(opaque_colors, Math.max(1, room));
        const merged = new Map();
        for (const [key, count] of counts) {
            const to = key === 0 ? 0 : replacement.get(key);
            merged.set(to, (merged.get(to) ?? 0) + count);
        }
        counts.clear();
        for (const [key, count] of merged) {
            counts.set(key, count);
        }
    }

    const palette = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([key]) => key);
    const index = new Map(palette.map((key, i) => [key, i]));
    const has_alpha = palette.some(key => key !== 0 && (key & 255) !== 255) || palette.includes(0);

    const writer = new Writer();
    writer.varint(pictures.length);
    writer.byte(FORM_PALETTE);
    writer.varint(palette.length);
    writer.byte(has_alpha ? 1 : 0);
    for (const key of palette) {
        const [r, g, b, a] = key === 0 ? [0, 0, 0, 0] : split_key(key);
        writer.byte(r);
        writer.byte(g);
        writer.byte(b);
        if (has_alpha) {
            writer.byte(a);
        }
    }
    for (const { w, h, rgba } of pictures) {
        writer.varint(w);
        writer.varint(h);
        for (let i = 0; i < rgba.length; i += 4) {
            let key = color_key(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]);
            if (replacement && key !== 0) {
                key = replacement.get(key);
            }
            writer.varint(index.get(key));
        }
    }
    return writer.finish();
}

function encode_raw(pictures, form, force_alpha = false) {
    const writer = new Writer();
    writer.varint(pictures.length);
    writer.byte(form);
    for (const { w, h, rgba } of pictures) {
        if (rgba.length !== w * h * 4) {
            throw new Error("A texture has the wrong number of pixels");
        }
        let has_alpha = force_alpha;
        for (let i = 3; i < rgba.length && !has_alpha; i += 4) {
            if (rgba[i] !== 255) {
                has_alpha = true;
            }
        }
        writer.varint(w);
        writer.varint(h);
        writer.byte(has_alpha ? 1 : 0);
        const channels = has_alpha ? 4 : 3;
        const value = (pixel, channel) => (rgba[pixel * 4 + 3] === 0 ? 0 : rgba[pixel * 4 + channel]);
        if (form === FORM_PLANES) {
            for (let channel = 0; channel < channels; channel++) {
                for (let pixel = 0; pixel < w * h; pixel++) {
                    writer.byte(value(pixel, channel));
                }
            }
        }
        else {
            for (let pixel = 0; pixel < w * h; pixel++) {
                for (let channel = 0; channel < channels; channel++) {
                    writer.byte(value(pixel, channel));
                }
            }
        }
    }
    return writer.finish();
}

/**
 * @param {Picture[]} pictures
 * @param {object} [options]
 * @param {number} [options.max_colors] Reduce the colours to at most this many (lossy); this always gives the palette form
 * @param {"auto"|"palette"|"planes"|"interleaved"} [options.form] `auto` tries all and keeps the one that compresses best
 * @returns {Uint8Array}
 */
export function encode_textures(pictures, { max_colors = Infinity, form = "auto" } = {}) {
    if (max_colors !== Infinity || form === "palette") {
        return encode_palette(pictures, max_colors);
    }
    if (form === "planes") {
        return encode_raw(pictures, FORM_PLANES);
    }
    if (form === "interleaved") {
        return encode_raw(pictures, FORM_INTERLEAVED);
    }
    // Leaving out the alpha of opaque textures is not always smaller: a steady 255 helps the compression to tell the pixels apart
    const candidates = [
        encode_palette(pictures, Infinity),
        encode_raw(pictures, FORM_PLANES),
        encode_raw(pictures, FORM_INTERLEAVED),
        encode_raw(pictures, FORM_INTERLEAVED, true),
    ];
    const sizes = candidates.map(bytes => deflateSync(bytes, { level: 9 }).length);
    return candidates[sizes.indexOf(Math.min(...sizes))];
}

/**
 * @param {Uint8Array} bytes
 * @returns {{w: number, h: number, rgba: Uint8ClampedArray}[]}
 */
export function decode_textures(bytes) {
    const reader = new Reader(bytes);
    const count = reader.varint();
    if (count > reader.remaining) {
        throw new Error("The textures are damaged");
    }
    const form = reader.byte();
    let pictures;
    if (form === FORM_PALETTE) {
        pictures = decode_palette(reader, count);
    }
    else if (form === FORM_PLANES || form === FORM_INTERLEAVED) {
        pictures = decode_raw(reader, count, form);
    }
    else {
        throw new Error("The textures are in a form that is not known");
    }
    if (reader.remaining !== 0) {
        throw new Error("The textures have something left over at the end");
    }
    return pictures;
}

function read_size(reader, state) {
    const w = reader.varint();
    const h = reader.varint();
    state.pixels += w * h;
    if (w > MAX_SIDE || h > MAX_SIDE || state.pixels > MAX_PIXELS) {
        throw new Error("The textures are damaged or too large");
    }
    return [w, h];
}

function decode_raw(reader, count, form) {
    const state = { pixels: 0 };
    const pictures = [];
    for (let n = 0; n < count; n++) {
        const [w, h] = read_size(reader, state);
        const has_alpha = reader.byte() === 1;
        const channels = has_alpha ? 4 : 3;
        if (w * h * channels > reader.remaining) {
            throw new Error("The textures are damaged or too large");
        }
        const rgba = new Uint8ClampedArray(w * h * 4);
        if (!has_alpha) {
            for (let i = 3; i < rgba.length; i += 4) {
                rgba[i] = 255;
            }
        }
        const values = reader.bytes(w * h * channels);
        for (let pixel = 0; pixel < w * h; pixel++) {
            for (let channel = 0; channel < channels; channel++) {
                rgba[pixel * 4 + channel] = form === FORM_PLANES ? values[channel * w * h + pixel] : values[pixel * channels + channel];
            }
        }
        pictures.push({ w, h, rgba });
    }
    return pictures;
}

function decode_palette(reader, count) {
    const size = reader.varint();
    const has_alpha = reader.byte() === 1;
    if (size > MAX_PALETTE || size * (has_alpha ? 4 : 3) > reader.remaining) {
        throw new Error("The textures are damaged");
    }
    const palette = [];
    for (let i = 0; i < size; i++) {
        const r = reader.byte();
        const g = reader.byte();
        const b = reader.byte();
        palette.push([r, g, b, has_alpha ? reader.byte() : 255]);
    }
    const state = { pixels: 0 };
    const pictures = [];
    for (let n = 0; n < count; n++) {
        const [w, h] = read_size(reader, state);
        if (w * h > reader.remaining) {
            throw new Error("The textures are damaged or too large");
        }
        const rgba = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < w * h; i++) {
            const entry = palette[reader.varint()];
            if (!entry) {
                throw new Error("The textures refer to a colour that is not there");
            }
            rgba.set(entry, i * 4);
        }
        pictures.push({ w, h, rgba });
    }
    return pictures;
}
