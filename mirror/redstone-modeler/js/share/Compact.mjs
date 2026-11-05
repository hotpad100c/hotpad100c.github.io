/**
 * A compact binary form of JSON values: every string is stored once in a table and referred to by
 * number, integers take as many bytes as they need, and arrays of bytes are allowed.
 *
 *   stream = string table, value
 *   string table = count, then `length, UTF-8 bytes` for each string; the most used strings come first
 *   value = a tag byte, then what the tag says
 *
 * Meant to be compressed afterwards; it only takes away what compression cannot see through easily.
 * Reading is strict: lengths and depth have limits, so data from someone else cannot use up memory.
 */

const TAG_NULL = 0;
const TAG_FALSE = 1;
const TAG_TRUE = 2;
const TAG_INT = 3; // zigzag varint
const TAG_STRING = 4; // varint index in the table
const TAG_DECIMAL = 5; // varint index of a string such as "0.8"
const TAG_ARRAY = 6; // varint length, then values
const TAG_OBJECT = 7; // varint count, then key index and value for each
const TAG_BYTES = 8; // varint length, then the bytes
const TAG_SMALL = 16; // tags from here are the integers 0 to 239

const MAX_DEPTH = 64;
const SMALL_LIMIT = 256 - TAG_SMALL;
// Zigzag doubles the number, so that has to stay a safe integer
const INT_LIMIT = 2 ** 51;

export class Writer {
    constructor() {
        this.chunks = [];
        this.buffer = new Uint8Array(4096);
        this.length = 0;
    }

    _room(n) {
        if (this.length + n > this.buffer.length) {
            const bigger = new Uint8Array(Math.max(this.buffer.length * 2, this.length + n));
            bigger.set(this.buffer.subarray(0, this.length));
            this.buffer = bigger;
        }
    }

    byte(value) {
        this._room(1);
        this.buffer[this.length++] = value;
    }

    /** Unsigned LEB128 */
    varint(value) {
        if (!Number.isSafeInteger(value) || value < 0) {
            throw new Error(`Cannot store ${value} as a length or index`);
        }
        while (value >= 0x80) {
            this.byte((value % 0x80) | 0x80);
            value = Math.floor(value / 0x80);
        }
        this.byte(value);
    }

    bytes(data) {
        this._room(data.length);
        this.buffer.set(data, this.length);
        this.length += data.length;
    }

    finish() {
        return this.buffer.slice(0, this.length);
    }
}

export class Reader {
    /** @param {Uint8Array} data */
    constructor(data) {
        this.data = data;
        this.position = 0;
    }

    get remaining() {
        return this.data.length - this.position;
    }

    byte() {
        if (this.position >= this.data.length) {
            throw new Error("The data ends too early");
        }
        return this.data[this.position++];
    }

    varint() {
        let value = 0;
        let scale = 1;
        for (let i = 0; i < 8; i++) {
            const byte = this.byte();
            value += (byte & 0x7F) * scale;
            if (byte < 0x80) {
                return value;
            }
            scale *= 0x80;
        }
        throw new Error("A number in the data is too long");
    }

    bytes(length) {
        if (length > this.remaining) {
            throw new Error("The data ends too early");
        }
        const out = this.data.subarray(this.position, this.position + length);
        this.position += length;
        return out;
    }
}

function zigzag(n) {
    return n >= 0 ? n * 2 : -n * 2 - 1;
}

function unzigzag(z) {
    return z % 2 === 0 ? z / 2 : -(z + 1) / 2;
}

function is_int(value) {
    return Number.isSafeInteger(value) && Math.abs(value) < INT_LIMIT;
}

/**
 * Counts how often each string is used, keys and decimal numbers included.
 * @param {unknown} value
 * @param {Map<string, number>} counts
 */
function count_strings(value, counts, depth = 0) {
    if (depth > MAX_DEPTH) {
        throw new Error("The data is nested too deeply");
    }
    const add = text => counts.set(text, (counts.get(text) ?? 0) + 1);
    if (typeof value === "string") {
        add(value);
    }
    else if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw new Error("Cannot store a number that is not finite");
        }
        if (!is_int(value)) {
            add(String(value));
        }
    }
    else if (Array.isArray(value)) {
        for (const item of value) {
            count_strings(item, counts, depth + 1);
        }
    }
    else if (value instanceof Uint8Array || value === null || typeof value === "boolean") {
        // nothing to count
    }
    else if (typeof value === "object") {
        for (const [key, item] of Object.entries(value)) {
            if (item !== undefined) {
                add(key);
                count_strings(item, counts, depth + 1);
            }
        }
    }
    else if (value !== undefined) {
        throw new Error(`Cannot store a value of type ${typeof value}`);
    }
}

function write_value(writer, value, index, depth = 0) {
    if (value === null || value === undefined) {
        writer.byte(TAG_NULL);
    }
    else if (typeof value === "boolean") {
        writer.byte(value ? TAG_TRUE : TAG_FALSE);
    }
    else if (typeof value === "string") {
        writer.byte(TAG_STRING);
        writer.varint(index.get(value));
    }
    else if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw new Error("Cannot store a number that is not finite");
        }
        if (is_int(value)) {
            const n = value === 0 ? 0 : value; // not -0
            if (n >= 0 && n < SMALL_LIMIT) {
                writer.byte(TAG_SMALL + n);
            }
            else {
                writer.byte(TAG_INT);
                writer.varint(zigzag(n));
            }
        }
        else {
            writer.byte(TAG_DECIMAL);
            writer.varint(index.get(String(value)));
        }
    }
    else if (value instanceof Uint8Array) {
        writer.byte(TAG_BYTES);
        writer.varint(value.length);
        writer.bytes(value);
    }
    else if (Array.isArray(value)) {
        writer.byte(TAG_ARRAY);
        writer.varint(value.length);
        for (const item of value) {
            write_value(writer, item, index, depth + 1);
        }
    }
    else {
        const entries = Object.entries(value).filter(([, item]) => item !== undefined);
        writer.byte(TAG_OBJECT);
        writer.varint(entries.length);
        for (const [key, item] of entries) {
            writer.varint(index.get(key));
            write_value(writer, item, index, depth + 1);
        }
    }
}

/**
 * @param {unknown} value A JSON value that may also contain Uint8Arrays
 * @returns {Uint8Array}
 */
export function pack(value) {
    const counts = new Map();
    count_strings(value, counts);
    // Most used first, so that they get the short numbers
    const strings = [...counts].sort((a, b) => b[1] - a[1]).map(([text]) => text);
    const index = new Map(strings.map((text, i) => [text, i]));
    const writer = new Writer();
    const encoder = new TextEncoder();
    writer.varint(strings.length);
    for (const text of strings) {
        const encoded = encoder.encode(text);
        writer.varint(encoded.length);
        writer.bytes(encoded);
    }
    write_value(writer, value, index);
    return writer.finish();
}

function read_value(reader, strings, depth) {
    if (depth > MAX_DEPTH) {
        throw new Error("The data is nested too deeply");
    }
    const tag = reader.byte();
    if (tag >= TAG_SMALL) {
        return tag - TAG_SMALL;
    }
    const string_at = (i) => {
        if (i >= strings.length) {
            throw new Error("The data refers to a string that is not there");
        }
        return strings[i];
    };
    switch (tag) {
        case TAG_NULL: return null;
        case TAG_FALSE: return false;
        case TAG_TRUE: return true;
        case TAG_INT: return unzigzag(reader.varint());
        case TAG_STRING: return string_at(reader.varint());
        case TAG_DECIMAL: {
            const number = Number(string_at(reader.varint()));
            if (!Number.isFinite(number)) {
                throw new Error("The data has a number that is not valid");
            }
            return number;
        }
        case TAG_ARRAY: {
            const length = reader.varint();
            if (length > reader.remaining) {
                throw new Error("The data ends too early");
            }
            const out = [];
            for (let i = 0; i < length; i++) {
                out.push(read_value(reader, strings, depth + 1));
            }
            return out;
        }
        case TAG_OBJECT: {
            const count = reader.varint();
            if (count * 2 > reader.remaining) {
                throw new Error("The data ends too early");
            }
            const out = {};
            for (let i = 0; i < count; i++) {
                const key = string_at(reader.varint());
                if (key === "__proto__") {
                    throw new Error("The data has a key that is not allowed");
                }
                out[key] = read_value(reader, strings, depth + 1);
            }
            return out;
        }
        case TAG_BYTES: return Uint8Array.from(reader.bytes(reader.varint()));
        default: throw new Error("The data is not in a known format");
    }
}

/**
 * @param {Uint8Array} bytes
 * @returns {unknown}
 */
export function unpack(bytes) {
    const reader = new Reader(bytes);
    const count = reader.varint();
    if (count > reader.remaining) {
        throw new Error("The data ends too early");
    }
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const strings = [];
    for (let i = 0; i < count; i++) {
        const length = reader.varint();
        try {
            strings.push(decoder.decode(reader.bytes(length)));
        }
        catch (error) {
            throw new Error(`The data has text that is not valid: ${error.message}`);
        }
    }
    const value = read_value(reader, strings, 0);
    if (reader.remaining !== 0) {
        throw new Error("The data has something left over at the end");
    }
    return value;
}
