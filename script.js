const body = document.body;
const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelectorAll(".nav a");
const canvas = document.querySelector("[data-field-canvas]");
const ctx = canvas.getContext("2d");
const entryList = document.querySelector("[data-entry-list]");

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

function renderEntries(entries) {
  if (!entries.length) {
    entryList.innerHTML = '<p class="empty-log">No public research entries have been published yet.</p>';
    return;
  }

  const sortedEntries = entries.sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.number) - Number(a.number));
  entryList.innerHTML = sortedEntries
    .map((entry) => {
      const tags = (entry.tags || []).map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("");
      const measurements = (entry.measurements || [])
        .map((item) => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</li>`)
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
    renderEntries(entryResponses.filter((entry) => entry.visibility !== "private"));
  } catch (error) {
    entryList.innerHTML = `
      <p class="empty-log">
        Research entries could not be loaded. When testing locally, serve the folder
        with a small web server instead of opening the HTML file directly.
      </p>
    `;
  }
}

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
