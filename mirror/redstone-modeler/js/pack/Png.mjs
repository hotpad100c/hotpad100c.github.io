import { unzlibSync } from "../../lib/fflate.module.js?v=462b4e5";

/**
 * A PNG reader of our own, for when the browser cannot decode a file: it is the fallback of
 * `decode_png`. It reads every color type and bit depth, the five filters and Adam7 (interlaced)
 * images, and gives 8 bit RGBA. Nothing of the file besides its pixels matters here.
 */

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const MAX_SIDE = 16384;
const MAX_PIXELS = 64_000_000;
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
// Start and step of the seven passes of Adam7: x, y, dx, dy
const PASSES = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];

class PngError extends Error {}

/** Undoes the filter of one line, in place; `previous` is the line before (zeros for the first) */
function unfilter(type, line, previous, bytes_per_pixel) {
    const n = line.length;
    switch (type) {
        case 0:
            return;
        case 1:
            for (let i = bytes_per_pixel; i < n; i++) {
                line[i] = (line[i] + line[i - bytes_per_pixel]) & 255;
            }
            return;
        case 2:
            for (let i = 0; i < n; i++) {
                line[i] = (line[i] + previous[i]) & 255;
            }
            return;
        case 3:
            for (let i = 0; i < n; i++) {
                const left = i >= bytes_per_pixel ? line[i - bytes_per_pixel] : 0;
                line[i] = (line[i] + ((left + previous[i]) >> 1)) & 255;
            }
            return;
        case 4:
            for (let i = 0; i < n; i++) {
                const a = i >= bytes_per_pixel ? line[i - bytes_per_pixel] : 0;
                const b = previous[i];
                const c = i >= bytes_per_pixel ? previous[i - bytes_per_pixel] : 0;
                const p = a + b - c;
                const pa = Math.abs(p - a);
                const pb = Math.abs(p - b);
                const pc = Math.abs(p - c);
                line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
            }
            return;
        default:
            throw new PngError("The PNG has a filter that is not known");
    }
}

/**
 * @param {Uint8Array} bytes
 * @returns {{w: number, h: number, rgba: Uint8ClampedArray}}
 */
export function read_png(bytes) {
    if (bytes.length < 8 || SIGNATURE.some((value, i) => bytes[i] !== value)) {
        throw new PngError("This is not a PNG");
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let header = null;
    let palette = null;
    let transparency = null;
    const parts = [];
    for (let at = 8; at + 12 <= bytes.length;) {
        const length = view.getUint32(at);
        const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
        if (at + 12 + length > bytes.length) {
            throw new PngError("The PNG ends too early");
        }
        const data = bytes.subarray(at + 8, at + 8 + length);
        if (type === "IHDR") {
            header = { w: view.getUint32(at + 8), h: view.getUint32(at + 12), depth: data[8], color: data[9], interlace: data[12] };
        }
        else if (type === "PLTE") {
            palette = data;
        }
        else if (type === "tRNS") {
            transparency = data;
        }
        else if (type === "IDAT") {
            parts.push(data);
        }
        else if (type === "IEND") {
            break;
        }
        at += 12 + length;
    }
    if (!header || parts.length === 0) {
        throw new PngError("The PNG has no picture");
    }
    const { w, h, depth, color, interlace } = header;
    const channels = CHANNELS[color];
    if (!channels || ![1, 2, 4, 8, 16].includes(depth) || w < 1 || h < 1 || w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_PIXELS) {
        throw new PngError("The PNG has a size or a kind that is not supported");
    }
    if (color === 3 && !palette) {
        throw new PngError("The PNG has no palette");
    }
    const joined = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        joined.set(part, offset);
        offset += part.length;
    }
    let raw;
    try {
        raw = unzlibSync(joined);
    }
    catch {
        throw new PngError("The PNG is damaged");
    }

    const bits_per_pixel = channels * depth;
    const bytes_per_pixel = Math.max(1, bits_per_pixel >> 3);
    const rgba = new Uint8ClampedArray(w * h * 4);
    const scale = 255 / (2 ** depth - 1);
    const tr = transparency && color === 0 && transparency.length >= 2 ? (transparency[0] << 8) | transparency[1] : -1;
    const sample = (line, index) => {
        // The `index`th sample of a line of samples of `depth` bits
        if (depth === 8) {
            return line[index];
        }
        if (depth === 16) {
            return (line[index * 2] << 8) | line[index * 2 + 1];
        }
        const bit = index * depth;
        return (line[bit >> 3] >> (8 - depth - (bit & 7))) & (2 ** depth - 1);
    };
    const put = (line, x, out) => {
        const at = out * 4;
        if (color === 3) {
            const index = sample(line, x);
            rgba[at] = palette[index * 3] ?? 0;
            rgba[at + 1] = palette[index * 3 + 1] ?? 0;
            rgba[at + 2] = palette[index * 3 + 2] ?? 0;
            rgba[at + 3] = transparency && index < transparency.length ? transparency[index] : 255;
        }
        else if (color === 0 || color === 4) {
            const value = sample(line, x * channels);
            const grey = Math.round(value * scale);
            rgba[at] = rgba[at + 1] = rgba[at + 2] = grey;
            rgba[at + 3] = color === 4 ? Math.round(sample(line, x * 2 + 1) * scale) : (value === tr ? 0 : 255);
        }
        else {
            rgba[at] = Math.round(sample(line, x * channels) * scale);
            rgba[at + 1] = Math.round(sample(line, x * channels + 1) * scale);
            rgba[at + 2] = Math.round(sample(line, x * channels + 2) * scale);
            rgba[at + 3] = color === 6 ? Math.round(sample(line, x * 4 + 3) * scale) : 255;
        }
    };

    let at = 0;
    const read_image = (width, height, place) => {
        const stride = Math.ceil(width * bits_per_pixel / 8);
        let previous = new Uint8Array(stride);
        for (let y = 0; y < height; y++) {
            if (at + 1 + stride > raw.length) {
                throw new PngError("The PNG has less picture than its size says");
            }
            const type = raw[at];
            const line = raw.slice(at + 1, at + 1 + stride);
            at += 1 + stride;
            unfilter(type, line, previous, bytes_per_pixel);
            for (let x = 0; x < width; x++) {
                place(line, x, y);
            }
            previous = line;
        }
    };
    if (interlace === 1) {
        for (const [x0, y0, dx, dy] of PASSES) {
            const width = Math.ceil((w - x0) / dx);
            const height = Math.ceil((h - y0) / dy);
            if (width > 0 && height > 0) {
                read_image(width, height, (line, x, y) => put(line, x, (y0 + y * dy) * w + x0 + x * dx));
            }
        }
    }
    else {
        read_image(w, h, (line, x, y) => put(line, x, y * w + x));
    }
    return { w, h, rgba };
}
