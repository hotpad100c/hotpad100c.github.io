const categoryFiles = [
    "1.12.2_magic.csv",
    "coding.csv",
    "computational.csv",
    "general.csv",
    "glitch.csv",
    "machine_name.csv",
    "mechanical.csv",
    "mob_farm.csv",
    "other.csv",
    "science.csv",
    "slimestone.csv",
    "storage.csv",
    "tree_farm.csv"
];

async function loadCategory(fileName) {
    const url = "categories/" + fileName;
    logToPage("Started parsing CSV data : " + url);
    Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            loadingBar.style.display = "none";

            if (results.errors.length > 0) {
                logToPage("Papa Parse errors:", results.errors);
            }

            data = results.data;
            headers = results.meta.fields;

            logToPage("Parsed CSV data length: " + data.length);

            applyLang(window.langDict);
            renderTable(data, headers);
        },
        error: function(error) {
            loadingBar.style.display = "none";
            logToPage("Papa Parse failed:", error);
        }
    });
}

function renderCategoryButtons() {
    const select = document.getElementById("category-buttons");
    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Category";
    select.appendChild(defaultOption);

    categoryFiles.forEach(file => {
        const name = file.replace(".csv", "");
        const opt = document.createElement("option");
        opt.value = file;
        opt.textContent = name;
        select.appendChild(opt);
    });

    select.onchange = () => {
        if (select.value) {
            loadCategory(select.value);
        }
    };
}


function createDebugOutput() {
    const debugDiv = document.createElement("div");
    debugDiv.id = "debugOutput";
    debugDiv.style.border = "1px solid #ccc";
    debugDiv.style.padding = "10px";
    debugDiv.style.margin = "10px";
    debugDiv.style.backgroundColor = "#0e0e0e";
    document.body.appendChild(debugDiv);
    return debugDiv;
}

function logToPage(...args) {
    const debugDiv = document.getElementById("debugOutput") || createDebugOutput();
    const p = document.createElement("p");
  const time = new Date().toLocaleTimeString();
  const message = args.map(a => {
    try {
      return (typeof a === "object")
        ? JSON.stringify(a, null, 2)
        : String(a);
    } catch (e) {
      return String(a);
    }
  }).join(" ");

  p.textContent = `[${time}] ${message}`;
  debugDiv.appendChild(p);
}


let data = [];

window.langDict = i18n["en"];

const urlParams = new URLSearchParams(window.location.search);
const initialLang = urlParams.get("lang") || "en";
document.getElementById("langSelector").value = initialLang;
window.langDict = i18n[initialLang];
applyLang(window.langDict);

const loadingBar = document.getElementById("loadingBar");
if (!loadingBar) {
    logToPage("Loading bar element not found");
} else {
    loadingBar.style.display = "block";
    renderCategoryButtons();
    Papa.parse("https://raw.githubusercontent.com/DuskScorpio/TechMC-Glossary/main/TechMC%20Glossary.csv", {
        download: true,
        header: true,
        complete: function(results) {
            loadingBar.style.display = "none";
            if (results.errors.length > 0) {
                logToPage("Papa Parse errors:", results.errors);
            }
            data = results.data;
            logToPage("Parsed CSV data length: " + data.length);
            applyLang(window.langDict);
        },
        error: function(error) { 
            loadingBar.style.display = "none";
            logToPage("Papa Parse failed:", error);
        }
    });
}
document.getElementById("searchBox").addEventListener("input", function() {
    const keyword = this.value.toLowerCase();
    renderWithKeyword(keyword);
});

document.getElementById("langSelector").addEventListener("change", function() {
    window.langDict = i18n[this.value];
    applyLang(window.langDict);
});

function renderWithKeyword(keyword) {
    if (!keyword) {
        renderTable(data, "");
    } else {
        const filtered = data.filter(row =>
            Object.values(row).some(v => v && v.toLowerCase().includes(keyword))
        );
        renderTable(filtered, keyword);
    }
}

function renderColumnSelectors() {
    const container = document.getElementById("columnSelectors");
    container.innerHTML = "";
    const columns = window.langDict.columns;
    for (let key in columns) {
        const p = document.createElement("p");
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = (key !== columns[3]);
        checkbox.dataset.col = key;
        checkbox.addEventListener("change", () => {
            renderWithKeyword(document.getElementById("searchBox").value.toLowerCase());
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(columns[key]));
        p.appendChild(label);
        container.appendChild(p);
    }
}

function highlight(text, keyword) {
    if (!text) return "";
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
}

function makeCell(text, fallbackKey, keyword) {
    if (!text) {
        return `<td style="background-color:#ff333333;">${window.langDict[fallbackKey]}</td>`;
    }
    if (text.includes("*")) {
        return `<td style="background-color:#ffa50033;">${highlight(text, keyword)}</td>`;
    }
    return `<td>${highlight(text, keyword)}</td>`;
}

function renderTable(rows, keyword) {
    updateTableHeader(); 
    const tbody = document.querySelector("#resultTable tbody");
    tbody.innerHTML = "";

    const columnsVisible = {};
    document.querySelectorAll("#columnSelectors input[type=checkbox]").forEach(cb => {
        columnsVisible[cb.dataset.col] = cb.checked;
    });

    if (rows.length === 0) {
        const visibleCount = Object.values(columnsVisible).filter(v => v).length;
        tbody.innerHTML = `<tr><td colspan="${visibleCount}" class="no-result">${window.langDict.noResult}</td></tr>`;
        return;
    }

    rows.forEach(row => {
        const tr = document.createElement("tr");
        let html = "";

        if (columnsVisible.short) {
            html += makeCell(row["Short Form"], "noShort", keyword);
        }
        if (columnsVisible.fullEnglish) {
            html += makeCell(row["Full Form (English)"], "noFullEnglish", keyword);
        }
        if (columnsVisible.full && window.langDict.full.trim() !== "") {
            html += makeCell(row[window.langDict.lang], "noFull", keyword);
        }
        let localDesc = "";
        if (columnsVisible.desc) {
            let descriptionName = "";
            if (window.langDict.lang !== "English") {
                descriptionName = " (" + window.langDict.lang + ")";
            }
            localDesc = row["Description" + descriptionName] || row["Description"];
            html += makeCell(localDesc, "noDesc", keyword);
        }

        html += `<td><button class="edit-btn" title="Edit">&#9998;</button></td>`;

        tr.innerHTML = html;

        const editBtn = tr.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const params = new URLSearchParams({
                short: row["Short Form"] || "",
                fullEnglish: row["Full Form (English)"] || "",
                local: row[window.langDict.lang] || "",
                desc: row["Description"] || "",
                localDesc: localDesc || "",
                lang: document.getElementById("langSelector").value
            });
            window.location.href = `edit.html?${params.toString()}`;
        });

        tr.style.cursor = "pointer";
        tr.addEventListener("click", () => {
            const shortForm = encodeURIComponent(row["Short Form"] || "");
            const fullEnglish = encodeURIComponent(row["Full Form (English)"] || "");
            const localForm = encodeURIComponent(row[window.langDict.lang] || "");
            const desc = encodeURIComponent(row["Description"] || "");
            const localDescEncoded = encodeURIComponent(localDesc || "");
            const lang = encodeURIComponent(document.getElementById("langSelector").value);
            window.location.href = `details.html?short=${shortForm}&full=${fullEnglish}&local=${localForm}&desc=${desc}&localDesc=${localDescEncoded}&lang=${lang}`;

        });

        tbody.appendChild(tr);
    });
}
function updateTableHeader() {
    const theadRow = document.querySelector("#resultTable thead tr");
    const columnsVisible = {};
    document.querySelectorAll("#columnSelectors input[type=checkbox]").forEach(cb => {
        columnsVisible[cb.dataset.col] = cb.checked;
    });

    const dict = window.langDict;
    let html = '';

    if (columnsVisible.short) html += `<th data-col="short">${dict.short}</th>`;
    if (columnsVisible.fullEnglish) html += `<th data-col="fullEnglish">${dict.fullEnglish}</th>`;
    if (columnsVisible.full && dict.full.trim() !== '' && columnsVisible.full) html += `<th data-col="full">${dict.full}</th>`;
    if (columnsVisible.desc) html += `<th data-col="desc">${dict.desc}</th>`;

    html += `<th data-col="edit"></th>`;

    theadRow.innerHTML = html;
}
function applyLang(dict) {
    window.langDict = dict;
    renderColumnSelectors();
    renderTable(data, document.getElementById("searchBox").value.toLowerCase());
}
window.onload = () => {
    renderCategoryButtons();
};
