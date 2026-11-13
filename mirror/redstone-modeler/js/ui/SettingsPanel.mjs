import * as i18n from "../i18n/i18n.mjs?v=462b4e5";
import { DEFAULTS, SIZE_LIMITS, normalize, save } from "../model/Settings.mjs?v=462b4e5";

const { t, tn } = i18n;

/**
 * Dialog for the size of the model space, the background colour, the colour of the 2D plane and
 * the language of block names. Colours and language apply immediately; a size that would delete
 * blocks needs a second click.
 */
export class SettingsPanel {
    /**
     * @param {object} options
     * @param {HTMLDialogElement} options.dialog
     * @param {ReturnType<typeof normalize>} options.settings Loaded settings, updated in place and stored
     * @param {import("../model/World.mjs?v=462b4e5").World} options.world
     * @param {import("../render/Scene.mjs?v=462b4e5").Scene} options.scene
     */
    constructor({ dialog, settings, world, scene }) {
        this.dialog = dialog;
        this.settings = settings;
        this.world = world;
        this.scene = scene;
        this.pending = null;
        /** @type {import("../pack/CompiledPack.mjs?v=462b4e5").CompiledPack|null} */
        this.pack = null;
        /** @type {() => void} Called when the language of the block names changed */
        this.on_language_change = () => {};
        /** @type {() => void} Called when the language of the interface changed */
        this.on_ui_language_change = () => {};
        const $ = id => dialog.querySelector(`#${id}`);
        this.size_inputs = { x: $("size_x"), y: $("size_y"), z: $("size_z") };
        this.note = $("size_note");
        this.apply_button = $("size_apply");
        this.background = $("bg_color");
        this.plane_color = $("plane_color");
        this.plane_opacity = $("plane_opacity");
        this.opacity_label = $("plane_opacity_value");
        this.ui_language_select = $("ui_language");
        this.language_select = $("search_language");
        this.language_note = $("language_note");
        this.mouse_mapping = $("mouse_mapping");
        this.fly_speed = $("fly_speed");
        this.look_sensitivity = $("look_sensitivity");

        for (const input of Object.values(this.size_inputs)) {
            input.min = SIZE_LIMITS.min;
            input.max = SIZE_LIMITS.max;
            input.addEventListener("input", () => {
                this.pending = null;
                this.note.textContent = "";
            });
        }
        this.apply_button.addEventListener("click", () => this.apply_size());
        this.background.addEventListener("input", () => this._set_colors());
        this.plane_color.addEventListener("input", () => this._set_colors());
        this.plane_opacity.addEventListener("input", () => this._set_colors());
        this.ui_language_select.addEventListener("change", () => {
            this.settings.language = this.ui_language_select.value;
            save(this.settings);
            i18n.set_language(i18n.resolve_language(this.settings.language));
            this.on_ui_language_change();
        });
        this.language_select.addEventListener("change", () => {
            this.settings.search_language = this.language_select.value;
            save(this.settings);
            this.on_language_change();
        });
        this.mouse_mapping.addEventListener("change", () => {
            this.settings.mouse_mapping = normalize({ mouse_mapping: this.mouse_mapping.value }).mouse_mapping;
            this.scene.mapping = this.settings.mouse_mapping;
            save(this.settings);
        });
        this.fly_speed.addEventListener("change", () => {
            this.settings.fly_speed = normalize({ fly_speed: this.fly_speed.value }).fly_speed;
            this.fly_speed.value = this.settings.fly_speed;
            save(this.settings);
        });
        this.look_sensitivity.addEventListener("input", () => {
            this.settings.look_sensitivity = normalize({ look_sensitivity: this.look_sensitivity.value }).look_sensitivity;
            save(this.settings);
        });
        $("settings_reset").addEventListener("click", () => this.reset());
        $("settings_close").addEventListener("click", () => dialog.close());
        this.show();
        this._apply_colors();
    }

    open() {
        this.show();
        this.dialog.showModal();
    }

    /**
     * Offers the languages of the pack for the block names.
     * @param {import("../pack/CompiledPack.mjs?v=462b4e5").CompiledPack|null} pack
     */
    set_pack(pack) {
        this.pack = pack;
        this.language_select.replaceChildren();
        const english = document.createElement("option");
        english.value = "";
        english.textContent = t("settings.english_only");
        this.language_select.appendChild(english);
        // English is always searched, so it is not listed again
        for (const language of (pack?.languages ?? []).filter(l => l.code !== "en_us")) {
            const option = document.createElement("option");
            option.value = language.code;
            option.textContent = SettingsPanel.language_label(language);
            this.language_select.appendChild(option);
        }
        this.language_note.textContent = pack && pack.languages.length === 0
            ? t("settings.no_names")
            : "";
        this.show();
    }

    /** Fills the language lists of the interface; call again after the interface language changed. */
    _fill_ui_languages() {
        this.ui_language_select.replaceChildren();
        for (const { code, name } of [{ code: "auto", name: t("settings.auto") }, ...i18n.LANGUAGES]) {
            const option = document.createElement("option");
            option.value = code;
            option.textContent = name;
            this.ui_language_select.appendChild(option);
        }
    }

    /** Redraws the parts that contain interface text, after the language of the interface changed. */
    refresh_language() {
        this.set_pack(this.pack);
        this.note.textContent = "";
    }

    /**
     * The language to use for block names with the loaded pack: the chosen one if the pack has it, else English only.
     * @returns {string} Language code, or "" for English only
     */
    effective_language() {
        const code = this.settings.search_language;
        return code && this.pack?.languages.some(l => l.code === code) ? code : "";
    }

    /** @param {{code: string, name: string, region: string}} language */
    static language_label({ code, name, region }) {
        let label = name;
        if (!label) {
            try {
                label = new Intl.DisplayNames(["en"], { type: "language" }).of(code.replace("_", "-")) ?? code;
            }
            catch {
                label = code;
            }
        }
        return region ? `${label} (${region})` : label;
    }

    /** Fills the form from the stored settings. */
    show() {
        for (const [axis, input] of Object.entries(this.size_inputs)) {
            input.value = this.settings.size[axis];
        }
        this._fill_ui_languages();
        this.ui_language_select.value = this.settings.language;
        this.language_select.value = this.effective_language();
        this.mouse_mapping.value = this.settings.mouse_mapping;
        this.fly_speed.value = this.settings.fly_speed;
        this.look_sensitivity.value = this.settings.look_sensitivity;
        this.scene.mapping = this.settings.mouse_mapping;
        this.background.value = this.settings.background;
        this.plane_color.value = this.settings.plane_color;
        this.plane_opacity.value = this.settings.plane_opacity;
        this.opacity_label.textContent = `${Math.round(this.settings.plane_opacity * 100)}%`;
        this.pending = null;
    }

    /** Call after the world was resized by something else, such as loading a save. */
    sync_size() {
        this.settings.size = { ...this.world.size };
        save(this.settings);
        this.show();
    }

    apply_size() {
        const wanted = normalize({ size: Object.fromEntries(Object.entries(this.size_inputs).map(([a, i]) => [a, i.value])) }).size;
        for (const [axis, input] of Object.entries(this.size_inputs)) {
            input.value = wanted[axis];
        }
        const outside = this.world.count_outside(wanted);
        const key = JSON.stringify(wanted);
        if (outside > 0 && this.pending !== key) {
            this.pending = key;
            this.note.textContent = tn("settings.size_warn", outside);
            return;
        }
        this.pending = null;
        this.scene.set_size(wanted);
        this.settings.size = wanted;
        save(this.settings);
        const cells = wanted.x * wanted.y * wanted.z;
        this.note.textContent = cells > 100000 ? t("settings.applied_large") : t("settings.applied");
    }

    reset() {
        const size = { ...DEFAULTS.size };
        const outside = this.world.count_outside(size);
        Object.assign(this.settings, normalize({ ...DEFAULTS, size }));
        this.show();
        this._apply_colors();
        i18n.set_language(i18n.resolve_language(this.settings.language));
        this.on_ui_language_change();
        this.on_language_change();
        if (outside === 0) {
            this.scene.set_size(size);
            this.note.textContent = t("settings.defaults_restored");
        }
        else {
            // Keep the model: only the colours are reset, the size needs an explicit Apply
            this.settings.size = { ...this.world.size };
            this.show();
            this.note.textContent = tn("settings.reset_kept", outside);
        }
        save(this.settings);
    }

    _set_colors() {
        this.settings.background = this.background.value;
        this.settings.plane_color = this.plane_color.value;
        this.settings.plane_opacity = Number(this.plane_opacity.value);
        this.opacity_label.textContent = `${Math.round(this.settings.plane_opacity * 100)}%`;
        this._apply_colors();
        save(this.settings);
    }

    _apply_colors() {
        this.scene.set_background(this.settings.background);
        this.scene.set_plane_style(this.settings.plane_color, this.settings.plane_opacity);
    }
}
