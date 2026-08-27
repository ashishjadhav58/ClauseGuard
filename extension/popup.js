function canAnalyzeUrl(url) {
  if (!url) {
    return false;
  }
  return /^https?:\/\//.test(url);
}

function restrictedPageMessage(url) {
  if (!url) {
    return "No webpage detected.";
  }

  if (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:")
  ) {
    return "This page cannot be analyzed. Open a regular webpage.";
  }

  if (
    url.startsWith("chrome-extension://") ||
    url.includes("chrome.google.com/webstore") ||
    url.includes("chromewebstore.google.com")
  ) {
    return "Chrome Web Store and extension pages cannot be analyzed.";
  }

  if (/\.pdf($|\?)/i.test(url)) {
    return "PDF pages cannot be analyzed in the browser viewer. Open the document as a normal webpage.";
  }

  return "This page cannot be analyzed.";
}

async function ensureContentScript(tabId) {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { action: "ping" });
    if (ping?.ok) {
      return;
    }
  } catch {
    // Content script is not in this tab yet.
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
}

async function sendTabMessage(tabId, payload) {
  await ensureContentScript(tabId);
  return chrome.tabs.sendMessage(tabId, payload);
}

async function extractTextFromTab(tab) {
  if (!tab || !tab.id) {
    throw new Error("Invalid tab.");
  }

  const response = await sendTabMessage(tab.id, { action: "extractText" });

  if (!response || typeof response.text !== "string") {
    throw new Error("Content script returned no text.");
  }

  return response.text;
}

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const results = document.getElementById("results");

  status.textContent = "Extracting page text...";
  results.innerHTML = "";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) {
      status.textContent = "No active tab found.";
      return;
    }

    if (!canAnalyzeUrl(tab.url)) {
      status.textContent = restrictedPageMessage(tab.url);
      return;
    }

    const pageText = await extractTextFromTab(tab);

    if (!pageText || pageText.length < 20) {
      status.textContent = "No meaningful text found on this page.";
      return;
    }

    status.textContent = "Analyzing...";

    const analyzeResponse = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: pageText,
      }),
    });

    if (!analyzeResponse.ok) {
      throw new Error(`Backend returned ${analyzeResponse.status}`);
    }

    const data = await analyzeResponse.json();
    const clauses = Array.isArray(data.clauses) ? data.clauses : [];

    status.textContent = `Found ${clauses.length} clause(s)`;

    clauses.forEach((clause) => {
      const div = document.createElement("div");
      div.className = `clause ${clause.risk_level}`;
      div.innerHTML = `
          <div class="severity ${clause.risk_level}">
            ${clause.risk_level}
          </div>

          <strong>
            ${clause.category}
          </strong>

          <br>

          ${clause.explanation}
        `;
      results.appendChild(div);
    });

    try {
      await sendTabMessage(tab.id, {
        action: "highlightClauses",
        clauses: clauses,
      });
    } catch (highlightError) {
      console.warn("Could not highlight clauses:", highlightError);
    }
  } catch (error) {
    console.error("ClauseGuard error:", error);

    const message = error?.message || String(error);

    if (
      message.includes("Receiving end does not exist") ||
      message.includes("Could not establish connection") ||
      message.includes("Cannot access contents of the url") ||
      message.includes("Cannot access a chrome://")
    ) {
      status.textContent =
        "Could not access this page. Use a normal http/https webpage (not chrome://, PDFs, or the Web Store), reload the extension, then try again.";
    } else {
      status.textContent = "Error: " + message;
    }
  }
});
