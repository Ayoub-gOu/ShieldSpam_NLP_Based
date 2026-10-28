// Runs inside Gmail. Finds the open email(s), asks the API, shows a banner above each message.
// It only shows a warning: it never moves, hides or deletes an email.

const BANNER_CLASS = "sf-banner";
const MAX_MESSAGES = 5;      // max messages checked in one conversation
const MAX_CHARS = 50000;     // max text sent per message
const cache = new Map();     // hash of the email -> API result

// Gmail uses obfuscated class names that can change. If the banner never appears, check these selectors.
const SUBJECT_SELECTOR = "h2.hP";
const BODY_SELECTORS = ["div.a3s.aiL", "div.a3s"];

function hashText(s) {
  let h = 5381;
  const t = s.slice(0, 3000);
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return h + ":" + s.length;
}

function getSubject() {
  const el = document.querySelector(SUBJECT_SELECTOR);
  if (el && el.innerText.trim()) return el.innerText.trim();
  return document.title.split(" - ")[0] || ""; // fallback: tab title "Subject - you@gmail.com - Gmail"
}

function getBodies() {
  for (const sel of BODY_SELECTORS) {
    const els = document.querySelectorAll(sel);
    if (els.length) return Array.from(els);
  }
  return [];
}

function askApi(subject, message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "predict", subject, message }, (response) => {
        if (chrome.runtime.lastError || !response || !response.ok) resolve({ error: true });
        else resolve(response.data);
      });
    } catch (e) {
      resolve({ error: true }); // extension was reloaded: refresh the Gmail tab
    }
  });
}

function describe(result) {
  if (result.error) return { text: "API not reachable (is the server running?)", kind: "warn" };
  if (result.probability === null) return { text: "nothing to check", kind: "warn" };
  if (result.low_confidence) return { text: "not sure (language or style the model does not know)", kind: "warn" };
  const pct = Math.round(result.probability * 100);
  return result.is_spam
    ? { text: `possible spam (${pct}%)`, kind: "spam" }
    : { text: `looks OK (${pct}% spam score)`, kind: "ok" };
}

const COLORS = {
  spam: ["#fde8e8", "#9b1c1c"],
  ok: ["#e6f4ea", "#1e6b34"],
  warn: ["#fff4d6", "#7a5200"],
};

function render(bodyEl, result) {
  const prev = bodyEl.previousElementSibling;
  if (prev && prev.classList.contains(BANNER_CLASS)) prev.remove();

  const { text, kind } = describe(result);
  const banner = document.createElement("div");
  banner.className = BANNER_CLASS;
  banner.textContent = "Spam filter: " + text;
  Object.assign(banner.style, {
    background: COLORS[kind][0],
    color: COLORS[kind][1],
    padding: "6px 10px",
    margin: "6px 0",
    borderRadius: "4px",
    fontSize: "13px",
    fontFamily: "Arial, sans-serif",
  });
  bodyEl.parentElement.insertBefore(banner, bodyEl);
}

async function check() {
  const subject = getSubject();
  for (const bodyEl of getBodies().slice(0, MAX_MESSAGES)) {
    const message = (bodyEl.innerText || "").slice(0, MAX_CHARS);
    if (!message.trim()) continue; // not loaded yet

    const h = hashText(subject + "|" + message);
    const prev = bodyEl.previousElementSibling;
    const hasBanner = prev && prev.classList.contains(BANNER_CLASS);

    if (cache.has(h)) {
      if (!hasBanner) render(bodyEl, cache.get(h)); // Gmail removed our banner: put it back
      continue;
    }
    if (bodyEl.dataset.sfPending === h) continue; // already asked (or failed): wait until the email changes

    bodyEl.dataset.sfPending = h;
    const result = await askApi(subject, message);
    if (!result.error) {
      cache.set(h, result);
      if (cache.size > 200) cache.delete(cache.keys().next().value);
    }
    render(bodyEl, result);
  }
}

// Gmail never reloads the page, so we watch for changes and check again (with a short delay).
let timer = null, running = false, again = false;

async function safeCheck() {
  if (running) { again = true; return; }
  running = true;
  try { await check(); } finally {
    running = false;
    if (again) { again = false; schedule(); }
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(safeCheck, 500);
}

new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
schedule();
