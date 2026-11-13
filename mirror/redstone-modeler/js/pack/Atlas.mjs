import { MISSING } from "../render/BlockMesher.mjs?v=462b4e5";
import { asset_path } from "./PackStack.mjs?v=462b4e5";
import { read_png } from "./Png.mjs?v=462b4e5";

function make_canvas(width, height) {
    // A plain canvas: building the atlas happens on the main thread anyway, and OffscreenCanvas
    // is missing or incomplete in some Safari versions
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Uint8Array>}
 */
export async function canvas_to_png(canvas) {
    const blob = await new Promise((resolve, reject) => canvas.toBlob(
        result => result ? resolve(result) : reject(new Error("The browser could not encode the texture atlas")),
        "image/png",
    ));
    return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Decodes PNG bytes. Prefers createImageBitmap, falls back to an image element for browsers
 * that lack it or reject its options.
 * @param {Uint8Array} bytes
 * @returns {Promise<ImageBitmap|HTMLImageElement|HTMLCanvasElement>}
 */
export async function decode_png(bytes) {
    const blob = new Blob([bytes], { type: "image/png" });
    if (typeof createImageBitmap === "function") {
        try {
            return await createImageBitmap(blob);
        }
        catch {
            // Fall through to the image element
        }
    }
    const url = URL.createObjectURL(blob);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        return image;
    }
    catch (browser_error) {
        // Some browsers refuse some PNGs (a kind of grey, a damaged checksum); our own reader may not
        try {
            const { w, h, rgba } = read_png(bytes);
            const canvas = make_canvas(w, h);
            canvas.getContext("2d").putImageData(new ImageData(rgba, w, h), 0, 0);
            return canvas;
        }
        catch {
            throw browser_error;
        }
    }
    finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Draws a decoded image onto a canvas. Canvases are the most widely supported WebGL texture source.
 * @param {ImageBitmap|HTMLImageElement} image
 * @returns {HTMLCanvasElement}
 */
export function image_to_canvas(image) {
    const canvas = make_canvas(image.width, image.height);
    canvas.getContext("2d").drawImage(image, 0, 0);
    return canvas;
}

function next_pow2(n) {
    let p = 1;
    while (p < n) {
        p *= 2;
    }
    return p;
}

const MAX_SIZE = 8192;

function yield_to_ui() {
    return new Promise(resolve => setTimeout(resolve));
}

/**
 * Draws a texture and repeats its outermost pixels around it, so that nearest filtering never bleeds.
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} image
 */
function draw_with_border(ctx, image, w, h, ix, iy) {
    ctx.drawImage(image, 0, 0, w, h, ix, iy, w, h);
    ctx.drawImage(image, 0, 0, w, 1, ix, iy - 1, w, 1);
    ctx.drawImage(image, 0, h - 1, w, 1, ix, iy + h, w, 1);
    ctx.drawImage(image, 0, 0, 1, h, ix - 1, iy, 1, h);
    ctx.drawImage(image, w - 1, 0, 1, h, ix + w, iy, 1, h);
    ctx.drawImage(image, 0, 0, 1, 1, ix - 1, iy - 1, 1, 1);
    ctx.drawImage(image, w - 1, 0, 1, 1, ix + w, iy - 1, 1, 1);
    ctx.drawImage(image, 0, h - 1, 1, 1, ix - 1, iy + h, 1, 1);
    ctx.drawImage(image, w - 1, h - 1, 1, 1, ix + w, iy + h, 1, 1);
}

/**
 * Whether a texture hides what is behind it, and whether it is see-through in between.
 * @param {Uint8ClampedArray} pixels RGBA
 */
export function transparency(pixels) {
    let opaque = true;
    let translucent = false;
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] !== 255) {
            opaque = false;
            if (pixels[i] !== 0) {
                translucent = true;
            }
        }
    }
    return { opaque, translucent };
}

/**
 * Builds an atlas from the pixels of textures.
 * @param {{id: string, w: number, h: number, rgba: Uint8ClampedArray}[]} pictures
 */
export async function compose_atlas(pictures) {
    const entries = pictures.map(({ id, w, h, rgba }) => ({ id, w, h, rgba }));
    const { width, height } = layout(entries);
    const canvas = make_canvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const textures = {};
    for (const { id, w, h, rgba, x, y } of entries) {
        const piece = make_canvas(w, h);
        piece.getContext("2d").putImageData(new ImageData(rgba, w, h), 0, 0);
        draw_with_border(ctx, piece, w, h, x, y);
        textures[id] = { x, y, w, h, ...transparency(rgba) };
    }
    return { atlas: { width, height, textures }, png: await canvas_to_png(canvas) };
}

/**
 * The pixels of some textures of an atlas, without their border.
 * @param {HTMLCanvasElement} source
 * @param {Record<string, {x: number, y: number, w: number, h: number}>} textures
 * @param {string[]} ids
 * @returns {{id: string, w: number, h: number, rgba: Uint8ClampedArray}[]}
 */
export function extract_pixels(source, textures, ids) {
    const ctx = source.getContext("2d", { willReadFrequently: true });
    return ids.map((id) => {
        const { x, y, w, h } = textures[id];
        return { id, w, h, rgba: ctx.getImageData(x, y, w, h).data };
    });
}

/**
 * Shelf packing, tallest first. Gives every entry a position `x`, `y` (inside its one pixel border).
 * @param {{w: number, h: number}[]} entries
 * @returns {{width: number, height: number}}
 */
export function layout(entries) {
    entries.sort((a, b) => b.h - a.h || b.w - a.w);
    const area = entries.reduce((sum, e) => sum + (e.w + 2) * (e.h + 2), 0);
    const widest = Math.max(...entries.map(e => e.w + 2));
    const width = next_pow2(Math.max(widest, Math.ceil(Math.sqrt(area * 1.15))));
    let x = 0;
    let y = 0;
    let row = 0;
    for (const entry of entries) {
        if (x + entry.w + 2 > width) {
            x = 0;
            y += row;
            row = 0;
        }
        entry.x = x + 1;
        entry.y = y + 1;
        x += entry.w + 2;
        row = Math.max(row, entry.h + 2);
    }
    const height = next_pow2(y + row);
    if (width > MAX_SIZE || height > MAX_SIZE) {
        throw new Error(`Texture atlas would be ${width}x${height}; the resource packs have too many or too large textures`);
    }
    return { width, height };
}

/**
 * Makes a smaller atlas out of some of the textures of an existing one. The textures are copied
 * together with their border, so nothing has to be decoded again.
 * @param {HTMLCanvasElement} source The existing atlas
 * @param {Record<string, {x: number, y: number, w: number, h: number, opaque: boolean, translucent: boolean}>} textures Where they are in it
 * @param {string[]} ids The textures to keep
 */
export async function repack_atlas(source, textures, ids) {
    const entries = ids.map(id => ({ id, w: textures[id].w, h: textures[id].h }));
    const { width, height } = layout(entries);
    const canvas = make_canvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const result = {};
    for (const { id, w, h, x, y } of entries) {
        const from = textures[id];
        ctx.drawImage(source, from.x - 1, from.y - 1, w + 2, h + 2, x - 1, y - 1, w + 2, h + 2);
        result[id] = { x, y, w, h, opaque: from.opaque, translucent: from.translucent };
    }
    return { atlas: { width, height, textures: result }, png: await canvas_to_png(canvas) };
}

/**
 * Stitches textures into one image. Animated textures (tall strips) keep their first frame.
 * Every texture gets a one pixel border of its own edge pixels so nearest filtering never bleeds.
 * @param {import("./PackStack.mjs?v=462b4e5").PackStack} stack
 * @param {string[]} ids Texture ids
 * @param {(done: number, total: number) => void} [progress]
 * @param {{id: string, reason: string}[]} [problems] Receives the textures that could not be put in: not found, or not readable
 */
export async function build_atlas(stack, ids, progress = () => {}, problems = []) {
    const entries = [];
    const checker = make_canvas(16, 16);
    const check_ctx = checker.getContext("2d");
    check_ctx.fillStyle = "#000000";
    check_ctx.fillRect(0, 0, 16, 16);
    check_ctx.fillStyle = "#f800f8";
    check_ctx.fillRect(0, 0, 8, 8);
    check_ctx.fillRect(8, 8, 8, 8);
    entries.push({ id: MISSING, image: checker, w: 16, h: 16 });

    let done = 0;
    for (const id of ids) {
        const bytes = stack.get(asset_path("textures", id, "png"));
        if (bytes) {
            try {
                const image = await decode_png(bytes);
                const frame = image.height > image.width && image.height % image.width === 0 ? image.width : image.height;
                entries.push({ id, image, w: image.width, h: frame });
            }
            catch (error) {
                console.warn(`Could not decode texture ${id}`, error);
                problems.push({ id, reason: `could not be read (${error?.message ?? error})` });
            }
        }
        else {
            problems.push({ id, reason: "is not in any of the packs" });
        }
        if (++done % 40 === 0) {
            progress(done, ids.length);
            await yield_to_ui();
        }
    }

    const { width, height } = layout(entries);

    const canvas = make_canvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    const textures = {};
    for (const { id, image, w, h, x: ix, y: iy } of entries) {
        draw_with_border(ctx, image, w, h, ix, iy);
        textures[id] = { x: ix, y: iy, w, h, ...transparency(ctx.getImageData(ix, iy, w, h).data) };
    }
    progress(ids.length, ids.length);
    return { atlas: { width, height, textures }, png: await canvas_to_png(canvas) };
}
