const state = { records: [] };
const search = document.querySelector("#search");
const category = document.querySelector("#category");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const message = document.querySelector("#state");

function render() {
  const query = search.value.trim().toLowerCase();
  const selectedCategory = category.value;
  const selectedStatus = status.value;
  const records = state.records.filter((record) => {
    const haystack = [record.title, record.authority, ...(record.categories || [])].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (!selectedCategory || record.categories?.includes(selectedCategory))
      && (!selectedStatus || record.status === selectedStatus);
  });

  message.textContent = records.length ? `${records.length} tender${records.length === 1 ? "" : "s"} found` : "No matching tenders found.";
  results.innerHTML = records.map((record) => `
    <article class="card">
      <h2><a href="${record.sourceUrl}" target="_blank" rel="noreferrer">${escapeHtml(record.title)}</a></h2>
      <p class="meta">${escapeHtml(record.authority)} · Closing: ${escapeHtml(record.closingAt || "Not published")}</p>
      <div>${(record.categories || []).map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("")}</div>
    </article>`).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

for (const control of [search, category, status]) control.addEventListener("input", render);

try {
  const response = await fetch("./data/generated/tenders.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  state.records = data.records || [];
  [...new Set(state.records.flatMap((record) => record.categories || []))].sort()
    .forEach((item) => category.insertAdjacentHTML("beforeend", `<option value="${item}">${item}</option>`));
  render();
} catch (error) {
  message.textContent = "Tender data is temporarily unavailable.";
  console.error(error);
}
