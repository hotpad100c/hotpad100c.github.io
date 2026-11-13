/** Blocks are stored in sections of 16 x 16 x 16, which is also what the meshes are built from. */
export const CHUNK = 16;
const SHIFT = 4;
const MASK = 15;
// A chunk is found by one number, `cx + cy * SPAN + cz * SPAN * SPAN`, which is enough for 8192 blocks per axis
const SPAN = 512;

/** @param {number} x @param {number} y @param {number} z */
function local_index(x, y, z) {
    return ((y & MASK) << 8) | ((z & MASK) << 4) | (x & MASK);
}

/**
 * Sparse 3D block storage. Coordinates follow Minecraft: x/z horizontal, y up.
 * A block is `{ name, props }`, for example `{ name: "minecraft:observer", props: { facing: "north" } }`.
 *
 * The blocks are kept in chunks. Every change marks the chunks whose picture can change as dirty
 * (the chunk itself, and a neighbour when the block is on the border, since faces are hidden by
 * the blocks next to them), so that only those have to be built again.
 */
export class World {
    /**
     * @param {{x: number, y: number, z: number}} size
     */
    constructor(size) {
        this.size = { ...size };
        /** @type {Map<number, {cx: number, cy: number, cz: number, cells: (object|undefined)[], count: number}>} */
        this.chunks = new Map();
        /** Keys of the chunks to build again; the one who builds them empties it with `take_dirty` */
        this.dirty = new Set();
        this.count = 0;
        this.version = 0;
    }

    static chunk_key(cx, cy, cz) {
        return cx + cy * SPAN + cz * SPAN * SPAN;
    }

    /** @param {number} key @returns {[number, number, number]} */
    static chunk_coords(key) {
        const cx = key % SPAN;
        const cy = Math.floor(key / SPAN) % SPAN;
        return [cx, cy, Math.floor(key / (SPAN * SPAN))];
    }

    in_bounds(x, y, z) {
        return x >= 0 && y >= 0 && z >= 0
            && x < this.size.x && y < this.size.y && z < this.size.z;
    }

    get(x, y, z) {
        if (x < 0 || y < 0 || z < 0) {
            return null;
        }
        const chunk = this.chunks.get(World.chunk_key(x >> SHIFT, y >> SHIFT, z >> SHIFT));
        return chunk?.cells[local_index(x, y, z)] ?? null;
    }

    _mark(x, y, z) {
        const cx = x >> SHIFT;
        const cy = y >> SHIFT;
        const cz = z >> SHIFT;
        this.dirty.add(World.chunk_key(cx, cy, cz));
        const lx = x & MASK;
        const ly = y & MASK;
        const lz = z & MASK;
        if (lx === 0 && cx > 0) {
            this.dirty.add(World.chunk_key(cx - 1, cy, cz));
        }
        if (lx === MASK) {
            this.dirty.add(World.chunk_key(cx + 1, cy, cz));
        }
        if (ly === 0 && cy > 0) {
            this.dirty.add(World.chunk_key(cx, cy - 1, cz));
        }
        if (ly === MASK) {
            this.dirty.add(World.chunk_key(cx, cy + 1, cz));
        }
        if (lz === 0 && cz > 0) {
            this.dirty.add(World.chunk_key(cx, cy, cz - 1));
        }
        if (lz === MASK) {
            this.dirty.add(World.chunk_key(cx, cy, cz + 1));
        }
    }

    /** @returns {boolean} Whether there was a block */
    _put(x, y, z, block) {
        const key = World.chunk_key(x >> SHIFT, y >> SHIFT, z >> SHIFT);
        let chunk = this.chunks.get(key);
        if (!chunk) {
            if (!block) {
                return false;
            }
            chunk = { cx: x >> SHIFT, cy: y >> SHIFT, cz: z >> SHIFT, cells: new Array(CHUNK ** 3), count: 0 };
            this.chunks.set(key, chunk);
        }
        const index = local_index(x, y, z);
        const had = chunk.cells[index] !== undefined;
        if (block) {
            chunk.cells[index] = block;
            chunk.count += had ? 0 : 1;
            this.count += had ? 0 : 1;
        }
        else if (had) {
            chunk.cells[index] = undefined;
            chunk.count--;
            this.count--;
            if (chunk.count === 0) {
                this.chunks.delete(key);
            }
        }
        return had;
    }

    set(x, y, z, block) {
        if (!this.in_bounds(x, y, z)) {
            return false;
        }
        this._put(x, y, z, block);
        this._mark(x, y, z);
        this.version++;
        return true;
    }

    remove(x, y, z) {
        if (x < 0 || y < 0 || z < 0 || !this._put(x, y, z, null)) {
            return false;
        }
        this._mark(x, y, z);
        this.version++;
        return true;
    }

    /**
     * How many blocks a smaller world would lose.
     * @param {{x: number, y: number, z: number}} size
     */
    count_outside(size) {
        let count = 0;
        for (const chunk of this.chunks.values()) {
            const inside = (chunk.cx + 1) * CHUNK <= size.x && (chunk.cy + 1) * CHUNK <= size.y && (chunk.cz + 1) * CHUNK <= size.z;
            if (inside) {
                continue;
            }
            for (const [x, y, z] of this._chunk_entries(chunk)) {
                if (x >= size.x || y >= size.y || z >= size.z) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Changes the size. Blocks outside the new bounds are removed.
     * @param {{x: number, y: number, z: number}} size
     * @returns {number} Number of removed blocks
     */
    resize(size) {
        let removed = 0;
        for (const chunk of [...this.chunks.values()]) {
            const inside = (chunk.cx + 1) * CHUNK <= size.x && (chunk.cy + 1) * CHUNK <= size.y && (chunk.cz + 1) * CHUNK <= size.z;
            if (inside) {
                continue;
            }
            for (const [x, y, z] of [...this._chunk_entries(chunk)]) {
                if (x >= size.x || y >= size.y || z >= size.z) {
                    this._put(x, y, z, null);
                    removed++;
                }
            }
            this.dirty.add(World.chunk_key(chunk.cx, chunk.cy, chunk.cz));
        }
        this.size = { ...size };
        // Whatever is next to the blocks that went may have shown a face towards them
        for (const chunk of this.chunks.values()) {
            this.dirty.add(World.chunk_key(chunk.cx, chunk.cy, chunk.cz));
        }
        this.version++;
        return removed;
    }

    clear() {
        for (const key of this.chunks.keys()) {
            this.dirty.add(key);
        }
        this.chunks.clear();
        this.count = 0;
        this.version++;
    }

    /** Hands over the chunks to build again, and forgets them. */
    take_dirty() {
        const keys = [...this.dirty];
        this.dirty.clear();
        return keys;
    }

    * _chunk_entries(chunk) {
        const ox = chunk.cx * CHUNK;
        const oy = chunk.cy * CHUNK;
        const oz = chunk.cz * CHUNK;
        const { cells } = chunk;
        for (let i = 0; i < cells.length; i++) {
            const block = cells[i];
            if (block !== undefined) {
                yield [ox + (i & MASK), oy + (i >> 8), oz + ((i >> 4) & MASK), block];
            }
        }
    }

    /**
     * @returns {Iterable<[number, number, number, {name: string, props: Record<string, string>}]>}
     */
    * entries() {
        for (const chunk of this.chunks.values()) {
            for (const entry of this._chunk_entries(chunk)) {
                yield entry;
            }
        }
    }
}
