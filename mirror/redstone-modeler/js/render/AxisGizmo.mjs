import * as THREE from "../../lib/three.module.min.js?v=462b4e5";

const AXES = [
    { name: "+x", vec: [1, 0, 0], color: "#e8584f", label: "X" },
    { name: "-x", vec: [-1, 0, 0], color: "#e8584f", label: "-X" },
    { name: "+y", vec: [0, 1, 0], color: "#7ac943", label: "Y" },
    { name: "-y", vec: [0, -1, 0], color: "#7ac943", label: "-Y" },
    { name: "+z", vec: [0, 0, 1], color: "#4f94e8", label: "Z" },
    { name: "-z", vec: [0, 0, -1], color: "#4f94e8", label: "-Z" },
];

const SIZE = 112;
const ARM = 38; // distance of the axis ends from the centre
const CENTER_RADIUS = 7;

/**
 * Blender style axis ball. Draws the six axis ends according to the camera orientation;
 * clicking one asks for that view, clicking the centre asks for the default isometric view.
 */
export class AxisGizmo {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {THREE.Camera} camera
     * @param {(name: string) => void} on_pick Axis name like `+y`, or `iso`
     */
    constructor(canvas, camera, on_pick) {
        this.canvas = canvas;
        this.camera = camera;
        this.on_pick = on_pick;
        this.hover = null;
        this.projected = [];
        const ratio = window.devicePixelRatio || 1;
        canvas.width = SIZE * ratio;
        canvas.height = SIZE * ratio;
        canvas.style.width = `${SIZE}px`;
        canvas.style.height = `${SIZE}px`;
        this.ratio = ratio;

        canvas.addEventListener("pointermove", (e) => {
            this.hover = this._hit(e);
        });
        canvas.addEventListener("pointerleave", () => {
            this.hover = null;
        });
        canvas.addEventListener("click", (e) => {
            const hit = this._hit(e);
            if (hit) {
                this.on_pick(hit);
            }
        });
    }

    /** Position of an axis end in screen space. */
    axis_screen_position(name) {
        this._project();
        const rect = this.canvas.getBoundingClientRect();
        if (name === "iso") {
            return { x: rect.left + SIZE / 2, y: rect.top + SIZE / 2 };
        }
        const axis = this.projected.find(a => a.name === name);
        return { x: rect.left + axis.x, y: rect.top + axis.y };
    }

    _project() {
        const inverse = this.camera.quaternion.clone().invert();
        this.projected = AXES.map((axis) => {
            const p = new THREE.Vector3(...axis.vec).applyQuaternion(inverse);
            return {
                ...axis,
                x: SIZE / 2 + p.x * ARM,
                y: SIZE / 2 - p.y * ARM,
                depth: p.z,
                radius: axis.name.startsWith("+") ? 11 : 8,
            };
        });
    }

    _hit(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this._project();
        // Nearest to the camera first
        const ordered = [...this.projected].sort((a, b) => b.depth - a.depth);
        for (const axis of ordered) {
            if (Math.hypot(axis.x - x, axis.y - y) <= axis.radius + 2) {
                return axis.name;
            }
        }
        return Math.hypot(SIZE / 2 - x, SIZE / 2 - y) <= CENTER_RADIUS + 3 ? "iso" : null;
    }

    draw() {
        const ctx = this.canvas.getContext("2d");
        ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
        ctx.clearRect(0, 0, SIZE, SIZE);
        this._project();
        if (this.hover) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
            ctx.beginPath();
            ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.lineWidth = 2;
        // Far to near so that near ends cover far ones
        for (const axis of [...this.projected].sort((a, b) => a.depth - b.depth)) {
            const positive = axis.name.startsWith("+");
            if (positive) {
                ctx.strokeStyle = axis.color;
                ctx.beginPath();
                ctx.moveTo(SIZE / 2, SIZE / 2);
                ctx.lineTo(axis.x, axis.y);
                ctx.stroke();
            }
            ctx.globalAlpha = positive ? 1 : 0.55 + 0.25 * Math.max(0, axis.depth);
            ctx.fillStyle = axis.color;
            ctx.beginPath();
            ctx.arc(axis.x, axis.y, axis.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            if (this.hover === axis.name) {
                ctx.strokeStyle = "#ffffff";
                ctx.stroke();
            }
            if (positive || this.hover === axis.name) {
                ctx.fillStyle = "#1a1a1a";
                ctx.font = "bold 11px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(axis.label, axis.x, axis.y + 0.5);
            }
        }
        ctx.fillStyle = this.hover === "iso" ? "#ffffff" : "rgba(200, 200, 200, 0.6)";
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, CENTER_RADIUS - 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
