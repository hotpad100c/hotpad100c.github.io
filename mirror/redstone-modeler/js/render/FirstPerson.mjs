import { LONG_PRESS_MS, REPEAT_MS } from "../model/Input.mjs?v=462b4e5";

/**
 * Flying around in first person: a camera that goes where it is told and passes through blocks.
 * Nothing here knows about the page, so it can be tested with plain numbers.
 */

export const PITCH_LIMIT = (89 * Math.PI) / 180;
/** Radians of turning for a pixel of mouse movement and of a finger's drag (at a look sensitivity of 1) */
export const MOUSE_RADIANS = 0.0022;
export const TOUCH_RADIANS = 0.005;
export const SPRINT_FACTOR = 2.5;
/** Two presses of W this close together (ms) are a sprint */
export const DOUBLE_TAP_MS = 300;
/** A finger that moved more than this many pixels is turning the view, not tapping */
export const DRAG_PX = 8;
/** A touch shorter than this (ms) that did not move is a tap */
export const TAP_MS = 350;

/**
 * @param {number} yaw Turning left and right; 0 looks along -z, like the default camera of three.js
 * @param {number} pitch Turning up and down; positive looks up
 */
export function direction_of(yaw, pitch) {
    const flat = Math.cos(pitch);
    return [-Math.sin(yaw) * flat, Math.sin(pitch), -Math.cos(yaw) * flat];
}

export class FlyCamera {
    /** @param {{position?: number[], yaw?: number, pitch?: number}} [start] */
    constructor({ position = [0, 0, 0], yaw = 0, pitch = 0 } = {}) {
        this.position = [...position];
        this.yaw = yaw;
        this.pitch = pitch;
    }

    /** Looks from `from` at `at` */
    aim(from, at) {
        const delta = [at[0] - from[0], at[1] - from[1], at[2] - from[2]];
        this.position = [...from];
        this.yaw = Math.atan2(-delta[0], -delta[2]);
        this.pitch = Math.atan2(delta[1], Math.hypot(delta[0], delta[2]));
        this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
    }

    /**
     * Turns the view by a movement of the mouse or of a finger.
     * @param {number} dx Pixels to the right
     * @param {number} dy Pixels down
     * @param {number} per_pixel Radians for a pixel
     */
    look(dx, dy, per_pixel) {
        this.yaw -= dx * per_pixel;
        this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch - dy * per_pixel));
        // Keep the angle small so that it stays precise after a long time of turning
        this.yaw = ((this.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    }

    direction() {
        return direction_of(this.yaw, this.pitch);
    }

    /**
     * Moves for `dt` seconds. Forward and right follow the way the view is turned, but stay level,
     * as flying in Minecraft does; up is always straight up.
     * @param {number} dt
     * @param {{forward: number, right: number, up: number}} axes Each from -1 to 1
     * @param {number} speed Blocks per second
     */
    update(dt, { forward, right, up }, speed) {
        const sin = Math.sin(this.yaw);
        const cos = Math.cos(this.yaw);
        let dx = -sin * forward + cos * right;
        let dz = -cos * forward - sin * right;
        let dy = up;
        const length = Math.hypot(dx, dy, dz);
        if (length > 1) {
            dx /= length;
            dy /= length;
            dz /= length;
        }
        this.position[0] += dx * speed * dt;
        this.position[1] += dy * speed * dt;
        this.position[2] += dz * speed * dt;
    }
}

/** The keys that fly: WASD, space up, shift down, and a double tap on W to sprint. */
export class KeyAxes {
    constructor() {
        this.down = new Set();
        this.sprinting = false;
        this.last_w = -Infinity;
    }

    /** @param {string} code `KeyboardEvent.code` @param {number} now Milliseconds */
    press(code, now) {
        if (this.down.has(code)) {
            return;
        }
        this.down.add(code);
        if (code === "KeyW") {
            this.sprinting = now - this.last_w <= DOUBLE_TAP_MS;
            this.last_w = now;
        }
    }

    release(code) {
        this.down.delete(code);
        if (code === "KeyW") {
            this.sprinting = false;
        }
    }

    clear() {
        this.down.clear();
        this.sprinting = false;
    }

    axes() {
        const has = code => (this.down.has(code) ? 1 : 0);
        return {
            forward: has("KeyW") - has("KeyS"),
            right: has("KeyD") - has("KeyA"),
            up: has("Space") - (has("ShiftLeft") || has("ShiftRight")),
        };
    }
}

/**
 * The stick on the screen: where the thumb is relative to the middle of the stick, as a move.
 * @param {number} dx Pixels to the right of the middle
 * @param {number} dy Pixels below the middle
 * @param {number} radius Distance at which the stick is all the way over
 * @param {number} [dead] Part of the radius in the middle that does nothing
 * @returns {{forward: number, right: number}}
 */
export function stick_axes(dx, dy, radius, dead = 0.15) {
    const length = Math.hypot(dx, dy);
    if (length < radius * dead) {
        return { forward: 0, right: 0 };
    }
    const amount = Math.min(1, length / radius);
    return { forward: -(dy / length) * amount, right: (dx / length) * amount };
}

/**
 * Fingers on the view: one that stays is a tap or a hold, one that moves turns the view.
 * It does not read the clock itself; every call is given the time in milliseconds.
 * Each call may return something to do: `{look: [dx, dy]}`, `{tap: [x, y]}` or `{hold: [x, y]}`.
 */
export class TouchGestures {
    constructor() {
        /** @type {Map<number, {x: number, y: number, at: number, last: number[], turned: boolean, held: boolean, next: number}>} */
        this.fingers = new Map();
    }

    down(id, x, y, now) {
        // A second finger on the view is nothing we know: both stop building
        const spoiled = this.fingers.size > 0;
        for (const finger of this.fingers.values()) {
            finger.held = true;
            finger.next = Infinity;
        }
        this.fingers.set(id, { x, y, at: now, last: [x, y], turned: false, held: spoiled, next: spoiled ? Infinity : now + LONG_PRESS_MS });
    }

    move(id, x, y) {
        const finger = this.fingers.get(id);
        if (!finger) {
            return null;
        }
        const dx = x - finger.last[0];
        const dy = y - finger.last[1];
        finger.last = [x, y];
        if (!finger.turned && Math.hypot(x - finger.x, y - finger.y) >= DRAG_PX) {
            finger.turned = true;
            finger.next = Infinity;
        }
        return finger.turned && !finger.held ? { look: [dx, dy] } : null;
    }

    /** Call often (every frame): a finger that stayed long enough breaks, and keeps breaking */
    tick(now) {
        for (const finger of this.fingers.values()) {
            if (!finger.turned && now >= finger.next) {
                finger.held = true;
                finger.next = now + REPEAT_MS + 50;
                return { hold: [...finger.last], first: now - finger.at < LONG_PRESS_MS + REPEAT_MS };
            }
        }
        return null;
    }

    up(id, now) {
        const finger = this.fingers.get(id);
        this.fingers.delete(id);
        if (finger && !finger.turned && !finger.held && now - finger.at < TAP_MS) {
            return { tap: [...finger.last] };
        }
        return null;
    }

    cancel(id) {
        this.fingers.delete(id);
    }

    clear() {
        this.fingers.clear();
    }
}
