// Starts the editor. The editor itself is loaded with a dynamic import so that any problem while
// loading it (an old browser, a missing feature, a broken file) is shown on the page instead of
// leaving a dead interface.
const boot = window.__rm_boot ?? { note: message => console.error(message) };

function has_webgl2() {
    try {
        return Boolean(document.createElement("canvas").getContext("webgl2"));
    }
    catch {
        return false;
    }
}

if (!has_webgl2()) {
    boot.note(/^zh/i.test(navigator.language)
        ? "这个浏览器不支持 WebGL 2，3D 视图需要它。需要 Safari 15 或更新版本；也请检查是否禁用了 WebGL。"
        : "This browser does not support WebGL 2, which the 3D view needs. Safari 15 or newer is required; also check that WebGL is not disabled.");
}
else {
    try {
        await import("./editor.mjs?v=462b4e5");
    }
    catch (error) {
        boot.note(`${/^zh/i.test(navigator.language) ? "编辑器无法启动" : "The editor could not start"}: ${error?.message ?? error}`);
        throw error;
    }
}
