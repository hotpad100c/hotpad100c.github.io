/**
 * Biome-independent tint colours, sampled like a temperate biome.
 * Colour maps are optional; without them well known default colours are used.
 */

const GRASS_DEFAULT = [0x91, 0xBD, 0x59];
const FOLIAGE_DEFAULT = [0x77, 0xAB, 0x2F];
const WHITE = [255, 255, 255];

const GRASS_BLOCKS = new Set([
    "grass_block", "short_grass", "grass", "tall_grass", "fern", "large_fern", "sugar_cane", "potted_fern",
]);
const FOLIAGE_BLOCKS = new Set([
    "oak_leaves", "jungle_leaves", "acacia_leaves", "dark_oak_leaves", "mangrove_leaves", "vine",
]);

/**
 * @param {{width: number, height: number, data: Uint8ClampedArray}|undefined} map
 * @param {number[]} fallback
 */
function sample(map, fallback) {
    if (!map) {
        return fallback;
    }
    const temperature = 0.8;
    const downfall = 0.4 * temperature;
    const x = Math.round((1 - temperature) * (map.width - 1));
    const y = Math.round((1 - downfall) * (map.height - 1));
    const i = (y * map.width + x) * 4;
    return [map.data[i], map.data[i + 1], map.data[i + 2]];
}

/**
 * The two colours that come out of the colour maps, to be stored instead of the maps.
 * @param {{grass?: object, foliage?: object}} colormaps Decoded colour maps
 * @returns {{grass: number[], foliage: number[]}}
 */
export function sample_colors(colormaps = {}) {
    return { grass: sample(colormaps.grass, GRASS_DEFAULT), foliage: sample(colormaps.foliage, FOLIAGE_DEFAULT) };
}

/**
 * Colour of redstone dust for a power level, same formula as the game.
 * @param {number} power 0..15
 */
export function redstone_color(power) {
    const f = power / 15;
    const r = f * 0.6 + (f > 0 ? 0.4 : 0.3);
    const g = Math.min(1, Math.max(0, f * f * 0.7 - 0.5));
    const b = Math.min(1, Math.max(0, f * f * 0.6 - 0.7));
    return [r * 255, g * 255, b * 255];
}

/**
 * @param {{grass?: object, foliage?: object}} colormaps Decoded colour maps
 * @param {{grass: number[], foliage: number[]}} [fixed] Colours to use instead of sampling the maps
 * @param {Record<string, {kind: "rgb"|"redstone", rgb?: number[], prop?: string, levels?: Record<string, number>}>} [rules]
 *   Colours by block, for packs whose block ids are not the names the blocks are known by
 * @returns {(block: string, state: Record<string, string>) => number[]} RGB 0..1; white means untinted
 */
export function make_tint(colormaps = {}, fixed = undefined, rules = undefined) {
    const { grass, foliage } = fixed ?? sample_colors(colormaps);
    return (block, state) => {
        const rule = rules?.[block];
        if (rule?.kind === "rgb") {
            return rule.rgb.map(v => v / 255);
        }
        if (rule?.kind === "redstone") {
            return redstone_color(rule.levels[state[rule.prop]] ?? 0).map(v => v / 255);
        }
        const name = block.replace(/^minecraft:/, "");
        let rgb = WHITE;
        if (GRASS_BLOCKS.has(name)) {
            rgb = grass;
        }
        else if (FOLIAGE_BLOCKS.has(name)) {
            rgb = foliage;
        }
        else if (name === "birch_leaves") {
            rgb = [0x80, 0xA7, 0x55];
        }
        else if (name === "spruce_leaves") {
            rgb = [0x61, 0x99, 0x61];
        }
        else if (name === "redstone_wire") {
            rgb = redstone_color(Number(state.power ?? 0));
        }
        else if (name === "water" || name === "bubble_column") {
            rgb = [0x3F, 0x76, 0xE4];
        }
        else if (name === "lily_pad") {
            rgb = [0x20, 0x80, 0x30];
        }
        return rgb.map(v => v / 255);
    };
}
