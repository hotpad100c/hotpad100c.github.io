import * as i18n from "../i18n/i18n.mjs?v=462b4e5";
import { property_label, value_label } from "../i18n/properties.mjs?v=462b4e5";

const { t } = i18n;

const SLOT_COUNT = 9;

/**
 * Block list with search, property editor and hotbar.
 * The held block is the active hotbar slot; picking a block from the list fills that slot.
 */
export class BlockPicker {
    /**
     * @param {object} elements
     * @param {HTMLElement} elements.list
     * @param {HTMLInputElement} elements.search
     * @param {HTMLSelectElement} elements.namespace Filter for the namespace (mod) of the blocks
     * @param {HTMLElement} elements.states
     * @param {HTMLElement} elements.hotbar
     * @param {import("../render/Icons.mjs?v=462b4e5").IconRenderer} icons
     */
    constructor({ list, search, namespace, states, hotbar }, icons) {
        this.list = list;
        this.search = search;
        this.namespace = namespace;
        this.states = states;
        this.hotbar = hotbar;
        this.icons = icons;
        /** @type {import("../pack/CompiledPack.mjs?v=462b4e5").CompiledPack|null} */
        this.pack = null;
        /** @type {({name: string, props: Record<string, string>}|null)[]} */
        this.slots = Array.from({ length: SLOT_COUNT }, () => null);
        this.slot = 0;
        this.items = new Map();
        /** @type {() => void} Called when the held block or its state changes */
        this.on_change = () => {};
        /** @type {(block: {name: string, props: Record<string, string>}) => void} Called when a block is picked, not when only its state changes */
        this.on_select = () => {};
        /** Language of the block names that are shown and searched in addition to English; "" is English only */
        this.name_language = "";
        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    this._load_icon(entry.target);
                    this.observer.unobserve(entry.target);
                }
            }
        }, { root: list });
        search.addEventListener("input", () => this._filter());
        namespace.addEventListener("change", () => this._filter());
        this._render_hotbar();
    }

    /** The block that would be placed, or null */
    get selected() {
        const block = this.slots[this.slot];
        return block ? { name: block.name, props: { ...block.props } } : null;
    }

    static short_name(name) {
        return name.replace(/^minecraft:/, "");
    }

    /**
     * Name to show for a block: in the chosen language, else English.
     * @param {string} id
     */
    label_of(id) {
        return this.pack ? this.pack.display_name(id, this.name_language) : BlockPicker.short_name(id);
    }

    /**
     * Everything the search looks at for a block, lower case: id, name in the chosen language, English name.
     * @param {string} id
     */
    _search_text(id) {
        const english = this.pack.display_name(id, "");
        const chosen = this.name_language ? this.pack.display_name(id, this.name_language) : "";
        // A minimal share has codes for ids; only the names are left to look for
        return [this.pack.data.minimal ? "" : id, english, chosen].join("\n").toLowerCase();
    }

    /** Redraws what contains interface text, after the language of the interface changed. */
    refresh_language() {
        const chosen = this.namespace.value;
        this._fill_namespaces(this.pack?.names ?? []);
        this.namespace.value = chosen;
        this._render_states();
        this._render_hotbar();
    }

    /** @param {string} code Language code such as `zh_cn`, or "" for English only */
    set_name_language(code) {
        this.name_language = code;
        if (this.pack) {
            for (const [name, item] of this.items) {
                item.querySelector(".block_name").textContent = this.label_of(name);
                item.dataset.search = this._search_text(name);
            }
            this._filter();
            this._render_states();
            this._render_hotbar();
        }
    }

    /** @param {import("../pack/CompiledPack.mjs?v=462b4e5").CompiledPack|null} pack */
    set_pack(pack) {
        this.pack = pack;
        this.observer.disconnect();
        this.list.replaceChildren();
        this.items.clear();
        this.slots = this.slots.map(slot => slot && pack?.names.includes(slot.name) ? slot : null);
        this._fill_namespaces(pack?.names ?? []);
        if (pack) {
            for (const name of pack.names) {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "block_item";
                item.dataset.name = name;
                item.title = pack.data.minimal ? this.label_of(name) : name;
                item.dataset.search = this._search_text(name);
                const img = document.createElement("img");
                img.alt = "";
                img.width = 32;
                img.height = 32;
                const text = document.createElement("span");
                text.className = "block_text";
                const label = document.createElement("span");
                label.className = "block_name";
                label.textContent = this.label_of(name);
                const id = document.createElement("span");
                id.className = "block_id";
                id.textContent = name;
                text.append(label, id);
                item.append(img, text);
                item.addEventListener("click", () => this.select(name));
                this.list.appendChild(item);
                this.items.set(name, item);
                this.observer.observe(item);
            }
            if (!this.slots[this.slot]) {
                const first = pack.names.includes("minecraft:stone") ? "minecraft:stone" : pack.names[0];
                if (first) {
                    this.select(first, {}, false);
                }
            }
        }
        this._filter();
        this._render_states();
        this._render_hotbar();
        this.on_change();
    }

    /**
     * Puts a block into the active slot.
     * @param {string} name
     * @param {Record<string, string>} [props] Missing properties get their default
     * @param {boolean} [announce] Call `on_select`; false for choices the user did not make
     */
    select(name, props = {}, announce = true) {
        if (!this.pack?.names.includes(name)) {
            return;
        }
        this.slots[this.slot] = { name, props: { ...this.pack.default_state(name), ...props } };
        this._render_states();
        this._render_hotbar();
        this.on_change();
        if (announce) {
            this.on_select(this.selected);
        }
    }

    /**
     * Changes properties of the held block.
     * @param {Record<string, string>} props
     */
    set_props(props) {
        const block = this.slots[this.slot];
        if (block) {
            Object.assign(block.props, props);
            this._render_states();
            this._render_hotbar();
            this.on_change();
        }
    }

    /** @param {number} index */
    set_slot(index) {
        this.slot = Math.max(0, Math.min(SLOT_COUNT - 1, index));
        this._render_states();
        this._render_hotbar();
        this.on_change();
        if (this.slots[this.slot]) {
            this.on_select(this.selected);
        }
    }

    /** The namespace filter only shows up when the packs have blocks of more than one namespace. */
    _fill_namespaces(names) {
        const spaces = [...new Set(names.map(name => name.slice(0, name.indexOf(":"))))].sort();
        this.namespace.replaceChildren();
        for (const space of ["", ...spaces]) {
            const option = document.createElement("option");
            option.value = space;
            option.textContent = space === "" ? t("sidebar.all_namespaces") : space;
            this.namespace.appendChild(option);
        }
        this.namespace.hidden = spaces.length < 2;
    }

    _filter() {
        // Names are searched as typed, ids also with spaces as underscores ("oak slab" finds oak_slab)
        const query = this.search.value.trim().toLowerCase();
        const as_id = query.replace(/\s+/g, "_");
        const space = this.namespace.value;
        for (const [name, item] of this.items) {
            const text = item.dataset.search;
            const matches = query === "" || text.includes(query) || text.includes(as_id);
            item.hidden = !matches || (space !== "" && !name.startsWith(`${space}:`));
        }
    }

    _load_icon(item) {
        const img = item.querySelector("img");
        if (!img.src && this.pack) {
            img.src = this.icons.icon(item.dataset.name, {});
        }
    }

    _render_states() {
        this.states.replaceChildren();
        for (const [name, item] of this.items) {
            item.classList.toggle("selected", name === this.slots[this.slot]?.name);
        }
        const block = this.slots[this.slot];
        if (!block || !this.pack) {
            return;
        }
        const title = document.createElement("div");
        title.className = "states_title";
        title.textContent = this.label_of(block.name);
        title.title = this.pack?.data.minimal ? this.label_of(block.name) : block.name;
        this.states.appendChild(title);
        const properties = Object.entries(this.pack.properties(block.name));
        if (properties.length === 0) {
            const none = document.createElement("div");
            none.className = "note";
            none.textContent = t("sidebar.no_states");
            this.states.appendChild(none);
        }
        for (const [prop, values] of properties) {
            const row = document.createElement("label");
            row.className = "state_row";
            const text = document.createElement("span");
            text.textContent = property_label(prop, i18n.language());
            const select = document.createElement("select");
            select.dataset.property = prop;
            for (const value of values) {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value_label(value, i18n.language());
                select.appendChild(option);
            }
            select.value = block.props[prop] ?? values[0];
            select.addEventListener("change", () => {
                block.props[prop] = select.value;
                this._render_hotbar();
                this.on_change();
            });
            row.append(text, select);
            this.states.appendChild(row);
        }
    }

    _render_hotbar() {
        this.hotbar.replaceChildren();
        this.slots.forEach((block, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "slot";
            button.classList.toggle("selected", index === this.slot);
            button.title = block ? (this.pack?.data.minimal ? this.label_of(block.name) : `${this.label_of(block.name)} (${block.name})`) : t("hotbar.empty");
            const number = document.createElement("span");
            number.textContent = String(index + 1);
            button.appendChild(number);
            if (block && this.pack) {
                const img = document.createElement("img");
                img.alt = block.name;
                img.src = this.icons.icon(block.name, block.props);
                button.appendChild(img);
            }
            button.addEventListener("click", () => this.set_slot(index));
            this.hotbar.appendChild(button);
        });
    }
}
