/**
 * What a click or a touch means. Everything that builds (the 3D view, the 2D views, first person)
 * asks here, so that the buttons are the same everywhere.
 *
 * Actions: `place`, `break` (remove the block that is hit) and `pick` (take the block into the hotbar).
 */

/** Milliseconds a finger has to stay on the same spot to break a block */
export const LONG_PRESS_MS = 450;
/** Milliseconds between two breaks while a finger or a button stays down */
export const REPEAT_MS = 200;

export const MAPPINGS = ["minecraft", "classic"];

/**
 * @param {object} input
 * @param {"mouse"|"touch"|"pen"} input.type
 * @param {number} input.button Pointer event button: 0 left, 1 middle, 2 right (a touch is 0)
 * @param {boolean} [input.alt]
 * @param {boolean} [input.erase] The eraser is on
 * @param {boolean} [input.long] A touch that stayed where it was
 * @param {"minecraft"|"classic"} [input.mapping] `minecraft`: left breaks, right places. `classic`: the other way round.
 * @returns {"place"|"break"|"pick"|null}
 */
export function action_for({ type = "mouse", button = 0, alt = false, erase = false, long = false, mapping = "minecraft" }) {
    if (type !== "mouse") {
        if (long) {
            return "break";
        }
        return erase ? "break" : "place";
    }
    if (button === 1 || (button === 0 && alt)) {
        return "pick";
    }
    if (button === 0) {
        if (erase) {
            return "break";
        }
        return mapping === "classic" ? "place" : "break";
    }
    if (button === 2) {
        return mapping === "classic" ? "break" : "place";
    }
    return null;
}

/**
 * Which cell the outline of the pointer shows: the block that would be hit, or in the classic
 * mapping the empty cell next to it.
 * @param {{mapping: string, erase: boolean}} state
 * @returns {"hit"|"place"}
 */
export function hover_target({ mapping, erase }) {
    return erase || mapping !== "classic" ? "hit" : "place";
}
