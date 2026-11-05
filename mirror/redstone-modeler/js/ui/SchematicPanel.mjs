import { t } from "../i18n/i18n.mjs?v=462b4e5";
import { SIZE_LIMITS } from "../model/Settings.mjs?v=462b4e5";
import { DEFAULT_TARGET, SchematicError, TARGETS, blueprint_from_world, fill_world, read_blueprint, write_blueprint, FORMATS } from "../schematic/index.mjs?v=462b4e5";

/** A model with more blocks than this gets a note: it is built in pieces and may take a while */
const BIG = 100_000;

const EXTENSION = /\.(litematic|schem|schematic|nbt)$/i;

/**
 * Dialog for opening litematics, Sponge schematics and structures into the editor, and for saving the model as one.
 */
export class SchematicPanel {
    /**
     * @param {object} options
     * @param {HTMLDialogElement} options.dialog
     * @param {import("../model/World.mjs?v=462b4e5").World} options.world
     * @param {() => import("../render/Resources.mjs?v=462b4e5").Resources|null} options.get_resources
     * @param {() => void} options.on_loaded Called after the world was replaced, to fit the view and the settings to its size
     */
    constructor({ dialog, world, get_resources, on_loaded }) {
        this.dialog = dialog;
        this.world = world;
        this.get_resources = get_resources;
        this.on_loaded = on_loaded;
        const $ = id => dialog.querySelector(`#${id}`);
        this.import_status = $("schematic_import_status");
        this.export_status = $("schematic_export_status");
        this.format = $("schematic_format");
        this.version = $("schematic_version");
        for (const { id } of TARGETS) {
            this.version.appendChild(Object.assign(document.createElement("option"), { value: id, textContent: id }));
        }
        this.version.value = DEFAULT_TARGET;
        $("schematic_file").addEventListener("change", (event) => {
            const [file] = event.target.files;
            event.target.value = "";
            if (file) {
                this.open_file(file);
            }
        });
        $("schematic_save").addEventListener("click", () => this.save());
        $("schematic_close").addEventListener("click", () => dialog.close());

        // Files dropped on the page, but not on a dialog that has a use for them
        document.addEventListener("dragover", (event) => {
            if (event.dataTransfer?.types?.includes("Files") && !event.target.closest?.("dialog[open]")) {
                event.preventDefault();
            }
        });
        document.addEventListener("drop", (event) => {
            if (event.target.closest?.("dialog[open]")) {
                return;
            }
            const file = [...(event.dataTransfer?.files ?? [])].find(f => EXTENSION.test(f.name));
            if (file) {
                event.preventDefault();
                this.dialog.showModal();
                this.open_file(file);
            }
        });
    }

    open() {
        this.import_status.textContent = "";
        this.export_status.textContent = "";
        this.dialog.showModal();
    }

    /** @param {File} file */
    async open_file(file) {
        this.import_status.classList.remove("error");
        this.import_status.textContent = t("schematic.reading", { name: file.name });
        // Let the page show the message before the work starts
        await new Promise(resolve => setTimeout(resolve));
        try {
            const blueprint = read_blueprint(new Uint8Array(await file.arrayBuffer()));
            if (Math.max(blueprint.size.x, blueprint.size.y, blueprint.size.z) > SIZE_LIMITS.max) {
                throw new SchematicError("too_big", `It is ${blueprint.size.x} × ${blueprint.size.y} × ${blueprint.size.z} and the space can be ${SIZE_LIMITS.max} blocks at most in each direction`);
            }
            const count = fill_world(blueprint, this.world);
            this.on_loaded();
            this.import_status.replaceChildren(...this._summary(file.name, blueprint, count));
        }
        catch (error) {
            console.error(error);
            this.import_status.classList.add("error");
            this.import_status.textContent = t("schematic.failed", { name: file.name, reason: error instanceof SchematicError ? error.message : `${error.message ?? error}` });
        }
    }

    /** The lines that tell what was opened */
    _summary(name, blueprint, count) {
        const lines = [t("schematic.opened", { name, x: blueprint.size.x, y: blueprint.size.y, z: blueprint.size.z, count: count.toLocaleString(), kinds: blueprint.palette.length })];
        const { ignored } = blueprint.meta;
        if (ignored.block_entities > 0 || ignored.entities > 0) {
            lines.push(t("schematic.skipped", ignored));
        }
        const resources = this.get_resources();
        if (!resources) {
            lines.push(t("schematic.no_pack"));
        }
        else {
            const known = new Set(resources.pack.names);
            const missing = [...new Set(blueprint.palette.map(state => state.name))].filter(block => !known.has(block));
            if (missing.length > 0) {
                const shown = missing.slice(0, 8).join(", ") + (missing.length > 8 ? ", …" : "");
                lines.push(t("schematic.unknown_blocks", { count: missing.length, names: shown }));
            }
        }
        if (count > BIG) {
            lines.push(t("schematic.big", { count: count.toLocaleString() }));
        }
        return lines.map((line) => {
            const div = document.createElement("div");
            div.textContent = line;
            return div;
        });
    }

    save() {
        this.export_status.classList.remove("error");
        try {
            const blueprint = blueprint_from_world(this.world);
            if (!blueprint) {
                this.export_status.classList.add("error");
                this.export_status.textContent = t("schematic.empty");
                return;
            }
            const format = this.format.value;
            const bytes = write_blueprint(blueprint, format, { target: this.version.value, name: "Redstone Modeler" });
            const file = `model${FORMATS[format].extension}`;
            const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
            Object.assign(document.createElement("a"), { href: url, download: file }).click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            this.export_status.textContent = t("schematic.saved", { count: blueprint.ps.length.toLocaleString(), x: blueprint.size.x, y: blueprint.size.y, z: blueprint.size.z, file });
        }
        catch (error) {
            console.error(error);
            this.export_status.classList.add("error");
            this.export_status.textContent = t("schematic.save_failed", { reason: error.message ?? String(error) });
        }
    }
}
