const form = document.getElementById("incident-form");
const submitBtn = document.getElementById("submit");
const titleInput = document.getElementById("title");
const descInput = document.getElementById("description");
const result = document.getElementById("result");

let pollTimer = null;

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    descInput.value = chip.textContent;
    descInput.focus();
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const description = descInput.value.trim();
  if (!description) return;
  submitBtn.disabled = true;
  submitBtn.textContent = "Investigating...";

  try {
    const res = await fetch("/api/investigate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: titleInput.value.trim(), description }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "request failed");
    result.classList.remove("hidden");
    startPolling(data.incidentId);
  } catch (err) {
    alert("Failed to start investigation: " + err.message);
    resetButton();
  }
});

function startPolling(incidentId) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => poll(incidentId), 1200);
  poll(incidentId);
}

async function poll(incidentId) {
  const res = await fetch(`/api/incident?id=${encodeURIComponent(incidentId)}`);
  if (!res.ok) return;
  const { incident } = await res.json();
  render(incident);
  if (incident.status === "resolved" || incident.status === "error") {
    clearInterval(pollTimer);
    resetButton();
  }
}

function resetButton() {
  submitBtn.disabled = false;
  submitBtn.textContent = "Investigate";
}

function setText(id, text) {
  document.getElementById(id).textContent = text ?? "";
}

function show(id) {
  document.getElementById(id).classList.remove("hidden");
}

function render(incident) {
  setText("incident-title", incident.title);
  const badge = document.getElementById("status-badge");
  badge.textContent = incident.status;
  badge.className = "badge " + incident.status;

  const timeline = document.getElementById("timeline");
  timeline.innerHTML = "";
  for (const p of incident.progress) {
    const li = document.createElement("li");
    const time = new Date(p.at).toLocaleTimeString();
    li.innerHTML = `<span class="dot">&#9679;</span><span class="t">${time}</span><span>${escapeHtml(p.message)}</span>`;
    timeline.appendChild(li);
  }

  if (incident.plan) {
    show("plan-block");
    setText("plan-summary", incident.plan.summary);
    const steps = document.getElementById("plan-steps");
    steps.innerHTML = "";
    for (const s of incident.plan.steps) {
      const li = document.createElement("li");
      li.textContent = s;
      steps.appendChild(li);
    }
  }

  if (incident.evidence) {
    show("evidence-block");
    setText("ev-logs", incident.evidence.logs);
    setText("ev-metrics", incident.evidence.metrics);
    setText("ev-deploys", incident.evidence.deployments);
  }

  if (incident.similar && incident.similar.length > 0) {
    show("similar-block");
    const list = document.getElementById("similar-list");
    list.innerHTML = "";
    for (const s of incident.similar) {
      const li = document.createElement("li");
      li.textContent = `${s.title} — ${s.rootCause} (similarity ${s.score.toFixed(2)})`;
      list.appendChild(li);
    }
  }

  if (incident.rca) {
    show("rca-block");
    setText("rca-root", incident.rca.rootCause);
    setText("rca-evidence", incident.rca.evidence);
    setText("rca-action", incident.rca.recommendedAction);
    setText("rca-confidence", `${Math.round(incident.rca.confidence * 100)}%`);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
