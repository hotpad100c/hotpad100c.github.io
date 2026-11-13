import { t } from "../i18n/i18n.mjs?v=462b4e5";
import { fingerprint, hash_bytes, delete_pack, get_active, get_pack_bytes, list_packs, put_pack, request_persistence, set_active } from "../cache/PackCache.mjs?v=462b4e5";
import { is_rmpack, read_rmpack } from "../pack/Rmpack.mjs?v=462b4e5";
import { fetch_vanilla, list_versions } from "../pack/Vanilla.mjs?v=462b4e5";
import { Pack } from "../pack/Pack.mjs?v=462b4e5";
import { compile } from "../pack/Loader.mjs?v=462b4e5";

function download(bytes, file_name) {
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: file_name });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function format_size(bytes) {
    return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Dialog for importing, stacking and compiling resource packs, and managing the saved ones.
 */
export class PackPanel {
    /**
     * @param {object} options
     * @param {HTMLDialogElement} options.dialog
     * @param {(bytes: Uint8Array, id: string) => Promise<void>} options.on_use Called with compiled bytes to activate
     * @param {Record<string, Record<string, string[]>>} options.extra_properties
     * @param {{blockstates: object, models: object}} [options.fallback]
     * @param {() => string[]} [options.get_languages] Languages whose block names to get along with the game
     * @param {typeof fetch} [options.fetch_fn]
     */
    constructor({ dialog, on_use, extra_properties, fallback, get_languages = () => [], fetch_fn = (...args) => fetch(...args) }) {
        this.get_languages = get_languages;
        this.fetch_fn = fetch_fn;
        this.dialog = dialog;
        this.on_use = on_use;
        this.extra_properties = extra_properties;
        this.fallback = fallback;
        /** Resolves when the data files for compiling are loaded */
        this.ready = Promise.resolve();
        /** @type {{name: string, size: number, lastModified: number, pack: Pack}[]} Highest priority first */
        this.sources = [];
        this.active = null;
        const $ = id => dialog.querySelector(`#${id}`);
        this.source_list = $("source_list");
        this.library_list = $("library_list");
        this.name_input = $("pack_name");
        this.status = $("compile_status");
        this.compile_button = $("compile_button");
        this.storage_note = $("storage_note");

        // iOS cannot pick folders; without this the button would do nothing
        const folder_input = $("pack_folder");
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        if (ios || !("webkitdirectory" in folder_input)) {
            folder_input.closest("label").hidden = true;
        }
        $("pack_file").addEventListener("change", (e) => {
            this.add_files([...e.target.files]);
            e.target.value = "";
        });
        $("pack_folder").addEventListener("change", (e) => {
            this.add_folder([...e.target.files]);
            e.target.value = "";
        });
        this.vanilla_select = $("vanilla_version");
        this.vanilla_button = $("vanilla_button");
        this.vanilla_button.addEventListener("click", () => this.add_vanilla());
        // The list of versions is fetched when the list is first used, not when the page or the dialog opens
        let versions_requested = false;
        const load_versions = () => {
            if (!versions_requested) {
                versions_requested = true;
                this._fill_versions().catch(() => {
                    versions_requested = false;
                });
            }
        };
        // Not on focus: the dialog focuses it when it opens, and nothing should be asked of Mojang before a click
        this.vanilla_select.addEventListener("pointerdown", load_versions);
        this.vanilla_select.addEventListener("keydown", load_versions);
        $("pack_close").addEventListener("click", () => dialog.close());
        this.compile_button.addEventListener("click", () => this.compile());
        dialog.addEventListener("dragover", e => e.preventDefault());
        dialog.addEventListener("drop", (e) => {
            e.preventDefault();
            this.add_files([...e.dataTransfer.files]);
        });
        this._render_sources();
    }

    /** Redraws the lists after the language of the interface changed. */
    rerender() {
        this._render_sources();
        if (this.dialog.open) {
            this.refresh_library();
        }
    }

    async open() {
        this.dialog.showModal();
        await this.refresh_library();
    }

    set_status(message, error = false) {
        this.status.textContent = message;
        this.status.classList.toggle("error", error);
    }

    /** @param {File[]} files */
    async add_files(files) {
        for (const file of files) {
            try {
                const bytes = new Uint8Array(await file.arrayBuffer());
                const name = file.name.replace(/(\.(rmpack|rmmodel|zip|jar))+$/i, "");
                // By content, not by name: downloads and chats rename files (`x.rmpack.zip`)
                if (is_rmpack(bytes)) {
                    await this._store_and_use(bytes, [{ name: file.name, size: file.size, lastModified: file.lastModified }], name, await hash_bytes(bytes));
                    if (!/\.(rmpack|rmmodel)$/i.test(file.name)) {
                        this.set_status(t("pack.compiled_found", { name: file.name }));
                    }
                    continue;
                }
                const pack = Pack.from_zip(name, bytes, { jar: /\.jar$/i.test(file.name) });
                this.sources.push({ name, size: file.size, lastModified: file.lastModified, pack });
                if (!this.name_input.value) {
                    this.name_input.value = name;
                }
            }
            catch (e) {
                console.error(e);
                this.set_status(t("pack.read_failed", { name: file.name, reason: e.message }), true);
            }
        }
        this._render_sources();
    }

    async _fill_versions() {
        const { versions } = await list_versions(this.fetch_fn);
        const chosen = this.vanilla_select.value;
        this.vanilla_select.replaceChildren(this.vanilla_select.options[0]);
        for (const { id } of versions) {
            this.vanilla_select.appendChild(Object.assign(document.createElement("option"), { value: id, textContent: id }));
        }
        this.vanilla_select.value = chosen;
    }

    /** Gets the game's own files from Mojang and puts them at the bottom of the stack. */
    async add_vanilla() {
        this.vanilla_button.disabled = true;
        const version = this.vanilla_select.value;
        try {
            const mb = bytes => (bytes / 1048576).toFixed(1);
            const result = await fetch_vanilla({
                version,
                languages: this.get_languages(),
                fetch_fn: this.fetch_fn,
                progress: (stage, done = 0, total = 0, id = version) => {
                    const messages = {
                        versions: () => t("pack.vanilla_versions"),
                        jar: () => t("pack.vanilla_jar", { version: id, done: mb(done), total: mb(total) }),
                        read: () => t("pack.vanilla_read", { version: id }),
                        languages: () => t("pack.vanilla_languages"),
                    };
                    this.set_status(messages[stage]());
                },
            });
            this.sources = this.sources.filter(source => source.name !== result.name);
            this.sources.push({ name: result.name, size: 0, lastModified: 0, pack: result.pack });
            if (!this.name_input.value) {
                this.name_input.value = result.name;
            }
            this._render_sources();
            this.set_status(t("pack.vanilla_added", { version: result.version }));
        }
        catch (e) {
            console.error(e);
            this.set_status(t("pack.vanilla_failed", { reason: e.message }), true);
        }
        finally {
            this.vanilla_button.disabled = false;
        }
    }

    /** @param {File[]} files */
    async add_folder(files) {
        if (files.length === 0) {
            return;
        }
        const name = files[0].webkitRelativePath.split("/")[0];
        try {
            const pack = await Pack.from_files(name, files);
            this.sources.push({ name, size: files.reduce((sum, f) => sum + f.size, 0), lastModified: 0, pack });
            if (!this.name_input.value) {
                this.name_input.value = name;
            }
        }
        catch (e) {
            this.set_status(t("pack.folder_failed", { name, reason: e.message }), true);
        }
        this._render_sources();
    }

    async compile() {
        if (this.sources.length === 0) {
            this.set_status(t("pack.add_first"), true);
            return;
        }
        const name = this.name_input.value.trim() || this.sources.map(s => s.name).join(" + ");
        this.compile_button.disabled = true;
        try {
            await this.ready;
            let report = null;
            const bytes = await compile(this.sources.map(s => s.pack), {
                name,
                extra_properties: this.extra_properties,
                fallback: this.fallback,
                progress: (key, vars) => this.set_status(t(key, vars)),
                report: (found) => {
                    report = found;
                },
            });
            await this._store_and_use(bytes, this.sources, name);
            let message = t("pack.done", { name, size: format_size(bytes.length) });
            if (report && (report.textures.length > 0 || report.unresolved.length > 0)) {
                const worst = report.textures.slice(0, 4).map(entry => entry.id.replace(/^minecraft:/, "")).join(", ");
                message += ` ${t("pack.done_problems", { textures: report.textures.length, blocks: report.blocks, examples: worst })}`;
                console.warn("Textures that were not found or not readable (the blocks show the missing texture):", report);
            }
            this.set_status(message, false);
        }
        catch (e) {
            console.error(e);
            this.set_status(e.code === "no_assets"
                ? t("pack.no_assets", { names: this.sources.map(source => source.name).join(", ") })
                : t("pack.compile_failed", { reason: e.message }), true);
        }
        finally {
            this.compile_button.disabled = false;
        }
    }

    /**
     * Saves a compiled pack in the browser and uses it. For a pack that came from someone else,
     * for example the resources of a shared model.
     * @param {Uint8Array} bytes
     * @returns {Promise<string>} The name of the pack
     */
    async add_compiled(bytes) {
        const { name } = read_rmpack(bytes).data;
        await this._store_and_use(bytes, [{ name }], name, await hash_bytes(bytes));
        return name;
    }

    async _store_and_use(bytes, sources, name, known_id = null) {
        const id = known_id ?? await fingerprint(sources);
        // Use it first: a pack that cannot be loaded must not end up in the library as the active one
        await this.on_use(bytes, id);
        await put_pack({ id, name, created: Date.now(), size: bytes.length, sources: sources.map(s => s.name) }, bytes);
        await set_active(id);
        this.active = id;
        const persisted = await request_persistence();
        this.storage_note.textContent = persisted
            ? t("pack.storage_persistent")
            : t("pack.storage_may_clear");
        await this.refresh_library();
    }

    async refresh_library() {
        this.active = await get_active();
        let packs = [];
        try {
            packs = await list_packs();
        }
        catch (e) {
            this.storage_note.textContent = t("pack.storage_unavailable", { reason: e.message });
        }
        this.library_list.replaceChildren();
        if (packs.length === 0) {
            const empty = document.createElement("li");
            empty.className = "note";
            empty.textContent = t("pack.none_saved");
            this.library_list.appendChild(empty);
        }
        for (const info of packs) {
            const item = document.createElement("li");
            item.classList.toggle("active", info.id === this.active);
            const label = document.createElement("span");
            label.className = "pack_label";
            label.textContent = `${info.name} · ${format_size(info.size)} · ${info.sources.join(" + ")}`;
            const use = this._button(t("pack.use"), async () => {
                const bytes = await get_pack_bytes(info.id);
                await set_active(info.id);
                await this.on_use(bytes, info.id);
                await this.refresh_library();
            });
            const save = this._button(t("pack.export"), async () => download(await get_pack_bytes(info.id), `${info.name}.rmpack`));
            const remove = this._button(t("pack.delete"), async () => {
                await delete_pack(info.id);
                await this.refresh_library();
            });
            item.append(label, use, save, remove);
            this.library_list.appendChild(item);
        }
    }

    _button(text, handler) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.addEventListener("click", async () => {
            try {
                await handler();
            }
            catch (e) {
                console.error(e);
                this.set_status(e.message, true);
            }
        });
        return button;
    }

    _render_sources() {
        this.source_list.replaceChildren();
        if (this.sources.length === 0) {
            const empty = document.createElement("li");
            empty.className = "note";
            empty.textContent = t("pack.none_added");
            this.source_list.appendChild(empty);
        }
        this.sources.forEach((source, index) => {
            const item = document.createElement("li");
            const label = document.createElement("span");
            label.className = "pack_label";
            label.textContent = `${source.name} · ${format_size(source.size)}`;
            const move = (delta) => {
                const [moved] = this.sources.splice(index, 1);
                this.sources.splice(index + delta, 0, moved);
                this._render_sources();
            };
            const up = this._button("↑", () => move(-1));
            up.disabled = index === 0;
            const down = this._button("↓", () => move(1));
            down.disabled = index === this.sources.length - 1;
            const remove = this._button("✕", () => {
                this.sources.splice(index, 1);
                this._render_sources();
            });
            item.append(label, up, down, remove);
            this.source_list.appendChild(item);
        });
    }
}
