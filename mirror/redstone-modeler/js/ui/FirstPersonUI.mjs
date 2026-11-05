import { REPEAT_MS, action_for } from "../model/Input.mjs?v=462b4e5";
import { KeyAxes, MOUSE_RADIANS, SPRINT_FACTOR, TOUCH_RADIANS, TouchGestures, stick_axes } from "../render/FirstPerson.mjs?v=462b4e5";

const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight"]);
/** A turn of the wheel this big changes the block in hand by one */
const WHEEL_STEP = 40;
const SLOTS = 9;

/**
 * First person: flying with the keys or the stick on the screen, turning with the mouse (locked to the
 * page) or a finger, and building with what the buttons mean everywhere else (see model/Input.mjs).
 */
export class FirstPersonUI {
    /**
     * @param {object} options
     * @param {import("../render/Scene.mjs?v=462b4e5").Scene} options.scene
     * @param {import("./BlockPicker.mjs?v=462b4e5").BlockPicker} options.picker
     * @param {{fly_speed: number, look_sensitivity: number}} options.settings Read every time, so that Settings take effect at once
     */
    constructor({ scene, picker, settings }) {
        this.scene = scene;
        this.picker = picker;
        this.settings = settings;
        this.active = false;
        this.inventory = false;
        /** Whether the page can lock the mouse; set to false when the browser cannot or will not */
        this.can_lock = typeof scene.canvas.requestPointerLock === "function";
        this.touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
        this.keys = new KeyAxes();
        this.gestures = new TouchGestures();
        this.stick = { id: null, forward: 0, right: 0 };
        this.lift = { up: false, down: false };
        /** @type {{button: number, action: string, next: number}|null} */
        this.held = null;
        this.wheel = 0;
        const $ = id => document.getElementById(id);
        this.body = document.body;
        this.canvas = scene.canvas;
        this.overlay = $("fp_overlay");
        this.pause = $("fp_pause");
        this.stick_element = $("fp_stick");
        this.knob = $("fp_knob");

        $("fp_button").addEventListener("click", () => (this.active ? this.exit() : this.enter()));
        $("fp_exit").addEventListener("click", () => this.exit());
        $("fp_leave").addEventListener("click", () => this.exit());
        $("fp_resume").addEventListener("click", () => this._lock());
        $("fp_blocks").addEventListener("click", () => this.toggle_inventory());
        this._bind_canvas();
        this._bind_keys();
        this._bind_touch_controls();
        document.addEventListener("pointerlockchange", () => this._sync());
        document.addEventListener("pointerlockerror", () => {
            // The browser will not lock the mouse (no permission, or it does not know how): click acts at the middle instead
            this.can_lock = false;
            this._sync();
        });
        document.addEventListener("mousemove", (event) => {
            if (this.active && this.locked) {
                scene.fly.look(event.movementX, event.movementY, MOUSE_RADIANS);
            }
        });
        scene.on_fly_frame = (dt, now) => this._frame(dt, now);
    }

    get locked() {
        return document.pointerLockElement === this.canvas;
    }

    enter() {
        if (this.active) {
            return;
        }
        this.active = true;
        this.scene.enter_first_person();
        this.body.classList.add("first-person");
        this.overlay.hidden = false;
        this._set_touch(this.touch);
        this.lock();
        this._sync();
    }

    exit() {
        if (!this.active) {
            return;
        }
        this.active = false;
        this.inventory = false;
        this.body.classList.remove("first-person", "fp-inventory", "fp-touch");
        this.overlay.hidden = true;
        this.pause.hidden = true;
        this.keys.clear();
        this.gestures.clear();
        this.held = null;
        this._reset_stick();
        this.lift.up = this.lift.down = false;
        if (this.locked) {
            document.exitPointerLock();
        }
        this.scene.exit_first_person();
    }

    toggle_inventory() {
        this.inventory = !this.inventory;
        this.body.classList.toggle("fp-inventory", this.inventory);
        if (this.inventory && this.locked) {
            document.exitPointerLock();
        }
        this._sync();
        // The viewport has the same size, but the page may have moved things
        this.scene.resize();
    }

    /** Asks the browser to lock the mouse; only a click or a key press may ask */
    lock() {
        if (this.can_lock && !this.touch) {
            try {
                const result = this.canvas.requestPointerLock();
                result?.catch?.(() => {
                    this.can_lock = false;
                    this._sync();
                });
            }
            catch {
                this.can_lock = false;
            }
        }
    }

    _lock() {
        this.lock();
        this._sync();
    }

    /** The paused screen shows when the mouse could be locked but is not */
    _sync() {
        const paused = this.active && this.can_lock && !this.touch && !this.locked && !this.inventory;
        this.pause.hidden = !paused;
    }

    _set_touch(touch) {
        this.touch = touch;
        this.body.classList.toggle("fp-touch", touch && this.active);
        this.scene.fp_crosshair = !touch;
        if (touch && this.locked) {
            document.exitPointerLock();
        }
    }

    /** Does what a button or a tap means at the middle of the view, or where the finger is */
    _act(action, x, y, event) {
        if (action) {
            this.scene._act(action, x, y, event);
        }
    }

    _centre() {
        const rect = this.canvas.getBoundingClientRect();
        return [rect.left + rect.width / 2, rect.top + rect.height / 2];
    }

    _bind_canvas() {
        const canvas = this.canvas;
        canvas.addEventListener("pointerdown", (event) => {
            if (!this.active) {
                return;
            }
            if (event.pointerType === "mouse") {
                if (this.touch) {
                    this._set_touch(false);
                }
                if (this.can_lock && !this.locked) {
                    event.preventDefault();
                    this._lock();
                    return;
                }
                const action = action_for({ type: "mouse", button: event.button, alt: event.altKey, erase: this.scene.erase, mapping: this.scene.mapping });
                this._act(action, ...this._centre(), event);
                // Holding the button goes on breaking or placing
                this.held = action === "break" || action === "place" ? { button: event.button, action, next: event.timeStamp + REPEAT_MS * 2 } : null;
                return;
            }
            if (!this.touch) {
                this._set_touch(true);
            }
            canvas.setPointerCapture?.(event.pointerId);
            this.gestures.down(event.pointerId, event.clientX, event.clientY, event.timeStamp);
        });
        canvas.addEventListener("pointermove", (event) => {
            if (!this.active || event.pointerType === "mouse") {
                return;
            }
            const result = this.gestures.move(event.pointerId, event.clientX, event.clientY);
            if (result?.look) {
                this.scene.fly.look(result.look[0], result.look[1], TOUCH_RADIANS * this.settings.look_sensitivity);
            }
        });
        const up = (event) => {
            if (!this.active) {
                return;
            }
            if (event.pointerType === "mouse") {
                if (this.held && this.held.button === event.button) {
                    this.held = null;
                }
                return;
            }
            const result = event.type === "pointercancel" ? (this.gestures.cancel(event.pointerId), null) : this.gestures.up(event.pointerId, event.timeStamp);
            if (result?.tap) {
                this._act(action_for({ type: event.pointerType, erase: this.scene.erase }), result.tap[0], result.tap[1], event);
            }
        };
        canvas.addEventListener("pointerup", up);
        canvas.addEventListener("pointercancel", up);
        canvas.addEventListener("wheel", (event) => {
            if (!this.active) {
                return;
            }
            event.preventDefault();
            this.wheel += event.deltaY;
            while (Math.abs(this.wheel) >= WHEEL_STEP) {
                const step = Math.sign(this.wheel);
                this.wheel -= step * WHEEL_STEP;
                this.picker.set_slot((this.picker.slot + step + SLOTS) % SLOTS);
            }
        }, { passive: false });
    }

    _bind_keys() {
        window.addEventListener("keydown", (event) => {
            if (!this.active || event.metaKey || event.target.matches?.("input, select, textarea")) {
                return;
            }
            if (event.code === "KeyF") {
                // The page's own handler would take the same key as "enter" a moment later
                event.stopImmediatePropagation();
                this.exit();
            }
            else if (event.code === "KeyE") {
                this.toggle_inventory();
            }
            else if (event.code === "Escape" && this.inventory) {
                this.toggle_inventory();
            }
            else if (MOVE_KEYS.has(event.code) && !event.ctrlKey) {
                event.preventDefault();
                this.keys.press(event.code, event.timeStamp);
            }
        });
        window.addEventListener("keyup", (event) => {
            if (MOVE_KEYS.has(event.code)) {
                this.keys.release(event.code);
            }
        });
        window.addEventListener("blur", () => this.keys.clear());
    }

    _bind_touch_controls() {
        const stick = this.stick_element;
        const radius = () => stick.getBoundingClientRect().width / 2 - 8;
        const move = (event) => {
            const rect = stick.getBoundingClientRect();
            const dx = event.clientX - (rect.left + rect.width / 2);
            const dy = event.clientY - (rect.top + rect.height / 2);
            const { forward, right } = stick_axes(dx, dy, radius());
            this.stick.forward = forward;
            this.stick.right = right;
            const length = Math.min(radius(), Math.hypot(dx, dy)) / (Math.hypot(dx, dy) || 1);
            this.knob.style.transform = `translate(${dx * length}px, ${dy * length}px)`;
        };
        stick.addEventListener("pointerdown", (event) => {
            if (this.stick.id !== null) {
                return;
            }
            this.stick.id = event.pointerId;
            stick.setPointerCapture?.(event.pointerId);
            move(event);
        });
        stick.addEventListener("pointermove", (event) => {
            if (event.pointerId === this.stick.id) {
                move(event);
            }
        });
        const release = (event) => {
            if (event.pointerId === this.stick.id) {
                this._reset_stick();
            }
        };
        stick.addEventListener("pointerup", release);
        stick.addEventListener("pointercancel", release);

        for (const [id, key] of [["fp_up", "up"], ["fp_down", "down"]]) {
            const button = document.getElementById(id);
            button.addEventListener("pointerdown", (event) => {
                button.setPointerCapture?.(event.pointerId);
                this.lift[key] = true;
            });
            for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
                button.addEventListener(type, () => {
                    this.lift[key] = false;
                });
            }
        }
    }

    _reset_stick() {
        this.stick.id = null;
        this.stick.forward = 0;
        this.stick.right = 0;
        this.knob.style.transform = "";
    }

    /** Moves the camera, and goes on building while a button or a finger is held. */
    _frame(dt, now) {
        const paused = !this.pause.hidden;
        if (!paused) {
            const keys = this.keys.axes();
            const clamp = v => Math.max(-1, Math.min(1, v));
            const axes = {
                forward: clamp(keys.forward + this.stick.forward),
                right: clamp(keys.right + this.stick.right),
                up: clamp(keys.up + (this.lift.up ? 1 : 0) - (this.lift.down ? 1 : 0)),
            };
            this.scene.fly.update(dt, axes, this.settings.fly_speed * (this.keys.sprinting ? SPRINT_FACTOR : 1));
        }
        const hold = this.gestures.tick(now);
        if (hold?.hold) {
            navigator.vibrate?.(15);
            this._act(action_for({ type: "touch", long: true }), hold.hold[0], hold.hold[1], {});
        }
        if (this.held && now >= this.held.next) {
            this.held.next = now + REPEAT_MS;
            this._act(this.held.action, ...this._centre(), {});
        }
    }
}
