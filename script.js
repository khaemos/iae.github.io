const body = document.body;
const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelectorAll(".nav a");
const canvas = document.querySelector("[data-field-canvas]");
const ctx = canvas.getContext("2d");
const entryForm = document.querySelector("[data-entry-form]");
const entryList = document.querySelector("[data-entry-list]");
const filterButtons = document.querySelectorAll("[data-filter]");
const resetEntryButton = document.querySelector("[data-reset-entry]");
const exportEntriesButton = document.querySelector("[data-export-entries]");
const storageKey = "iae.researchLog.entries";

let activeFilter = "all";
let entries = loadEntries();

navToggle.addEventListener("click", () => {
  body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-label", body.classList.contains("nav-open") ? "Close navigation" : "Open navigation");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => body.classList.remove("nav-open"));
});

function defaultEntries() {
  return [
    {
      id: "seed-001",
      number: 1,
      title: "Coupled Coil Baseline",
      date: "2026-06-17",
      visibility: "public",
      tags: ["induction", "coupling", "baseline"],
      objective: "Establish a repeatable air-core induction bench and characterize spacing, alignment, and load response.",
      method: "Primary and secondary coils mounted on a fixed rail. Drive voltage, frequency, distance, and load resistance recorded at each interval.",
      observations: "Initial transfer response should be logged against coil separation and angular offset. Watch for heating, probe loading, and fixture movement.",
      next: "Create a controlled sweep table and compare unloaded versus loaded secondary behavior.",
    },
    {
      id: "seed-002",
      number: 2,
      title: "Electrostatic Potential Gradient Fixture",
      date: "2026-06-17",
      visibility: "private",
      tags: ["potential", "gradient", "dielectric"],
      objective: "Create a small fixture for observing how electrode geometry and dielectric placement alter measured potential.",
      method: "Parallel and asymmetric electrode arrangements with interchangeable dielectric samples. Record voltage map points under fixed supply conditions.",
      observations: "Private working note: define safe voltage limits, discharge procedure, and measurement spacing before live testing.",
      next: "Build the first electrode plate fixture and document insulation distances.",
    },
  ];
}

function loadEntries() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return defaultEntries();

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaultEntries();
  } catch {
    return defaultEntries();
  }
}

function saveEntries() {
  localStorage.setItem(storageKey, JSON.stringify(entries));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatExperimentNumber(number) {
  return `#${String(number).padStart(3, "0")}`;
}

function nextEntryNumber() {
  return entries.reduce((highest, entry) => Math.max(highest, Number(entry.number) || 0), 0) + 1;
}

function parseTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function renderEntries() {
  const visibleEntries = entries
    .filter((entry) => activeFilter === "all" || entry.visibility === activeFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.number - a.number);

  if (!visibleEntries.length) {
    entryList.innerHTML = '<p class="empty-log">No entries match this filter.</p>';
    return;
  }

  entryList.innerHTML = visibleEntries
    .map((entry) => {
      const tags = entry.tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("");
      const statusClass = entry.visibility === "private" ? " private" : "";

      return `
        <article class="log-entry" data-entry-id="${escapeHtml(entry.id)}">
          <span class="entry-number">${formatExperimentNumber(entry.number)}</span>
          <div>
            <div class="entry-meta">
              <span>${escapeHtml(entry.date)}</span>
              <span class="status-pill${statusClass}">${escapeHtml(entry.visibility)}</span>
            </div>
            <h3>${escapeHtml(entry.title)}</h3>
            <div class="tag-list">${tags}</div>
            <div class="entry-section">
              <strong>Objective</strong>
              <p>${escapeHtml(entry.objective)}</p>
            </div>
            <div class="entry-section">
              <strong>Apparatus and method</strong>
              <p>${escapeHtml(entry.method || "Not recorded.")}</p>
            </div>
            <div class="entry-section">
              <strong>Observations</strong>
              <p>${escapeHtml(entry.observations)}</p>
            </div>
            <div class="entry-section">
              <strong>Interpretation and next action</strong>
              <p>${escapeHtml(entry.next || "Not recorded.")}</p>
            </div>
            <div class="entry-actions">
              <button class="text-button" type="button" data-edit-entry="${escapeHtml(entry.id)}">Edit</button>
              <button class="text-button" type="button" data-delete-entry="${escapeHtml(entry.id)}">Delete</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function resetEntryForm() {
  entryForm.reset();
  entryForm.elements.id.value = "";
  entryForm.elements.date.value = new Date().toISOString().slice(0, 10);
  entryForm.elements.visibility.value = "private";
  entryForm.querySelector("[data-save-entry]").textContent = "Save Entry";
}

function fillEntryForm(entry) {
  entryForm.elements.id.value = entry.id;
  entryForm.elements.title.value = entry.title;
  entryForm.elements.date.value = entry.date;
  entryForm.elements.visibility.value = entry.visibility;
  entryForm.elements.tags.value = entry.tags.join(", ");
  entryForm.elements.objective.value = entry.objective;
  entryForm.elements.method.value = entry.method;
  entryForm.elements.observations.value = entry.observations;
  entryForm.elements.next.value = entry.next;
  entryForm.querySelector("[data-save-entry]").textContent = "Update Entry";
  entryForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(entryForm);
  const id = formData.get("id") || crypto.randomUUID();
  const existing = entries.find((entry) => entry.id === id);
  const entry = {
    id,
    number: existing ? existing.number : nextEntryNumber(),
    title: formData.get("title").trim(),
    date: formData.get("date"),
    visibility: formData.get("visibility"),
    tags: parseTags(formData.get("tags")),
    objective: formData.get("objective").trim(),
    method: formData.get("method").trim(),
    observations: formData.get("observations").trim(),
    next: formData.get("next").trim(),
  };

  entries = existing ? entries.map((item) => (item.id === id ? entry : item)) : [entry, ...entries];
  saveEntries();
  renderEntries();
  resetEntryForm();
});

entryList.addEventListener("click", (event) => {
  const editId = event.target.closest("[data-edit-entry]")?.dataset.editEntry;
  const deleteId = event.target.closest("[data-delete-entry]")?.dataset.deleteEntry;

  if (editId) {
    const entry = entries.find((item) => item.id === editId);
    if (entry) fillEntryForm(entry);
  }

  if (deleteId) {
    entries = entries.filter((entry) => entry.id !== deleteId);
    saveEntries();
    renderEntries();
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    renderEntries();
  });
});

resetEntryButton.addEventListener("click", resetEntryForm);

exportEntriesButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "iae-research-log.json";
  link.click();
  URL.revokeObjectURL(url);
});

const particles = Array.from({ length: 58 }, (_, index) => ({
  phase: index * 0.38,
  radius: 0.12 + (index % 9) * 0.018,
  speed: 0.002 + (index % 5) * 0.00035,
}));

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvas.offsetWidth * ratio);
  canvas.height = Math.floor(canvas.offsetHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawField(time) {
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(30, 125, 122, 0.22)");
  gradient.addColorStop(0.5, "rgba(198, 152, 53, 0.12)");
  gradient.addColorStop(1, "rgba(185, 76, 40, 0.18)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i += 1) {
    const y = (height / 18) * i + Math.sin(time * 0.0006 + i) * 14;
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 20) {
      const wave = Math.sin(x * 0.008 + i * 0.7 + time * 0.0008) * 22;
      if (x === -20) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.strokeStyle = i % 3 === 0 ? "rgba(185, 76, 40, 0.16)" : "rgba(16, 63, 66, 0.12)";
    ctx.stroke();
  }

  particles.forEach((particle) => {
    const orbit = time * particle.speed + particle.phase;
    const x = width * (0.5 + Math.cos(orbit) * particle.radius * 2.9);
    const y = height * (0.48 + Math.sin(orbit * 1.7) * particle.radius * 1.5);
    ctx.beginPath();
    ctx.arc(x, y, 2.1, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(17, 19, 21, 0.3)";
    ctx.fill();
  });

  requestAnimationFrame(drawField);
}

function setHeaderState() {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("scroll", setHeaderState, { passive: true });
resizeCanvas();
setHeaderState();
resetEntryForm();
saveEntries();
renderEntries();
requestAnimationFrame(drawField);
