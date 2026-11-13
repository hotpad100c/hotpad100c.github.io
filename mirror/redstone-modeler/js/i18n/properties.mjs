// Block state names and values have no translation in the game, so these are our own wording.
// Anything missing stays as it is, and the real keys always stay visible in tooltips.

const ZH_PROPERTIES = {
    facing: "朝向",
    orientation: "朝向",
    powered: "通电",
    lit: "点亮",
    open: "打开",
    half: "上下半",
    type: "类型",
    shape: "形状",
    face: "附着面",
    axis: "轴向",
    delay: "延迟",
    locked: "锁定",
    mode: "模式",
    extended: "伸出",
    power: "信号强度",
    attached: "已连接",
    enabled: "启用",
    triggered: "已触发",
    crafting: "合成中",
    inverted: "反转",
    waterlogged: "含水",
    hinge: "铰链",
    in_wall: "嵌入墙中",
    instrument: "乐器",
    note: "音符",
    age: "生长阶段",
    distance: "距离",
    persistent: "持久",
    short: "短",
    unstable: "不稳定",
    disarmed: "已解除",
    sculk_sensor_phase: "阶段",
    attachment: "安装方式",
    north: "北",
    east: "东",
    south: "南",
    west: "西",
    up: "上",
    down: "下",
};

const ZH_VALUES = {
    true: "是",
    false: "否",
    north: "北",
    east: "东",
    south: "南",
    west: "西",
    up: "上",
    down: "下",
    none: "无",
    side: "侧面",
    left: "左",
    right: "右",
    bottom: "下",
    top: "上",
    double: "双层",
    single: "单个",
    lower: "下半",
    upper: "上半",
    floor: "地面",
    wall: "墙面",
    ceiling: "天花板",
    compare: "比较",
    subtract: "减法",
    normal: "普通",
    sticky: "黏性",
    ascending: "上坡",
    straight: "直",
    inner: "内",
    outer: "外",
    active: "激活",
    inactive: "未激活",
    cooldown: "冷却",
    x: "X",
    y: "Y",
    z: "Z",
};

/**
 * @param {string} prop
 * @param {string} language Interface language code
 */
export function property_label(prop, language) {
    return language === "zh-CN" ? ZH_PROPERTIES[prop] ?? prop : prop;
}

/**
 * Names of the states of a value; compound values such as `north_south` are translated part by part.
 * @param {string} value
 * @param {string} language Interface language code
 */
export function value_label(value, language) {
    if (language !== "zh-CN" || /^-?\d+$/.test(value)) {
        return value;
    }
    const parts = value.split("_");
    return parts.every(part => part in ZH_VALUES) ? parts.map(part => ZH_VALUES[part]).join("·") : value;
}

/**
 * `facing=east, powered=true` for English; `朝向=东, 通电=是` with the real keys after it for Chinese.
 * @param {Record<string, string>} state
 * @param {string} language Interface language code
 */
export function state_label(state, language) {
    const raw = Object.entries(state).map(([k, v]) => `${k}=${v}`).join(", ");
    if (language !== "zh-CN" || raw === "") {
        return raw;
    }
    const translated = Object.entries(state).map(([k, v]) => `${property_label(k, language)}=${value_label(v, language)}`).join(", ");
    return `${translated} (${raw})`;
}
