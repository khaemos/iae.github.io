const body = document.body;
const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelectorAll(".nav a");
const canvas = document.querySelector("[data-field-canvas]");
const ctx = canvas.getContext("2d");
const entryList = document.querySelector("[data-entry-list]");
const entrySearch = document.querySelector("[data-entry-search]");
const entryCount = document.querySelector("[data-entry-count]");
const pagination = document.querySelector("[data-entry-pagination]");
const pageNumbers = document.querySelector("[data-page-numbers]");
const previousPageButton = document.querySelector("[data-page-previous]");
const nextPageButton = document.querySelector("[data-page-next]");
const imageViewer = document.querySelector("[data-image-viewer]");
const viewerImage = document.querySelector("[data-viewer-image]");
const viewerCaption = document.querySelector("[data-viewer-caption]");
const viewerClose = document.querySelector("[data-viewer-close]");
const viewerPrevious = document.querySelector("[data-viewer-previous]");
const viewerNext = document.querySelector("[data-viewer-next]");

const entriesPerPage = 3;
let allEntries = [];
let filteredEntries = [];
let currentPage = 1;
let activeImages = [];
let activeImageIndex = 0;

navToggle.addEventListener("click", () => {
  body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-label", body.classList.contains("nav-open") ? "Close navigation" : "Open navigation");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => body.classList.remove("nav-open"));
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatExperimentNumber(number) {
  return `#${String(number).padStart(3, "0")}`;
}

function normalizeImages(images = []) {
  return images.map((image) =>
    typeof image === "string"
      ? { src: image, alt: "Research apparatus image", caption: "Research apparatus" }
      : image
  );
}

function renderPagination() {
  const pageCount = Math.ceil(filteredEntries.length / entriesPerPage);
  pagination.hidden = pageCount <= 1;
  previousPageButton.disabled = currentPage === 1;
  nextPageButton.disabled = currentPage === pageCount;
  pageNumbers.innerHTML = Array.from({ length: pageCount }, (_, index) => {
    const page = index + 1;
    return `<button type="button" class="page-number" data-page="${page}" ${page === currentPage ? 'aria-current="page"' : ""} aria-label="Research log page ${page}">${page}</button>`;
  }).join("");
}

function renderEntries() {
  if (!filteredEntries.length) {
    entryList.innerHTML = `<p class="empty-log">${allEntries.length ? "No entries match this search." : "No public research entries have been published yet."}</p>`;
    entryCount.textContent = allEntries.length ? "0 matching entries" : "0 published entries";
    pagination.hidden = true;
    return;
  }

  const pageCount = Math.ceil(filteredEntries.length / entriesPerPage);
  currentPage = Math.min(currentPage, pageCount);
  const firstIndex = (currentPage - 1) * entriesPerPage;
  const visibleEntries = filteredEntries.slice(firstIndex, firstIndex + entriesPerPage);
  entryCount.textContent = `${firstIndex + 1}-${Math.min(firstIndex + entriesPerPage, filteredEntries.length)} of ${filteredEntries.length} ${filteredEntries.length === 1 ? "entry" : "entries"}`;

  entryList.innerHTML = visibleEntries
    .map((entry) => {
      const tags = (entry.tags || []).map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("");
      const measurements = (entry.measurements || [])
        .map((item) => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</li>`)
        .join("");
      const images = normalizeImages(entry.images);
      const gallery = images
        .map((image, imageIndex) => `
          <button class="entry-image-button" type="button" data-entry-number="${escapeHtml(entry.number)}" data-image-index="${imageIndex}" aria-label="View ${escapeHtml(image.alt || entry.title)}">
            <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || "Research apparatus image")}" loading="lazy" />
            <span>${escapeHtml(image.caption || `Figure ${imageIndex + 1}`)}</span>
          </button>
        `)
        .join("");

      return `
        <article class="log-entry">
          <div class="entry-number">${formatExperimentNumber(entry.number)}</div>
          <div class="entry-body">
            <div class="entry-meta">
              <span>${escapeHtml(entry.date)}</span>
              <span>${escapeHtml(entry.status || "published")}</span>
            </div>
            <h3>${escapeHtml(entry.title)}</h3>
            <p class="entry-summary">${escapeHtml(entry.summary)}</p>
            <div class="tag-list">${tags}</div>
            ${gallery ? `<div class="entry-gallery">${gallery}</div>` : ""}
            <div class="entry-grid">
              <div>
                <strong>Objective</strong>
                <p>${escapeHtml(entry.objective)}</p>
              </div>
              <div>
                <strong>Apparatus</strong>
                <p>${escapeHtml(entry.apparatus)}</p>
              </div>
              <div>
                <strong>Observations</strong>
                <p>${escapeHtml(entry.observations)}</p>
              </div>
              <div>
                <strong>Next test</strong>
                <p>${escapeHtml(entry.next)}</p>
              </div>
            </div>
            ${measurements ? `<ul class="measurement-list">${measurements}</ul>` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  renderPagination();
}

function filterEntries() {
  const query = entrySearch.value.trim().toLowerCase();
  filteredEntries = query
    ? allEntries.filter((entry) => {
        const searchable = [
          entry.number,
          entry.date,
          entry.title,
          entry.summary,
          entry.objective,
          entry.apparatus,
          entry.observations,
          entry.next,
          ...(entry.tags || []),
          ...(entry.measurements || []).flatMap((item) => [item.label, item.value]),
        ].join(" ").toLowerCase();
        return searchable.includes(query);
      })
    : [...allEntries];
  currentPage = 1;
  renderEntries();
}

function setPage(page) {
  const pageCount = Math.ceil(filteredEntries.length / entriesPerPage);
  currentPage = Math.max(1, Math.min(page, pageCount));
  renderEntries();
  document.querySelector("#log").scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateViewer() {
  const image = activeImages[activeImageIndex];
  viewerImage.src = image.src;
  viewerImage.alt = image.alt || "Research apparatus image";
  viewerCaption.textContent = `${image.caption || `Figure ${activeImageIndex + 1}`} / ${activeImageIndex + 1} of ${activeImages.length}`;
  viewerPrevious.disabled = activeImages.length < 2;
  viewerNext.disabled = activeImages.length < 2;
}

function openViewer(entryNumber, imageIndex) {
  const entry = allEntries.find((item) => String(item.number) === String(entryNumber));
  activeImages = normalizeImages(entry?.images);
  if (!activeImages.length) return;
  activeImageIndex = Number(imageIndex) || 0;
  updateViewer();
  imageViewer.showModal();
}

function moveViewer(direction) {
  activeImageIndex = (activeImageIndex + direction + activeImages.length) % activeImages.length;
  updateViewer();
}

async function loadResearchLog() {
  try {
    const manifestResponse = await fetch("research-log/manifest.json", { cache: "no-store" });
    if (!manifestResponse.ok) throw new Error("Manifest not available");
    const manifest = await manifestResponse.json();
    const entryResponses = await Promise.all(
      manifest.entries.map(async (path) => {
        const response = await fetch(`research-log/${path}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Entry not available: ${path}`);
        return response.json();
      })
    );
    allEntries = entryResponses
      .filter((entry) => entry.visibility !== "private")
      .sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.number) - Number(a.number));
    filteredEntries = [...allEntries];
    renderEntries();
  } catch (error) {
    entryList.innerHTML = `
      <p class="empty-log">
        Research entries could not be loaded. When testing locally, serve the folder
        with a small web server instead of opening the HTML file directly.
      </p>
    `;
  }
}

entrySearch.addEventListener("input", filterEntries);
entryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-image-index]");
  if (button) openViewer(button.dataset.entryNumber, button.dataset.imageIndex);
});
pageNumbers.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (button) setPage(Number(button.dataset.page));
});
previousPageButton.addEventListener("click", () => setPage(currentPage - 1));
nextPageButton.addEventListener("click", () => setPage(currentPage + 1));
viewerClose.addEventListener("click", () => imageViewer.close());
viewerPrevious.addEventListener("click", () => moveViewer(-1));
viewerNext.addEventListener("click", () => moveViewer(1));
imageViewer.addEventListener("click", (event) => {
  if (event.target === imageViewer) imageViewer.close();
});

const particles = Array.from({ length: 42 }, (_, index) => ({
  phase: index * 0.51,
  radius: 0.16 + (index % 7) * 0.021,
  speed: 0.0017 + (index % 5) * 0.00032,
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

  ctx.fillStyle = "#07090d";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(142, 170, 188, 0.1)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let i = 0; i < 12; i += 1) {
    const y = height * (0.18 + i * 0.065);
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 18) {
      const wave = Math.sin(x * 0.012 + i * 0.8 + time * 0.001) * (12 + i * 1.3);
      if (x === -20) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.strokeStyle = i % 2 === 0 ? "rgba(69, 167, 214, 0.22)" : "rgba(232, 184, 95, 0.18)";
    ctx.stroke();
  }

  particles.forEach((particle) => {
    const orbit = time * particle.speed + particle.phase;
    const x = width * (0.62 + Math.cos(orbit) * particle.radius);
    const y = height * (0.45 + Math.sin(orbit * 1.55) * particle.radius);
    ctx.beginPath();
    ctx.arc(x, y, 1.9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(236, 245, 255, 0.55)";
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
loadResearchLog();
requestAnimationFrame(drawField);
