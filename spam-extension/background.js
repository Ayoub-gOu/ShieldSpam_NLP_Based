// Calls the API for the Gmail page (the page itself cannot call the local server directly).
const API_URL = "http://127.0.0.1:8000/predict";
const THRESHOLD = null; // null = use the server default; for example 0.88 for a stricter filter

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "predict") return;

  const body = { subject: msg.subject, message: msg.message };
  if (THRESHOLD !== null) body.threshold = THRESHOLD;

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((r) => {
      if (!r.ok) throw new Error("API error " + r.status);
      return r.json();
    })
    .then((data) => sendResponse({ ok: true, data }))
    .catch(() => sendResponse({ ok: false }));

  return true; // keeps the channel open for the async answer
});
