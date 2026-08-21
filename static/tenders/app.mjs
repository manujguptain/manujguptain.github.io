const state = { records: [], sourceStatus: null };
const search = document.querySelector("#search");
const category = document.querySelector("#category");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const message = document.querySelector("#state");
const health = document.querySelector("#health");

function render() {
  const query = search.value.trim().toLowerCase();
  const selectedCategory = category.value;
  const selectedStatus = status.value;
  const records = state.records
    .filter((record) => {
      const haystack = [record.title, record.authority, ...(record.categories || [])].join(" ").toLowerCase();
      return (!query || haystack.includes(query))
        && (!selectedCategory || record.categories?.includes(selectedCategory))
        && (!selectedStatus || record.status === selectedStatus);
    })
    .sort((a, b) => String(a.closingAt || "9999").localeCompare(String(b.closingAt || "9999")));

  message.textContent = records.length ? `${records.length} tender${records.length === 1 ? "" : "s"} found` : "No matching tenders found.";
  results.innerHTML = records.map((record) => `
    <article class="card">
      <h2><a href="${safeUrl(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.title)}</a></h2>
      <p class="meta">${escapeHtml(record.authority)} · Closing: ${escapeHtml(record.closingAt || "Not published")}</p>
      <div>${(record.categories || []).map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("")}</div>
      <p><a href="${safeUrl(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open official source →</a></p>
    </article>`).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function showHealth() {
  if (!state.sourceStatus || state.sourceStatus.status !== "stale") return;
  health.hidden = false;
  health.textContent = "The official source was temporarily unavailable during the last check. Existing results are preserved; verify every deadline on the official source.";
}

for (const control of [search, category, status]) control.addEventListener("input", render);

try {
  const [dataResponse, statusResponse] = await Promise.all([
    fetch("./data/generated/tenders.json"),
    fetch("./data/generated/source-status.json").catch(() => null)
  ]);
  if (!dataResponse.ok) throw new Error(`HTTP ${dataResponse.status}`);
  const data = await dataResponse.json();
  state.records = data.records || [];
  if (statusResponse?.ok) state.sourceStatus = await statusResponse.json();
  [...new Set(state.records.flatMap((record) => record.categories || []))].sort()
    .forEach((item) => category.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`));
  showHealth();
  render();
} catch (error) {
  message.textContent = "Tender data is temporarily unavailable.";
  console.error(error);
}
