import { t } from "../i18n/i18n.mjs?v=462b4e5";
import { save as save_settings } from "../model/Settings.mjs?v=462b4e5";
import { SERVICES, download, parse_link, share_link, upload } from "../share/Network.mjs?v=462b4e5";
import { CHAT_LIMIT, decode_code, export_model } from "../share/Share.mjs?v=462b4e5";

/** Codes longer than this are not put into the text box, which gets slow with millions of characters. */
const SHOW_LIMIT = 100_000;

function format_size(bytes) {
    return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * The share in pasted text: a link to a network clipboard, or a share code.
 * @param {string} text
 * @returns {Promise<Uint8Array>}
 */
export async function read_text(text) {
    const link = parse_link(text);
    return link ? download(link.service, link.id) : decode_code(text);
}

/**
 * Dialog that packs the model with the resources it uses, as a code to copy or a file, and opens what others sent.
 */
export class SharePanel {
    /**
     * @param {object} options
     * @param {HTMLDialogElement} options.dialog
     * @param {import("../model/World.mjs?v=462b4e5").World} options.world
     * @param {() => import("../render/Resources.mjs?v=462b4e5").Resources|null} options.get_resources
     * @param {() => string} options.get_language Language code of the block names that are in use, "" for English only
     * @param {(bytes: Uint8Array) => Promise<string>} options.on_open Opens a shared model, gives the name of its pack
     * @param {ReturnType<typeof import("../model/Settings.mjs?v=462b4e5").normalize>} options.settings Remembers the service and whether uploading was agreed to
     * @param {() => string} [options.get_base] Address of this page, for links
     * @param {(message: string) => boolean} [options.ask] Asks for agreement
     */
    constructor({ dialog, world, get_resources, get_language, on_open, settings, get_base = () => location.href, ask = message => window.confirm(message) }) {
        this.settings = settings;
        this.get_base = get_base;
        this.ask = ask;
        this.dialog = dialog;
        this.world = world;
        this.get_resources = get_resources;
        this.get_language = get_language;
        this.on_open = on_open;
        /** @type {import("../share/Share.mjs?v=462b4e5").Exported|null} */
        this.result = null;
        this.run = 0;
        const $ = id => dialog.querySelector(`#${id}`);
        this.scope = $("share_scope");
        this.languages_row = $("share_languages_row");
        this.all_languages = $("share_all_languages");
        this.stats = $("share_stats");
        this.parts = $("share_parts");
        this.warning = $("share_warning");
        this.code = $("share_code");
        this.copy_button = $("share_copy");
        this.download_button = $("share_download");
        this.status = $("share_status");
        this.paste = $("share_paste");
        this.open_status = $("share_open_status");
        this.compact = $("share_compact");
        this.minimal = $("share_minimal");
        this.service = $("share_service");
        this.link_button = $("share_link_button");
        this.link = $("share_link");
        this.service.value = SERVICES[settings.share_service] ? settings.share_service : "mclogs";

        this.scope.addEventListener("change", () => this.refresh());
        this.all_languages.addEventListener("change", () => this.refresh());
        this.compact.addEventListener("change", () => this.refresh());
        this.minimal.addEventListener("change", () => {
            // Minimal is built on the compact form
            this.compact.checked = this.compact.checked || this.minimal.checked;
            this.compact.disabled = this.minimal.checked;
            this.refresh();
        });
        this.service.addEventListener("change", () => {
            this.settings.share_service = this.service.value;
            save_settings(this.settings);
        });
        this.link_button.addEventListener("click", () => this.copy_link());
        this.copy_button.addEventListener("click", () => this.copy());
        this.download_button.addEventListener("click", () => this.download());
        $("share_close").addEventListener("click", () => dialog.close());
        $("share_open_button").addEventListener("click", () => this.open_code());
        $("share_file").addEventListener("change", (event) => {
            const [file] = event.target.files;
            event.target.value = "";
            if (file) {
                this.open_file(file);
            }
        });
    }

    async open() {
        this.dialog.showModal();
        this.status.textContent = "";
        this.open_status.textContent = "";
        await this.refresh();
    }

    _reset(message = "") {
        this.result = null;
        this.stats.textContent = message;
        this.parts.textContent = "";
        this.warning.textContent = "";
        this.code.value = "";
        this.link.hidden = true;
        this.link.value = "";
        this.copy_button.disabled = true;
        this.download_button.disabled = true;
        this.link_button.disabled = true;
    }

    /** Packs the model again; the result is kept so that Copy can run in the click, which some browsers need. */
    async refresh() {
        const run = ++this.run;
        this.languages_row.hidden = this.scope.value !== "pack";
        const resources = this.get_resources();
        if (!resources) {
            this._reset(t("share.need_pack"));
            return;
        }
        if (this.world.count === 0) {
            this._reset(t("share.empty"));
            return;
        }
        this._reset(t("share.working"));
        let result;
        try {
            result = await export_model(resources, this.world, {
                scope: this.scope.value,
                language: this.get_language(),
                all_languages: this.all_languages.checked,
                compact: this.compact.checked || this.minimal.checked,
                minimal: this.minimal.checked,
            });
        }
        catch (error) {
            console.error(error);
            this.stats.textContent = error.message;
            return;
        }
        if (run !== this.run) {
            return;
        }
        this.result = result;
        const { stats } = result;
        this.stats.textContent = t("share.stats", {
            blocks: stats.blocks,
            models: stats.models,
            textures: stats.textures,
            size: format_size(stats.bytes),
            chars: stats.code_length.toLocaleString(),
        });
        if (stats.compact) {
            this.stats.textContent += ` · ${t("share.compare", { standard: stats.standard_code_length.toLocaleString() })}`;
        }
        this.parts.textContent = t("share.parts", {
            models: format_size(stats.parts.models),
            pictures: format_size(stats.parts.pictures),
            names: format_size(stats.parts.names),
            model: format_size(stats.parts.model),
        });
        this.warning.textContent = stats.code_length > CHAT_LIMIT ? t("share.too_long", { limit: CHAT_LIMIT }) : "";
        if (stats.code_length <= SHOW_LIMIT) {
            this.code.value = result.code;
        }
        else {
            this.code.value = t("share.code_hidden");
        }
        this.copy_button.disabled = false;
        this.download_button.disabled = false;
        this.link_button.disabled = false;
    }

    /** Uploads the share to the chosen network clipboard and copies a link to it. */
    async copy_link() {
        if (!this.result) {
            return;
        }
        const key = this.service.value;
        const service = SERVICES[key];
        if (!this.settings.share_consent) {
            if (!this.ask(t("share.consent", { service: service.name }))) {
                return;
            }
            this.settings.share_consent = true;
            save_settings(this.settings);
        }
        const result = this.result;
        this.status.classList.remove("error");
        this.status.textContent = t("share.uploading", { service: service.name });
        this.link_button.disabled = true;
        try {
            const done = await upload(key, result.raw);
            const link = share_link(this.get_base(), done);
            this.link.value = link;
            this.link.hidden = false;
            try {
                await navigator.clipboard.writeText(link);
                this.status.textContent = t("share.link_copied");
            }
            catch {
                this.status.textContent = t("share.link_copy_failed");
                this.link.select();
            }
        }
        catch (error) {
            console.error(error);
            this.status.classList.add("error");
            this.status.textContent = t("share.upload_failed", { reason: error.message });
        }
        finally {
            this.link_button.disabled = false;
        }
    }

    async copy() {
        if (!this.result) {
            return;
        }
        try {
            await navigator.clipboard.writeText(this.result.code);
            this.status.textContent = t("share.copied");
        }
        catch {
            this.status.textContent = t("share.copy_failed");
            this.code.select();
        }
    }

    download() {
        if (!this.result) {
            return;
        }
        const url = URL.createObjectURL(new Blob([this.result.bytes], { type: "application/zip" }));
        Object.assign(document.createElement("a"), { href: url, download: "model.rmmodel" }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async _open(read) {
        this.open_status.classList.remove("error");
        try {
            const name = await this.on_open(await read());
            this.open_status.textContent = t("share.opened", { name });
        }
        catch (error) {
            console.error(error);
            this.open_status.classList.add("error");
            this.open_status.textContent = t("share.open_failed", { reason: error.message });
        }
        await this.refresh();
    }

    open_code() {
        return this._open(() => read_text(this.paste.value));
    }

    /** @param {File} file */
    open_file(file) {
        return this._open(async () => new Uint8Array(await file.arrayBuffer()));
    }
}
