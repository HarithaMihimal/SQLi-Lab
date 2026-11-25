const LAB_CONFIG = {
  "auth-bypass": {
    fields: [
      { name: "username", label: "Username", type: "text", placeholder: "admin" },
      { name: "password", label: "Password", type: "text", placeholder: "admin123" },
    ],
    vulnerable: {
      endpoint: "/api/labs/auth-bypass/vulnerable",
      method: "POST",
      payload: { username: "admin' OR '1'='1' -- ", password: "anything" },
      hint: "Try a classic login bypass payload in the username field.",
      notes: [
        "The vulnerable query concatenates user input directly into SQL.",
        "The payload changes the WHERE clause logic so it returns rows without a valid password.",
        "Use this only in the local lab environment.",
      ],
    },
    secure: {
      endpoint: "/api/labs/auth-bypass/secure",
      method: "POST",
      payload: { username: "admin", password: "admin123" },
      hint: "Use valid credentials. Injection payloads should fail because input is parameterized.",
      notes: [
        "The secure version uses a parameterized query for user lookup.",
        "Passwords are stored as bcrypt hashes and verified with bcrypt.compare.",
        "Input is treated as data, not executable SQL.",
      ],
    },
  },
  search: {
    fields: [
      { name: "q", label: "Search term", type: "text", placeholder: "alice" },
    ],
    vulnerable: {
      endpoint: "/api/labs/search/vulnerable",
      method: "GET",
      payload: {
        q: "' UNION SELECT u.id, u.username, u.password, u.role, p.email, p.secret_note FROM users u JOIN profiles p ON u.id = p.user_id -- ",
      },
      hint: "Try a UNION-based payload to expose data from other columns/tables.",
      notes: [
        "The vulnerable search endpoint interpolates the search term into a LIKE clause.",
        "A UNION payload can append attacker-selected rows if column counts/types align.",
        "The response includes the executed query so students can inspect what happened.",
      ],
    },
    secure: {
      endpoint: "/api/labs/search/secure",
      method: "GET",
      payload: { q: "alice" },
      hint: "The secure endpoint treats the search term as a bound parameter.",
      notes: [
        "The query shape is fixed; user input cannot add a UNION clause.",
        "Input length is constrained before querying.",
        "Only intended public profile fields are returned.",
      ],
    },
  },
  "profile-lookup": {
    fields: [
      { name: "id", label: "User ID", type: "text", placeholder: "1" },
    ],
    vulnerable: {
      endpoint: "/api/labs/profile/vulnerable",
      method: "GET",
      payload: { id: "1 OR 1=1" },
      hint: "Try manipulating the ID parameter to change query logic.",
      notes: [
        "The vulnerable endpoint concatenates the ID directly into SQL.",
        "An attacker can alter the WHERE clause and retrieve more rows than intended.",
        "Sensitive fields like secret_note are exposed here for teaching purposes.",
      ],
    },
    secure: {
      endpoint: "/api/labs/profile/secure",
      method: "GET",
      payload: { id: "1" },
      hint: "Invalid IDs are rejected before the query runs.",
      notes: [
        "The secure endpoint validates that ID is a positive integer.",
        "The query uses a parameterized placeholder for the ID.",
        "Sensitive fields are not returned in the secure response.",
      ],
    },
  },
};

const state = {
  labs: [],
  selectedLabId: "auth-bypass",
  mode: "vulnerable",
};

const labListEl = document.getElementById("labList");
const labTitleEl = document.getElementById("labTitle");
const labSummaryEl = document.getElementById("labSummary");
const labTagEl = document.getElementById("labTag");
const endpointLabelEl = document.getElementById("endpointLabel");
const labFormEl = document.getElementById("labForm");
const payloadHintEl = document.getElementById("payloadHint");
const learningNotesEl = document.getElementById("learningNotes");
const queryOutputEl = document.getElementById("queryOutput");
const responseOutputEl = document.getElementById("responseOutput");
const runBtn = document.getElementById("runBtn");
const payloadBtn = document.getElementById("payloadBtn");

function getSelectedLab() {
  return state.labs.find((lab) => lab.id === state.selectedLabId) || state.labs[0];
}

function getModeConfig(labId) {
  return LAB_CONFIG[labId][state.mode];
}

function renderLabList() {
  labListEl.innerHTML = "";
  state.labs.forEach((lab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `lab-btn ${lab.id === state.selectedLabId ? "active" : ""}`;
    button.innerHTML = `<strong>${lab.title}</strong><span>${lab.summary}</span>`;
    button.addEventListener("click", () => {
      state.selectedLabId = lab.id;
      render();
    });
    labListEl.appendChild(button);
  });
}

function renderModeButtons() {
  document.querySelectorAll(".mode-btn").forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("active", active);
  });
}

function renderForm() {
  const lab = getSelectedLab();
  const config = LAB_CONFIG[lab.id];
  const modeConfig = config[state.mode];
  labFormEl.innerHTML = "";

  config.fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "field";

    const label = document.createElement("label");
    label.setAttribute("for", field.name);
    label.textContent = field.label;

    const input = document.createElement("input");
    input.id = field.name;
    input.name = field.name;
    input.type = field.type;
    input.placeholder = field.placeholder;
    input.value = modeConfig.payload[field.name] ?? "";
    input.autocomplete = "off";

    wrapper.append(label, input);
    labFormEl.appendChild(wrapper);
  });
}

function renderNotes() {
  const lab = getSelectedLab();
  const modeConfig = getModeConfig(lab.id);
  learningNotesEl.innerHTML = "";
  const ul = document.createElement("ul");
  modeConfig.notes.forEach((note) => {
    const li = document.createElement("li");
    li.textContent = note;
    ul.appendChild(li);
  });
  learningNotesEl.appendChild(ul);
  payloadHintEl.textContent = modeConfig.hint;
  endpointLabelEl.textContent = `${modeConfig.method} ${modeConfig.endpoint}`;
}

function render() {
  const lab = getSelectedLab();
  if (!lab) return;
  labTagEl.textContent = state.mode === "vulnerable" ? "Vulnerable Mode" : "Secure Mode";
  labTitleEl.textContent = lab.title;
  labSummaryEl.textContent = lab.summary;
  renderLabList();
  renderModeButtons();
  renderForm();
  renderNotes();
}

function setOutput(queryText, responseText) {
  queryOutputEl.textContent = queryText;
  responseOutputEl.textContent = responseText;
}

function collectFormData() {
  const formData = new FormData(labFormEl);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = String(value);
  }
  return data;
}

async function runLab(event) {
  event.preventDefault();
  const lab = getSelectedLab();
  const modeConfig = getModeConfig(lab.id);
  const data = collectFormData();

  runBtn.disabled = true;
  runBtn.textContent = "Running...";
  setOutput("Running request...", "Waiting for response...");

  try {
    let response;
    if (modeConfig.method === "GET") {
      const params = new URLSearchParams(data);
      response = await fetch(`${modeConfig.endpoint}?${params.toString()}`);
    } else {
      response = await fetch(modeConfig.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }

    const body = await response.json();
    const queryText = body.executedQuery
      ? body.executedQuery
      : JSON.stringify(
          {
            queryTemplate: body.queryTemplate,
            parameters: body.parameters,
          },
          null,
          2
        );
    setOutput(queryText || "No query details returned.", JSON.stringify(body, null, 2));
  } catch (error) {
    setOutput("Request failed.", JSON.stringify({ error: error.message }, null, 2));
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = "Run Request";
  }
}

function applySamplePayload() {
  const lab = getSelectedLab();
  const modeConfig = getModeConfig(lab.id);
  LAB_CONFIG[lab.id].fields.forEach((field) => {
    const input = labFormEl.elements.namedItem(field.name);
    if (input) {
      input.value = modeConfig.payload[field.name] ?? "";
    }
  });
  setOutput(
    "Sample payload loaded. Click Run Request to execute it.",
    "Response data will appear here."
  );
}

async function loadLabs() {
  try {
    const response = await fetch("/api/labs");
    const body = await response.json();
    state.labs = body.labs || [];
    if (!state.labs.find((lab) => lab.id === state.selectedLabId) && state.labs.length > 0) {
      state.selectedLabId = state.labs[0].id;
    }
    render();
  } catch (error) {
    labListEl.innerHTML = `<p class="muted">Failed to load labs. Ensure the backend is running.</p>`;
    setOutput("Failed to load labs.", JSON.stringify({ error: error.message }, null, 2));
  }
}

document.querySelectorAll(".mode-btn").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    render();
    setOutput("Mode changed. Run a request to see results.", "Response data will appear here.");
  });
});

labFormEl.addEventListener("submit", runLab);
payloadBtn.addEventListener("click", applySamplePayload);

loadLabs();
