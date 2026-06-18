const app = {
  state: { entries: [], nextNumber: 1 },
  currentFile: null,
  images: [],
  measurements: [],
  activeView: "dashboard",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const form = $("[data-entry-form]");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatNumber(number) {
  return `#${String(number).padStart(3, "0")}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The local archive did not respond");
  return data;
}

function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  $("[data-toasts]").append(item);
  setTimeout(() => item.remove(), 3600);
}

function setSaveState(message) {
  $("[data-save-state]").textContent = message;
}

function showView(name) {
  app.activeView = name;
  $$("[data-view]").forEach((view) => view.classList.toggle("active", view.dataset.view === name));
  $$("[data-view-button]").forEach((button) => button.classList.toggle("active", button.dataset.viewButton === name));
  $("[data-page-title]").textContent = name === "editor" ? "Entry Editor" : name === "archive" ? "Research Archive" : "Dashboard";
  document.body.classList.remove("menu-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadState() {
  app.state = await api("/api/state");
  renderDashboard();
  renderArchive();
  $("[data-output-path]").textContent = app.state.dataRoot;
  setSaveState("All records synchronized");
}

function renderDashboard() {
  const entries = app.state.entries;
  const publicEntries = entries.filter((entry) => entry.visibility === "public");
  const activeEntries = entries.filter((entry) => !["published", "test record"].includes(String(entry.status).toLowerCase()));
  const imageCount = entries.reduce((total, entry) => total + (entry.images || []).length, 0);
  $("[data-metric-total]").textContent = entries.length;
  $("[data-meter-value]").textContent = entries.length;
  $("[data-metric-public]").textContent = publicEntries.length;
  $("[data-metric-active]").textContent = activeEntries.length;
  $("[data-metric-images]").textContent = imageCount;

  const recent = entries.slice(0, 5);
  $("[data-recent-list]").innerHTML = recent.length
    ? recent.map((entry) => `
      <article class="entry-row">
        <span class="number">${formatNumber(entry.number)}</span>
        <div><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.summary)}</p></div>
        <span class="date">${escapeHtml(entry.date)}</span>
        <span class="visibility">${escapeHtml(entry.visibility)}</span>
        <button type="button" data-edit-file="${escapeHtml(entry.file)}">Open</button>
      </article>
    `).join("")
    : '<p class="empty-state">No experiments recorded. Begin with a question.</p>';

  const statuses = entries.reduce((result, entry) => {
    const key = String(entry.status || "unspecified");
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  $("[data-status-breakdown]").innerHTML = Object.entries(statuses).length
    ? Object.entries(statuses).map(([status, count]) => `<div><dt>${escapeHtml(status)}</dt><dd>${count}</dd></div>`).join("")
    : "<div><dt>Archive idle</dt><dd>0</dd></div>";
}

function archiveMatches(entry, query, visibility) {
  if (visibility !== "all" && entry.visibility !== visibility) return false;
  if (!query) return true;
  const text = [entry.number, entry.title, entry.summary, entry.status, entry.objective, entry.apparatus, entry.observations, ...(entry.tags || [])].join(" ").toLowerCase();
  return text.includes(query);
}

function renderArchive() {
  const query = $("[data-search]").value.trim().toLowerCase();
  const visibility = $("[data-visibility-filter]").value;
  const entries = app.state.entries.filter((entry) => archiveMatches(entry, query, visibility));
  $("[data-archive-count]").textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;
  $("[data-archive-list]").innerHTML = entries.length
    ? entries.map((entry) => {
      const measurements = (entry.measurements || []).map((item) => `
        <div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>
      `).join("");
      const images = (entry.images || []).map((image) => {
        const src = String(image.src || "").startsWith("assets/")
          ? `/data/assets/${encodeURIComponent(String(image.src).split("/").pop())}`
          : image.src;
        return `
          <figure>
            <img src="${escapeHtml(src)}" alt="${escapeHtml(image.alt || "Experiment image")}" loading="lazy" />
            <figcaption>${escapeHtml(image.caption || image.alt || "Experimental record")}</figcaption>
          </figure>
        `;
      }).join("");
      return `
      <article class="archive-card">
        <span class="archive-number">${formatNumber(entry.number)}</span>
        <div class="archive-main">
          <h2>${escapeHtml(entry.title)}</h2>
          <p class="entry-prose">${escapeHtml(entry.summary)}</p>
          <div class="tag-row">${(entry.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        </div>
        <div class="archive-meta">
          <span>${escapeHtml(entry.date)}</span>
          <span>${escapeHtml(entry.status)}</span>
          <span>${escapeHtml(entry.visibility)}</span>
          <span>${(entry.images || []).length} visual records</span>
        </div>
        <div class="archive-actions">
          <button type="button" data-toggle-entry="${escapeHtml(entry.file)}" aria-expanded="false">Read full entry</button>
          <button type="button" data-edit-file="${escapeHtml(entry.file)}">Edit record</button>
          <button type="button" data-duplicate-file="${escapeHtml(entry.file)}">Duplicate</button>
          <button type="button" data-delete-file="${escapeHtml(entry.file)}">Delete</button>
        </div>
        <section class="archive-reader" data-entry-reader="${escapeHtml(entry.file)}" hidden aria-label="Complete record for ${escapeHtml(entry.title)}">
          ${images ? `<div class="reader-gallery">${images}</div>` : ""}
          <div class="reader-grid">
            <div class="reader-section"><span>Objective</span><p class="entry-prose">${escapeHtml(entry.objective || "Not recorded.")}</p></div>
            <div class="reader-section"><span>Apparatus</span><p class="entry-prose">${escapeHtml(entry.apparatus || "Not recorded.")}</p></div>
            <div class="reader-section"><span>Observations</span><p class="entry-prose">${escapeHtml(entry.observations || "Not recorded.")}</p></div>
            <div class="reader-section"><span>Next test</span><p class="entry-prose">${escapeHtml(entry.next || "Not recorded.")}</p></div>
          </div>
          ${measurements ? `<dl class="reader-measurements"><div class="measurement-heading">Measurements</div>${measurements}</dl>` : ""}
        </section>
      </article>
    `;
    }).join("")
    : '<p class="empty-state">No records match this field condition.</p>';
}

function blankEntry() {
  return {
    number: app.state.nextNumber,
    date: today(),
    status: "draft",
    visibility: "private",
    title: "",
    summary: "",
    tags: [],
    images: [],
    objective: "",
    apparatus: "",
    observations: "",
    next: "",
    measurements: [{ label: "Primary variable", value: "" }, { label: "Controlled variables", value: "" }],
  };
}

function setField(name, value) {
  const field = form.elements.namedItem(name);
  if (field) field.value = value ?? "";
}

function openEditor(entry = blankEntry(), file = null, duplicate = false) {
  app.currentFile = duplicate ? null : file;
  const draft = structuredClone(entry);
  if (duplicate) {
    draft.number = app.state.nextNumber;
    draft.title = `${draft.title} — Replication`;
    draft.status = "draft";
    draft.visibility = "private";
    draft.date = today();
  }
  ["number", "date", "status", "visibility", "title", "summary", "objective", "apparatus", "observations", "next"].forEach((name) => setField(name, draft[name]));
  setField("tags", (draft.tags || []).join(", "));
  app.images = structuredClone(draft.images || []);
  app.measurements = structuredClone(draft.measurements || []);
  renderImages();
  renderMeasurements();
  $("[data-delete-entry]").hidden = !app.currentFile;
  $("[data-editor-mode]").textContent = duplicate ? "Replication record" : app.currentFile ? `Editing ${formatNumber(draft.number)}` : "New experimental record";
  updatePreview();
  showView("editor");
}

async function editEntry(file, duplicate = false) {
  try {
    const response = await api(`/api/entry?file=${encodeURIComponent(file)}`);
    openEditor(response.entry, response.file, duplicate);
  } catch (error) {
    toast(error.message, "error");
  }
}

function collectEntry() {
  const value = (name) => String(form.elements.namedItem(name)?.value || "").trim();
  return {
    number: Number(value("number")) || 0,
    date: value("date"),
    status: value("status"),
    visibility: value("visibility"),
    title: value("title"),
    summary: value("summary"),
    tags: value("tags").split(",").map((tag) => tag.trim()).filter(Boolean),
    images: app.images.map(({ src = "", alt = "", caption = "", uploadId }) => ({ src, alt, caption, ...(uploadId ? { uploadId } : {}) })).filter((image) => image.src || image.uploadId),
    objective: value("objective"),
    apparatus: value("apparatus"),
    observations: value("observations"),
    next: value("next"),
    measurements: app.measurements.map(({ label = "", value = "" }) => ({ label: label.trim(), value: value.trim() })).filter((item) => item.label || item.value),
  };
}

function cleanPreview(entry) {
  return { ...entry, images: entry.images.map(({ uploadId, ...image }) => image) };
}

function updatePreview() {
  const entry = collectEntry();
  const json = JSON.stringify(cleanPreview(entry), null, 2);
  $("[data-json-preview]").textContent = json;
  $("[data-json-lines]").textContent = `${json.split("\n").length} lines`;
  $("[data-editor-title]").textContent = entry.title || "Untitled Experiment";
  setSaveState("Unsaved field changes");
}

function renderImages() {
  const list = $("[data-image-list]");
  list.innerHTML = app.images.length ? app.images.map((image, index) => `
    <article class="repeat-item image-item" data-image-index="${index}">
      <label class="image-source"><span>Image file</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" data-image-file /><small>${escapeHtml(image.src || image.fileName || "Select an experiment image")}</small></label>
      <label><span>Alternative text</span><input type="text" data-image-field="alt" value="${escapeHtml(image.alt)}" placeholder="Describe what is visible" /></label>
      <label><span>Figure caption</span><input type="text" data-image-field="caption" value="${escapeHtml(image.caption)}" placeholder="Apparatus geometry / test condition" /></label>
      <div class="item-actions"><small>${image.uploadId ? "New file ready to copy" : image.src ? "Stored in assets" : "No file selected"}</small><button class="remove-command" type="button" data-remove-image="${index}">Remove</button></div>
    </article>
  `).join("") : '<p class="empty-state">No visual evidence attached.</p>';
}

function renderMeasurements() {
  const list = $("[data-measurement-list]");
  list.innerHTML = app.measurements.length ? app.measurements.map((item, index) => `
    <article class="repeat-item" data-measurement-index="${index}">
      <label><span>Label</span><input type="text" data-measurement-field="label" value="${escapeHtml(item.label)}" placeholder="Primary variable" /></label>
      <label><span>Value</span><input type="text" data-measurement-field="value" value="${escapeHtml(item.value)}" placeholder="Coil separation" /></label>
      <button class="remove-command" type="button" data-remove-measurement="${index}">Remove</button>
    </article>
  `).join("") : '<p class="empty-state">No measurement fields defined.</p>';
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected image"));
    reader.readAsDataURL(file);
  });
}

async function saveEntry() {
  if (!form.reportValidity()) return;
  const entry = collectEntry();
  const uploads = app.images.filter((image) => image.uploadId && image.data).map((image) => ({ id: image.uploadId, name: image.fileName, data: image.data }));
  setSaveState("Writing experimental record...");
  try {
    const response = await api("/api/save", { method: "POST", body: JSON.stringify({ file: app.currentFile, entry, uploads }) });
    app.currentFile = response.file;
    app.images = structuredClone(response.entry.images || []);
    $("[data-delete-entry]").hidden = false;
    $("[data-editor-mode]").textContent = `Editing ${formatNumber(response.entry.number)}`;
    renderImages();
    await loadState();
    updatePreview();
    setSaveState("Record synchronized to Desktop");
    toast(`${formatNumber(response.entry.number)} saved. Manifest regenerated.`);
  } catch (error) {
    setSaveState("Record not saved");
    toast(error.message, "error");
  }
}

function requestDelete(file = app.currentFile) {
  if (!file) return;
  app.pendingDelete = file;
  $("[data-confirm-dialog]").showModal();
}

async function confirmDelete() {
  try {
    await api("/api/delete", { method: "POST", body: JSON.stringify({ file: app.pendingDelete }) });
    $("[data-confirm-dialog]").close();
    toast("Record removed. Manifest regenerated.");
    app.currentFile = null;
    await loadState();
    showView("archive");
  } catch (error) {
    toast(error.message, "error");
  }
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(cleanPreview(collectEntry()), null, 2));
    toast("JSON structure copied to the clipboard.");
  } catch {
    toast("Clipboard access was unavailable.", "error");
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.matches("[data-view-button]")) showView(target.dataset.viewButton);
  if (target.matches("[data-new-entry]")) openEditor();
  if (target.matches("[data-edit-file]")) editEntry(target.dataset.editFile);
  if (target.matches("[data-duplicate-file]")) editEntry(target.dataset.duplicateFile, true);
  if (target.matches("[data-delete-file]")) requestDelete(target.dataset.deleteFile);
  if (target.matches("[data-toggle-entry]")) {
    const reader = document.querySelector(`[data-entry-reader="${CSS.escape(target.dataset.toggleEntry)}"]`);
    const isOpen = !reader.hidden;
    reader.hidden = isOpen;
    target.setAttribute("aria-expanded", String(!isOpen));
    target.textContent = isOpen ? "Read full entry" : "Close full entry";
  }
  if (target.matches("[data-delete-entry]")) requestDelete();
  if (target.matches("[data-save-entry]")) saveEntry();
  if (target.matches("[data-copy-json]")) copyJson();
  if (target.matches("[data-add-image]")) { app.images.push({ src: "", alt: "", caption: "" }); renderImages(); updatePreview(); }
  if (target.matches("[data-remove-image]")) { app.images.splice(Number(target.dataset.removeImage), 1); renderImages(); updatePreview(); }
  if (target.matches("[data-add-measurement]")) { app.measurements.push({ label: "", value: "" }); renderMeasurements(); updatePreview(); }
  if (target.matches("[data-remove-measurement]")) { app.measurements.splice(Number(target.dataset.removeMeasurement), 1); renderMeasurements(); updatePreview(); }
  if (target.matches("[data-cancel-delete]")) $("[data-confirm-dialog]").close();
  if (target.matches("[data-confirm-delete]")) confirmDelete();
  if (target.matches("[data-menu]")) document.body.classList.toggle("menu-open");
  if (target.matches("[data-open-folder]")) api("/api/open-folder", { method: "POST", body: "{}" }).catch((error) => toast(error.message, "error"));
});

form.addEventListener("input", updatePreview);
form.addEventListener("submit", (event) => event.preventDefault());
$("[data-search]").addEventListener("input", renderArchive);
$("[data-visibility-filter]").addEventListener("change", renderArchive);

$("[data-image-list]").addEventListener("input", (event) => {
  const item = event.target.closest("[data-image-index]");
  const field = event.target.dataset.imageField;
  if (item && field) app.images[Number(item.dataset.imageIndex)][field] = event.target.value;
  updatePreview();
});
$("[data-image-list]").addEventListener("change", async (event) => {
  if (!event.target.matches("[data-image-file]")) return;
  const file = event.target.files[0];
  if (!file) return;
  const index = Number(event.target.closest("[data-image-index]").dataset.imageIndex);
  try {
    app.images[index] = { ...app.images[index], src: `assets/${file.name}`, fileName: file.name, uploadId: crypto.randomUUID(), data: await readFile(file) };
    renderImages();
    updatePreview();
  } catch (error) { toast(error.message, "error"); }
});
$("[data-measurement-list]").addEventListener("input", (event) => {
  const item = event.target.closest("[data-measurement-index]");
  const field = event.target.dataset.measurementField;
  if (item && field) app.measurements[Number(item.dataset.measurementIndex)][field] = event.target.value;
  updatePreview();
});

setInterval(() => { $("[data-clock]").textContent = new Date().toLocaleTimeString([], { hour12: false }); }, 1000);
loadState().catch((error) => toast(error.message, "error"));
