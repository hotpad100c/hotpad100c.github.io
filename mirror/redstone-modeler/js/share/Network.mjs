import { COMPACT_PREFIX, SHARE_PREFIX, decode_code, encode_code } from "./Share.mjs?v=462b4e5";

/**
 * Network clipboards: upload a share, get an id, and let the other side fetch it by that id.
 * Nothing here is ours, so everything that comes back is checked, and an upload is read back and
 * compared to what was sent before a link is given out.
 */

export const MAX_DOWNLOAD = 8 * 1024 * 1024;
const TIMEOUT = 30_000;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** `kind` says what went wrong: network, http, refused, changed, format, too_big, id, service */
export class NetworkError extends Error {
    constructor(kind, message, detail = {}) {
        super(message);
        this.name = "NetworkError";
        this.kind = kind;
        Object.assign(this, detail);
    }
}

/**
 * `text` services keep text only, so they get the share code; `binary` ones keep bytes.
 * @type {Record<string, {key: string, name: string, site: string, text: boolean, upload: (body: string|Uint8Array) => {url: string, init: RequestInit}, read_id: (answer: any) => string|undefined, download: (id: string) => string, links: RegExp[]}>}
 */
export const SERVICES = {
    mclogs: {
        key: "mclogs",
        name: "mclo.gs",
        site: "https://mclo.gs",
        text: true,
        upload: body => ({
            url: "https://api.mclo.gs/1/log",
            init: { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ content: body }) },
        }),
        read_id: answer => (answer?.success === false ? undefined : answer?.id),
        download: id => `https://api.mclo.gs/1/raw/${id}`,
        links: [/^https?:\/\/(?:www\.)?mclo\.gs\/([A-Za-z0-9_-]{1,64})\/?$/i, /^https?:\/\/api\.mclo\.gs\/1\/raw\/([A-Za-z0-9_-]{1,64})\/?$/i],
    },
    pastes: {
        key: "pastes",
        name: "pastes.dev",
        site: "https://pastes.dev",
        text: false,
        upload: body => ({
            url: "https://api.pastes.dev/post",
            init: { method: "POST", headers: { "Content-Type": "text/plain" }, body },
        }),
        read_id: answer => answer?.key,
        download: id => `https://api.pastes.dev/${id}`,
        links: [/^https?:\/\/(?:www\.)?pastes\.dev\/([A-Za-z0-9_-]{1,64})\/?$/i],
    },
};

export const DEFAULT_SERVICE = "mclogs";

/** @param {string} key */
function service_of(key) {
    const service = SERVICES[key];
    if (!service) {
        throw new NetworkError("service", `Unknown service ${key}`);
    }
    return service;
}

async function request(fetch_fn, url, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    let response;
    try {
        response = await fetch_fn(url, { ...init, signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
    }
    catch (error) {
        throw new NetworkError("network", controller.signal.aborted ? "The service did not answer in time" : "The service could not be reached (offline, blocked, or it does not allow this page to ask)", { cause: error });
    }
    finally {
        clearTimeout(timer);
    }
    if (!response.ok) {
        throw new NetworkError("http", `The service answered ${response.status}`, { status: response.status });
    }
    return response;
}

async function read_limited(response) {
    const length = Number(response.headers?.get?.("content-length"));
    if (length > MAX_DOWNLOAD) {
        throw new NetworkError("too_big", "The share is too big");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_DOWNLOAD) {
        throw new NetworkError("too_big", "The share is too big");
    }
    return bytes;
}

/**
 * @param {string} key Service key
 * @param {string} id
 * @param {typeof fetch} [fetch_fn]
 * @returns {Promise<Uint8Array>} The share, as the bytes that `encode_code` was given
 */
export async function download(key, id, fetch_fn = fetch) {
    const service = service_of(key);
    if (!ID.test(id)) {
        throw new NetworkError("id", "This is not a valid share id");
    }
    const bytes = await read_limited(await request(fetch_fn, service.download(id)));
    if (service.text) {
        try {
            return decode_code(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        }
        catch (error) {
            throw new NetworkError("format", `That is not a share (${error.message})`);
        }
    }
    // A service that keeps bytes may have been given a code as text too
    const head = new TextDecoder().decode(bytes.subarray(0, SHARE_PREFIX.length));
    if (head === SHARE_PREFIX || head === COMPACT_PREFIX) {
        try {
            return decode_code(new TextDecoder().decode(bytes));
        }
        catch (error) {
            throw new NetworkError("format", `That is not a share (${error.message})`);
        }
    }
    return bytes;
}

const same = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * Uploads a share and reads it back. The id is only given out when what comes back is what was sent.
 * @param {string} key
 * @param {Uint8Array} bytes The share (`.rmmodel` bytes, or the compact form)
 * @param {typeof fetch} [fetch_fn]
 * @returns {Promise<{service: string, id: string}>}
 */
export async function upload(key, bytes, fetch_fn = fetch) {
    const service = service_of(key);
    const { url, init } = service.upload(service.text ? encode_code(bytes) : bytes);
    const response = await request(fetch_fn, url, init);
    let answer;
    try {
        answer = await response.json();
    }
    catch {
        throw new NetworkError("format", "The service did not answer in a way that is understood");
    }
    const id = service.read_id(answer);
    if (typeof id !== "string" || !ID.test(id)) {
        throw new NetworkError("refused", `The service refused it${typeof answer?.error === "string" ? `: ${answer.error.slice(0, 200)}` : ""}`);
    }
    let back;
    try {
        back = await download(key, id, fetch_fn);
    }
    catch (error) {
        throw error instanceof NetworkError && error.kind === "format"
            ? new NetworkError("changed", "The service changed what was uploaded, so it cannot keep it")
            : error;
    }
    if (!same(back, bytes)) {
        throw new NetworkError("changed", "The service changed what was uploaded, so it cannot keep it");
    }
    return { service: key, id };
}

/**
 * @param {string} base The address of this page, without a fragment
 * @param {{service: string, id: string}} share
 */
export function share_link(base, { service, id }) {
    return `${base.split("#")[0]}#share=${service}.${id}`;
}

/**
 * Understands the fragment of a link made by `share_link`, or the address of a paste on a service.
 * @param {string} text
 * @returns {{service: string, id: string}|null}
 */
export function parse_link(text) {
    const trimmed = text.trim();
    const fragment = /(?:^|[#&])share=([a-z]+)\.([A-Za-z0-9_-]{1,64})(?:&|$)/.exec(trimmed.slice(trimmed.indexOf("#") + 1));
    if (trimmed.includes("#") && fragment && SERVICES[fragment[1]]) {
        return { service: fragment[1], id: fragment[2] };
    }
    if (!trimmed.includes("#") && trimmed.startsWith("share=")) {
        const bare = /^share=([a-z]+)\.([A-Za-z0-9_-]{1,64})$/.exec(trimmed);
        if (bare && SERVICES[bare[1]]) {
            return { service: bare[1], id: bare[2] };
        }
    }
    for (const service of Object.values(SERVICES)) {
        for (const pattern of service.links) {
            const match = pattern.exec(trimmed);
            if (match) {
                return { service: service.key, id: match[1] };
            }
        }
    }
    return null;
}
