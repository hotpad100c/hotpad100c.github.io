import { decompressSync, gzipSync } from "../../lib/fflate.module.js?v=462b4e5";

/**
 * Java Edition NBT (big endian), the container of litematics, schematics and structures.
 *
 * Values read: byte, short, int, float, double as numbers; long as BigInt; string as string;
 * byte, int and long arrays as Int8Array, Int32Array and BigInt64Array; a list as `{type, items}`
 * (the type is kept, since an empty list still has one); a compound as a plain object (a `Map` would
 * be safer against odd keys, but keys named `__proto__` are refused instead).
 * To write, the values must say which tag they are: use the helpers below (`byte`, `short`, `float`,
 * `double`, `long`, `list`), a plain number is written as an int.
 */

export const TAG = { END: 0, BYTE: 1, SHORT: 2, INT: 3, LONG: 4, FLOAT: 5, DOUBLE: 6, BYTE_ARRAY: 7, STRING: 8, LIST: 9, COMPOUND: 10, INT_ARRAY: 11, LONG_ARRAY: 12 };

const MAX_DEPTH = 64;
export const MAX_NBT = 512 * 1024 * 1024;

class Typed {
    constructor(tag, value) {
        this.tag = tag;
        this.value = value;
    }
}

export const byte = value => new Typed(TAG.BYTE, value);
export const short = value => new Typed(TAG.SHORT, value);
export const float = value => new Typed(TAG.FLOAT, value);
export const double = value => new Typed(TAG.DOUBLE, value);
export const long = value => new Typed(TAG.LONG, BigInt(value));
/** @param {number} type A TAG value @param {unknown[]} items */
export const list = (type, items) => ({ type, items });

/** The kind of a tag, so that a reader can tell a list from a compound without guessing */
export const is_list = value => value !== null && typeof value === "object" && Array.isArray(value.items) && typeof value.type === "number";

const decoder = new TextDecoder("utf-8", { fatal: false });
const encoder = new TextEncoder();

class Reader {
    constructor(bytes) {
        this.bytes = bytes;
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        this.at = 0;
    }

    need(n) {
        if (n < 0 || this.at + n > this.bytes.length) {
            throw new Error("The NBT data ends too early");
        }
    }

    u8() {
        this.need(1);
        return this.bytes[this.at++];
    }

    string() {
        this.need(2);
        const length = this.view.getUint16(this.at);
        this.at += 2;
        this.need(length);
        const text = decoder.decode(this.bytes.subarray(this.at, this.at + length));
        this.at += length;
        return text;
    }

    length() {
        this.need(4);
        const n = this.view.getInt32(this.at);
        this.at += 4;
        if (n < 0) {
            throw new Error("The NBT data has a negative length");
        }
        return n;
    }

    value(tag, depth) {
        if (depth > MAX_DEPTH) {
            throw new Error("The NBT data is nested too deeply");
        }
        const { view } = this;
        switch (tag) {
            case TAG.BYTE:
                this.need(1);
                return view.getInt8(this.at++);
            case TAG.SHORT:
                this.need(2);
                this.at += 2;
                return view.getInt16(this.at - 2);
            case TAG.INT:
                this.need(4);
                this.at += 4;
                return view.getInt32(this.at - 4);
            case TAG.LONG:
                this.need(8);
                this.at += 8;
                return view.getBigInt64(this.at - 8);
            case TAG.FLOAT:
                this.need(4);
                this.at += 4;
                return view.getFloat32(this.at - 4);
            case TAG.DOUBLE:
                this.need(8);
                this.at += 8;
                return view.getFloat64(this.at - 8);
            case TAG.STRING:
                return this.string();
            case TAG.BYTE_ARRAY: {
                const n = this.length();
                this.need(n);
                const out = new Int8Array(n);
                out.set(new Int8Array(this.bytes.buffer, this.bytes.byteOffset + this.at, n));
                this.at += n;
                return out;
            }
            case TAG.INT_ARRAY: {
                const n = this.length();
                this.need(n * 4);
                const out = new Int32Array(n);
                for (let i = 0; i < n; i++) {
                    out[i] = view.getInt32(this.at + i * 4);
                }
                this.at += n * 4;
                return out;
            }
            case TAG.LONG_ARRAY: {
                const n = this.length();
                this.need(n * 8);
                const out = new BigInt64Array(n);
                for (let i = 0; i < n; i++) {
                    out[i] = view.getBigInt64(this.at + i * 8);
                }
                this.at += n * 8;
                return out;
            }
            case TAG.LIST: {
                const type = this.u8();
                const n = this.length();
                if (type === TAG.END && n > 0) {
                    throw new Error("The NBT data has a list of nothing");
                }
                // Every item takes at least a byte, except in a list of nothing: a count that cannot be true is damage
                if (type !== TAG.END && n > this.bytes.length - this.at) {
                    throw new Error("The NBT data ends too early");
                }
                const items = new Array(n);
                for (let i = 0; i < n; i++) {
                    items[i] = this.value(type, depth + 1);
                }
                return { type, items };
            }
            case TAG.COMPOUND: {
                const out = {};
                for (;;) {
                    const child = this.u8();
                    if (child === TAG.END) {
                        return out;
                    }
                    const name = this.string();
                    if (name === "__proto__") {
                        throw new Error("The NBT data has a name that is not allowed");
                    }
                    out[name] = this.value(child, depth + 1);
                }
            }
            default:
                throw new Error(`The NBT data has a tag that is not known (${tag})`);
        }
    }
}

/**
 * @param {Uint8Array} bytes NBT, gzip or zlib compressed or not
 * @returns {{name: string, value: Record<string, unknown>}} The root compound and its name
 */
export function read_nbt(bytes) {
    let raw = bytes;
    if ((bytes[0] === 0x1F && bytes[1] === 0x8B) || (bytes[0] === 0x78 && [0x01, 0x5E, 0x9C, 0xDA].includes(bytes[1]))) {
        try {
            raw = decompress_limited(bytes);
        }
        catch (error) {
            throw new Error(`The file could not be unpacked: ${error.message}`);
        }
    }
    const reader = new Reader(raw);
    if (reader.u8() !== TAG.COMPOUND) {
        throw new Error("This is not an NBT file");
    }
    const name = reader.string();
    const value = reader.value(TAG.COMPOUND, 0);
    return { name, value };
}

function decompress_limited(bytes) {
    // fflate has no limit of its own; a quick look at the size gzip announces (its last four bytes) stops the worst
    if (bytes[0] === 0x1F && bytes.length > 18) {
        const announced = new DataView(bytes.buffer, bytes.byteOffset + bytes.length - 4, 4).getUint32(0, true);
        if (announced > MAX_NBT) {
            throw new Error("too big once unpacked");
        }
    }
    const out = decompressSync(bytes);
    if (out.length > MAX_NBT) {
        throw new Error("too big once unpacked");
    }
    return out;
}

class Writer {
    constructor() {
        this.bytes = new Uint8Array(1024);
        this.view = new DataView(this.bytes.buffer);
        this.at = 0;
    }

    grow(n) {
        if (this.at + n > this.bytes.length) {
            const bigger = new Uint8Array(Math.max(this.bytes.length * 2, this.at + n));
            bigger.set(this.bytes);
            this.bytes = bigger;
            this.view = new DataView(bigger.buffer);
        }
    }

    u8(v) {
        this.grow(1);
        this.bytes[this.at++] = v;
    }

    string(text) {
        const data = encoder.encode(text);
        if (data.length > 0xFFFF) {
            throw new Error("A name is too long for NBT");
        }
        this.grow(2 + data.length);
        this.view.setUint16(this.at, data.length);
        this.bytes.set(data, this.at + 2);
        this.at += 2 + data.length;
    }

    int(v) {
        this.grow(4);
        this.view.setInt32(this.at, v);
        this.at += 4;
    }

    tag_of(value) {
        if (value instanceof Typed) {
            return value.tag;
        }
        if (typeof value === "number") {
            return TAG.INT;
        }
        if (typeof value === "string") {
            return TAG.STRING;
        }
        if (typeof value === "bigint") {
            return TAG.LONG;
        }
        if (value instanceof Int8Array || value instanceof Uint8Array) {
            return TAG.BYTE_ARRAY;
        }
        if (value instanceof Int32Array) {
            return TAG.INT_ARRAY;
        }
        if (value instanceof BigInt64Array) {
            return TAG.LONG_ARRAY;
        }
        if (is_list(value)) {
            return TAG.LIST;
        }
        if (value !== null && typeof value === "object") {
            return TAG.COMPOUND;
        }
        throw new Error(`Cannot write ${typeof value} as NBT`);
    }

    value(tag, value) {
        const raw = value instanceof Typed ? value.value : value;
        switch (tag) {
            case TAG.BYTE:
                this.grow(1);
                this.view.setInt8(this.at++, raw);
                break;
            case TAG.SHORT:
                this.grow(2);
                this.view.setInt16(this.at, raw);
                this.at += 2;
                break;
            case TAG.INT:
                this.int(raw);
                break;
            case TAG.LONG:
                this.grow(8);
                this.view.setBigInt64(this.at, BigInt(raw));
                this.at += 8;
                break;
            case TAG.FLOAT:
                this.grow(4);
                this.view.setFloat32(this.at, raw);
                this.at += 4;
                break;
            case TAG.DOUBLE:
                this.grow(8);
                this.view.setFloat64(this.at, raw);
                this.at += 8;
                break;
            case TAG.STRING:
                this.string(raw);
                break;
            case TAG.BYTE_ARRAY:
                this.int(raw.length);
                this.grow(raw.length);
                this.bytes.set(new Uint8Array(raw.buffer, raw.byteOffset, raw.length), this.at);
                this.at += raw.length;
                break;
            case TAG.INT_ARRAY:
                this.int(raw.length);
                for (const v of raw) {
                    this.int(v);
                }
                break;
            case TAG.LONG_ARRAY:
                this.int(raw.length);
                this.grow(raw.length * 8);
                for (const v of raw) {
                    this.view.setBigInt64(this.at, v);
                    this.at += 8;
                }
                break;
            case TAG.LIST:
                this.u8(raw.type);
                this.int(raw.items.length);
                for (const item of raw.items) {
                    this.value(raw.type, item);
                }
                break;
            case TAG.COMPOUND:
                for (const [name, child] of Object.entries(raw)) {
                    if (child === undefined) {
                        continue;
                    }
                    const child_tag = this.tag_of(child);
                    this.u8(child_tag);
                    this.string(name);
                    this.value(child_tag, child);
                }
                this.u8(TAG.END);
                break;
            default:
                throw new Error(`Cannot write tag ${tag}`);
        }
    }
}

/**
 * @param {Record<string, unknown>} value The root compound
 * @param {string} [name] Name of the root; litematics use "", Sponge schematics "Schematic"
 * @param {object} [options]
 * @param {boolean} [options.gzip] Compress it, as every schematic file is
 * @returns {Uint8Array}
 */
export function write_nbt(value, name = "", { gzip = true } = {}) {
    const writer = new Writer();
    writer.u8(TAG.COMPOUND);
    writer.string(name);
    writer.value(TAG.COMPOUND, value);
    const raw = writer.bytes.slice(0, writer.at);
    return gzip ? gzipSync(raw, { level: 9 }) : raw;
}
