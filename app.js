const DATA_DIR = "data/";
const PROGRESS_KEY = "prepdesk-progress-v1";
const THEME_KEY = "prepdesk-theme-v1";

let subjects = [];
let questionsBySubject = new Map();
let activeSubjectId = null;
let progress = loadProgress();
let visibleQuestionIds = [];
let shuffleOrder = null;

const el = (id) => document.getElementById(id);

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); }
  catch { return {}; }
}
function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  updateOverallProgress();
}
function statusFor(id) { return progress[id] || "unattempted"; }

async function init() {
  applySavedTheme();
  bindEvents();
  try {
    const response = await fetch(`${DATA_DIR}subjects.json`);
    if (!response.ok) throw new Error("Could not load data/subjects.json");
    subjects = await response.json();
    const loaded = await Promise.all(subjects.map(async (subject) => {
      const res = await fetch(`${DATA_DIR}${subject.file}`);
      if (!res.ok) throw new Error(`Could not load ${subject.file}`);
      return [subject.id, await res.json()];
    }));
    questionsBySubject = new Map(loaded);
    subjects.forEach(subject => {
      (questionsBySubject.get(subject.id) || []).forEach(q => {
        if (!progress[q.id]) progress[q.id] = "unattempted";
      });
    });
    renderSubjectNav();
    el("subject-count").textContent = `${subjects.length} subjects`;
    updateOverallProgress();
    selectSubject(subjects[0]?.id);
  } catch (error) {
    el("question-list").innerHTML = `<div class="loading-card">Unable to load questions. ${escapeHtml(error.message)}<br><br>On GitHub Pages this should work automatically. If testing locally, start a local web server instead of opening index.html directly.</div>`;
  }
}

function bindEvents() {
  el("search-input").addEventListener("input", renderQuestions);
  el("status-filter").addEventListener("change", renderQuestions);
  el("topic-filter").addEventListener("change", renderQuestions);
  el("shuffle-button").addEventListener("click", () => {
    const questions = getCurrentQuestions();
    shuffleOrder = [...questions.map(q => q.id)].sort(() => Math.random() - 0.5);
    renderQuestions();
    toast("Question order shuffled");
  });
  el("clear-filters").addEventListener("click", () => {
    el("search-input").value = "";
    el("status-filter").value = "all";
    el("topic-filter").value = "all";
    shuffleOrder = null;
    renderQuestions();
  });
  el("reset-button").addEventListener("click", resetCurrentSubject);
  el("export-button").addEventListener("click", exportProgress);
  el("import-input").addEventListener("change", importProgress);
  el("theme-toggle").addEventListener("click", toggleTheme);
}

function renderSubjectNav() {
  const nav = el("subject-nav");
  nav.innerHTML = "";
  subjects.forEach(subject => {
    const button = document.createElement("button");
    button.className = "subject-link";
    button.type = "button";
    button.dataset.subject = subject.id;
    button.innerHTML = `<span class="subject-icon">${escapeHtml(subject.short || subject.name.slice(0, 2).toUpperCase())}</span>
      <span class="subject-link-name">${escapeHtml(subject.name)}</span>
      <span class="subject-link-count">${(questionsBySubject.get(subject.id) || []).length}</span>`;
    button.addEventListener("click", () => selectSubject(subject.id));
    nav.appendChild(button);
  });
}

function selectSubject(id) {
  activeSubjectId = id;
  shuffleOrder = null;
  const subject = subjects.find(s => s.id === id);
  if (!subject) return;
  document.querySelectorAll(".subject-link").forEach(button => {
    button.classList.toggle("active", button.dataset.subject === id);
  });
  el("subject-eyebrow").textContent = subject.short || "SUBJECT";
  el("subject-title").textContent = subject.name;
  el("subject-description").textContent = subject.description || "";
  el("subject-total").textContent = (questionsBySubject.get(id) || []).length;
  el("search-input").value = "";
  el("status-filter").value = "all";
  updateTopicFilter();
  renderQuestions();
}

function getCurrentQuestions() {
  const questions = [...(questionsBySubject.get(activeSubjectId) || [])];
  if (!shuffleOrder) return questions;
  const order = new Map(shuffleOrder.map((id, i) => [id, i]));
  return questions.sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
}

function updateTopicFilter() {
  const select = el("topic-filter");
  const current = select.value;
  const topics = [...new Set((questionsBySubject.get(activeSubjectId) || []).map(q => q.topic).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">All topics</option>' + topics.map(topic => `<option value="${escapeAttr(topic)}">${escapeHtml(topic)}</option>`).join("");
  select.value = topics.includes(current) ? current : "all";
}

function renderQuestions() {
  const all = getCurrentQuestions();
  const search = el("search-input").value.trim().toLowerCase();
  const status = el("status-filter").value;
  const topic = el("topic-filter").value;
  const filtered = all.filter(q => {
    const searchable = [q.question, q.topic, q.answer, q.explanation, ...(q.options || [])].join(" ").toLowerCase();
    return (!search || searchable.includes(search)) &&
      (status === "all" || statusFor(q.id) === status) &&
      (topic === "all" || q.topic === topic);
  });
  visibleQuestionIds = filtered.map(q => q.id);
  el("question-list").innerHTML = filtered.map(renderQuestionCard).join("");
  el("empty-state").classList.toggle("hidden", filtered.length !== 0);
  el("question-list").classList.toggle("hidden", filtered.length === 0);
  el("visible-count").textContent = `Showing ${filtered.length} of ${all.length} questions`;
  updateSubjectStats();
}

function renderQuestionCard(q, index) {
  const status = statusFor(q.id);
  const options = Array.isArray(q.options) && q.options.length
    ? `<div class="question-options">${q.options.map((option, i) => `<div class="option"><span class="option-label">${String.fromCharCode(65 + i)}.</span>${escapeHtml(option)}</div>`).join("")}</div>`
    : "";
  const answer = q.answer || "No answer has been added yet.";
  const explanation = q.explanation ? `<p class="answer-label">Explanation</p><p class="explanation-content">${escapeHtml(q.explanation)}</p>` : "";
  const code = q.code ? `<pre class="code-block">${escapeHtml(q.code)}</pre>` : "";
  const answerHtml = `<div class="answer-panel" id="answer-${escapeAttr(q.id)}" hidden>
      <p class="answer-label">Answer</p><p class="answer-content">${escapeHtml(answer)}</p>${code}${explanation}
    </div>`;
  return `<article class="question-card status-${status}" data-question-id="${escapeAttr(q.id)}">
    <div class="question-meta">
      <span class="question-topic">${escapeHtml(q.topic || "General")} · ${escapeHtml(q.type || "Question")}</span>
      <span class="status-pill ${status}">${statusLabel(status)}</span>
    </div>
    <p class="question-text">${index + 1}. ${escapeHtml(q.question)}</p>
    ${options}
    <button class="answer-toggle" type="button" aria-expanded="false" aria-controls="answer-${escapeAttr(q.id)}" data-action="toggle-answer">
      <span>Reveal answer</span><span class="chevron">⌄</span>
    </button>
    ${answerHtml}
    <div class="mark-row">
      <span class="mark-label">MARK YOUR RESULT</span>
      <button type="button" class="mark-button wrong ${status === "wrong" ? "selected" : ""}" data-action="mark" data-status="wrong" data-id="${escapeAttr(q.id)}">✕ Wrong</button>
      <button type="button" class="mark-button correct ${status === "correct" ? "selected" : ""}" data-action="mark" data-status="correct" data-id="${escapeAttr(q.id)}">✓ Correct</button>
      <button type="button" class="mark-button unattempted ${status === "unattempted" ? "selected" : ""}" data-action="mark" data-status="unattempted" data-id="${escapeAttr(q.id)}">↺ Reset</button>
    </div>
  </article>`;
}

function statusLabel(status) {
  return ({ unattempted: "Unattempted", wrong: "Wrong", correct: "Correct" })[status] || "Unattempted";
}

el("question-list").addEventListener("click", event => {
  const toggle = event.target.closest('[data-action="toggle-answer"]');
  if (toggle) {
    const panel = document.getElementById(toggle.getAttribute("aria-controls"));
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector("span").textContent = open ? "Hide answer" : "Reveal answer";
    panel.hidden = !open;
    return;
  }
  const mark = event.target.closest('[data-action="mark"]');
  if (mark) {
    progress[mark.dataset.id] = mark.dataset.status;
    saveProgress();
    renderQuestions();
    toast(`Marked as ${statusLabel(mark.dataset.status).toLowerCase()}`);
  }
});

function updateSubjectStats() {
  const questions = questionsBySubject.get(activeSubjectId) || [];
  const counts = { unattempted: 0, wrong: 0, correct: 0 };
  questions.forEach(q => counts[statusFor(q.id)]++);
  el("count-unattempted").textContent = counts.unattempted;
  el("count-wrong").textContent = counts.wrong;
  el("count-correct").textContent = counts.correct;
}
function updateOverallProgress() {
  const all = [...questionsBySubject.values()].flat();
  const reviewed = all.filter(q => statusFor(q.id) !== "unattempted").length;
  const percent = all.length ? Math.round(reviewed / all.length * 100) : 0;
  el("overall-percent").textContent = `${percent}%`;
  el("overall-bar").style.width = `${percent}%`;
  el("overall-caption").textContent = `${reviewed} of ${all.length} questions reviewed`;
}

function resetCurrentSubject() {
  const subject = subjects.find(s => s.id === activeSubjectId);
  if (!subject || !confirm(`Reset all markings for ${subject.name}?`)) return;
  (questionsBySubject.get(activeSubjectId) || []).forEach(q => { progress[q.id] = "unattempted"; });
  saveProgress();
  renderQuestions();
  toast(`${subject.name} progress reset`);
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), progress }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "prepdesk-progress.json"; a.click();
  URL.revokeObjectURL(url);
  toast("Progress exported");
}

function importProgress(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = parsed.progress || parsed;
      const valid = {};
      Object.entries(incoming).forEach(([id, status]) => {
        if (["correct", "wrong", "unattempted"].includes(status)) valid[id] = status;
      });
      if (!confirm(`Import ${Object.keys(valid).length} question markings? This will replace existing markings for those questions.`)) return;
      progress = { ...progress, ...valid };
      saveProgress(); renderQuestions(); toast("Progress imported");
    } catch { alert("That file does not look like a valid PrepDesk progress export."); }
    finally { event.target.value = ""; }
  };
  reader.readAsText(file);
}

function applySavedTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  if (theme === "dark") document.body.classList.add("dark");
  el("theme-toggle").textContent = theme === "dark" ? "☀" : "☾";
}
function toggleTheme() {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  el("theme-toggle").textContent = dark ? "☀" : "☾";
}
let toastTimer;
function toast(message) {
  const node = el("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 1900);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function escapeAttr(value) { return escapeHtml(value); }

init();
