const API_URL = "http://127.0.0.1:8000/predict";

const resultBox = document.getElementById("result");
const verdict = document.getElementById("verdict");
const note = document.getElementById("note");

function show(cssClass, verdictText, noteText) {
  resultBox.className = cssClass;
  resultBox.style.display = "block";
  verdict.textContent = verdictText;
  note.textContent = noteText || "";
}

document.getElementById("check").addEventListener("click", async () => {
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value;

  show("warn", "Checking...");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message/*threshold=0.2*/ }),
    });
    if (!response.ok) throw new Error("API error " + response.status);
    const r = await response.json();

    if (r.probability === null) {
      show("warn", "Nothing to check", r.note);
    } else if (r.low_confidence) {
      show("warn", "Not sure (language or style the model does not know)", r.note);
    } else {
      const pct = Math.round(r.probability * 100);
      if (r.is_spam) show("spam", `Possible spam (${pct}%)`, r.note);
      else show("ok", `Looks OK (${pct}% spam score)`, r.note);
    }
  } catch (err) {
    show("warn", "Cannot reach the API", "Is the server running? (uv run uvicorn main:app --reload)");
  }
});
