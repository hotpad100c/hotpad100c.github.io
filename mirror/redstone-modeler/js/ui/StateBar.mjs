import * as i18n from "../i18n/i18n.mjs?v=462b4e5";
import { property_label, state_label, value_label } from "../i18n/properties.mjs?v=462b4e5";
import { enumerate_states, state_count } from "../pack/BlockStates.mjs?v=462b4e5";

const { t } = i18n;

const LIMIT = 5000;

/**
 * Expandable bar above the hotbar that shows a picture of every state combination
 * of the held block. Clicking one sets the held block's state.
 */
export class StateBar {
    /**
     * @param {object} elements
     * @param {HTMLElement} elements.bar
     * @param {HTMLElement} elements.toggle
     * @param {HTMLElement} elements.filters
     * @param {HTMLElement} elements.grid
     * @param {HTMLElement} elements.note
     * @param {HTMLInputElement} elements.dedupe
     * @param {import("./BlockPicker.mjs?v=462b4e5").BlockPicker} picker
     * @param {import("../render/Icons.mjs?v=462b4e5").IconRenderer} icons
     * @param {() => import("../render/Resources.mjs?v=462b4e5").Resources|null} get_resources
     */
    constructor({ bar, toggle, filters, grid, note, dedupe }, picker, icons, get_resources) {
        this.bar = bar;
        this.toggle = toggle;
        this.filters_element = filters;
        this.grid = grid;
        this.note = note;
        this.dedupe = dedupe;
        this.picker = picker;
        this.icons = icons;
        this.get_resources = get_resources;
        /** @type {Record<string, string>} */
        this.filters = {};
        this.key = null;
        this.tiles = [];
        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const tile = entry.target;
                    const img = tile.firstChild;
                    if (!img.src) {
                        img.src = this.icons.icon(tile.dataset.block, JSON.parse(tile.dataset.state));
                    }
                    this.observer.unobserve(tile);
                }
            }
        }, { root: grid });
        toggle.addEventListener("click", () => this.set_open(this.bar.hidden));
        dedupe.addEventListener("change", () => this.refresh());
        this.set_open(false);
    }

    /** Redraws what contains interface text, after the language of the interface changed. */
    refresh_language() {
        this.block_name = null;
        this.set_open(this.open);
    }

    get open() {
        return !this.bar.hidden;
    }

    set_open(open) {
        this.bar.hidden = !open;
        this.toggle.classList.toggle("selected", open);
        this.toggle.textContent = open ? t("state.toggle_open") : t("state.toggle_closed");
        if (open) {
            this.refresh();
        }
    }

    /** Brings the bar up to date with the held block. Cheap when only the held state changed. */
    refresh() {
        if (!this.open) {
            return;
        }
        const block = this.picker.selected;
        const resources = this.get_resources();
        if (!block || !resources) {
            this._clear("");
            return;
        }
        if (this.block_name !== block.name || this.resources !== resources) {
            this.block_name = block.name;
            this.resources = resources;
            this.filters = {};
            this.key = null;
            this._render_filters(resources.pack.properties(block.name));
        }
        const key = JSON.stringify([block.name, this.filters, this.dedupe.checked]);
        if (key !== this.key) {
            this.key = key;
            this._rebuild(block.name, resources);
        }
        this._highlight(block.props);
    }

    _clear(message) {
        this.observer.disconnect();
        this.grid.replaceChildren();
        this.filters_element.replaceChildren();
        this.note.textContent = message;
        this.tiles = [];
        this.block_name = null;
        this.key = null;
    }

    _render_filters(properties) {
        this.filters_element.replaceChildren();
        for (const [prop, values] of Object.entries(properties)) {
            const label = document.createElement("label");
            const text = document.createElement("span");
            text.textContent = property_label(prop, i18n.language());
            const select = document.createElement("select");
            select.dataset.property = prop;
            for (const value of ["", ...values]) {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value === "" ? t("state.any") : value_label(value, i18n.language());
                select.appendChild(option);
            }
            select.addEventListener("change", () => {
                if (select.value) {
                    this.filters[prop] = select.value;
                }
                else {
                    delete this.filters[prop];
                }
                this.refresh();
            });
            label.append(text, select);
            this.filters_element.appendChild(label);
        }
    }

    _rebuild(name, resources) {
        this.observer.disconnect();
        this.grid.replaceChildren();
        this.tiles = [];
        const { pack } = resources;
        const properties = pack.properties(name);
        const seen = new Set();
        let capped = false;
        const fragment = document.createDocumentFragment();
        for (const state of enumerate_states(properties, this.filters)) {
            if (this.dedupe.checked) {
                const tint = resources.tint(name, state).map(v => Math.round(v * 255)).join(",");
                const signature = `${pack.signature(name, state)}|${tint}`;
                if (seen.has(signature)) {
                    continue;
                }
                seen.add(signature);
            }
            if (this.tiles.length >= LIMIT) {
                capped = true;
                break;
            }
            const tile = document.createElement("button");
            tile.type = "button";
            tile.className = "state_tile";
            tile.dataset.block = name;
            tile.dataset.state = JSON.stringify(state);
            tile.title = state_label(state, i18n.language()) || t("state.none");
            tile.appendChild(document.createElement("img"));
            tile.addEventListener("click", () => this.picker.set_props(state));
            fragment.appendChild(tile);
            this.tiles.push({ tile, state });
        }
        this.grid.appendChild(fragment);
        for (const { tile } of this.tiles) {
            this.observer.observe(tile);
        }
        const total = state_count(properties);
        this.note.textContent = capped
            ? t("state.capped", { limit: LIMIT, total })
            : t("state.count", { shown: this.tiles.length, total });
    }

    _highlight(props) {
        for (const { tile, state } of this.tiles) {
            tile.classList.toggle("selected", Object.entries(state).every(([k, v]) => props[k] === v));
        }
    }
}
