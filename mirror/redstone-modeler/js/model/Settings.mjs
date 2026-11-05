// The space is as big as the user wants; the limit only stops a typing mistake from asking for something absurd
export const SIZE_LIMITS = { min: 1, max: 4096 };

export const DEFAULTS = Object.freeze({
    size: Object.freeze({ x: 20, y: 20, z: 20 }),
    background: "#404040",
    plane_color: "#4488ff",
    plane_opacity: 0.12,
    // Language of the interface: "auto" follows the browser, otherwise a code of js/i18n
    language: "auto",
    // Language of the block names that are shown and searched in addition to English; "" is English only
    search_language: "zh_cn",
    // Network clipboard for share links, and whether the user agreed to uploading
    share_service: "mclogs",
    share_consent: false,
    // Left button breaks and right button places, as in Minecraft; "classic" is the other way round
    mouse_mapping: "minecraft",
    // First person: blocks per second, and how far a drag of a finger turns the view (1 is the usual)
    fly_speed: 8,
    look_sensitivity: 1,
});

export const FLY_SPEED_LIMITS = { min: 2, max: 30 };
export const LOOK_SENSITIVITY_LIMITS = { min: 0.2, max: 3 };

const STORAGE_KEY = "redstone-modeler.settings";
const INTERFACE_LANGUAGE = /^(auto|[A-Za-z]{2,3}(-[A-Za-z0-9]+)*)$/;
const LANGUAGE_CODE = /^[a-z0-9_]{2,12}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * True for a size every axis of which is a whole number within the limits.
 * @param {unknown} size
 */
export function valid_size(size) {
    return size !== null && typeof size === "object"
        && ["x", "y", "z"].every(axis => Number.isInteger(size[axis])
        && size[axis] >= SIZE_LIMITS.min && size[axis] <= SIZE_LIMITS.max);
}

function clamp_number(value, { min, max }, fallback) {
    const number = Number(value);
    return value !== null && value !== "" && Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

/**
 * Turns whatever was stored into valid settings; anything wrong falls back to the default.
 * @param {unknown} raw
 */
export function normalize(raw) {
    const input = raw !== null && typeof raw === "object" ? raw : {};
    const size = {};
    for (const axis of ["x", "y", "z"]) {
        const value = Number(input.size?.[axis]);
        size[axis] = Number.isFinite(value)
            ? Math.min(SIZE_LIMITS.max, Math.max(SIZE_LIMITS.min, Math.round(value)))
            : DEFAULTS.size[axis];
    }
    const opacity = Number(input.plane_opacity);
    return {
        size,
        background: HEX_COLOR.test(input.background) ? input.background.toLowerCase() : DEFAULTS.background,
        plane_color: HEX_COLOR.test(input.plane_color) ? input.plane_color.toLowerCase() : DEFAULTS.plane_color,
        plane_opacity: Number.isFinite(opacity) && input.plane_opacity !== null && input.plane_opacity !== ""
            ? Math.min(1, Math.max(0, opacity))
            : DEFAULTS.plane_opacity,
        language: typeof input.language === "string" && INTERFACE_LANGUAGE.test(input.language) ? input.language : DEFAULTS.language,
        search_language: typeof input.search_language === "string"
        && (input.search_language === "" || LANGUAGE_CODE.test(input.search_language))
            ? input.search_language
            : DEFAULTS.search_language,
        share_service: typeof input.share_service === "string" && /^[a-z]{2,16}$/.test(input.share_service) ? input.share_service : DEFAULTS.share_service,
        share_consent: input.share_consent === true,
        mouse_mapping: input.mouse_mapping === "classic" ? "classic" : "minecraft",
        fly_speed: clamp_number(input.fly_speed, FLY_SPEED_LIMITS, DEFAULTS.fly_speed),
        look_sensitivity: clamp_number(input.look_sensitivity, LOOK_SENSITIVITY_LIMITS, DEFAULTS.look_sensitivity),
    };
}

export function load() {
    try {
        return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    }
    catch {
        return normalize(null);
    }
}

export function save(settings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    catch {
        // Storage blocked or full; settings just will not persist
    }
}
