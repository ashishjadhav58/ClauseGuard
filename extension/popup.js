// document.getElementById("analyzeBtn").addEventListener("click", async () => {
//   const status = document.getElementById("status");
//   const results = document.getElementById("results");
//   status.textContent = "Analyzing...";
//   results.innerHTML = "";

//   // Placeholder text for now - Phase 4 replaces this with real page text
//   const placeholderText = "This agreement automatically renews every 12 months unless cancelled 30 days in advance. We may share your data with third-party partners.";

//   try {
//     const response = await fetch("http://127.0.0.1:8000/analyze", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ text: placeholderText })
//     });
//     const data = await response.json();
//     status.textContent = `Found ${data.clauses.length} clause(s)`;

//     data.clauses.forEach(c => {
//       const div = document.createElement("div");
//       div.className = `clause ${c.risk_level}`;
//       div.innerHTML = `<strong>${c.category}</strong> (${c.risk_level})<br>${c.explanation}`;
//       results.appendChild(div);
//     });
//   } catch (err) {
//     status.textContent = "Error: " + err.message;
//   }
// });

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const results = document.getElementById("results");
  status.textContent = "Extracting page text...";
  results.innerHTML = "";

  try {
    // Get the currently active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send a message to that tab's content script, wait for its response
    const response = await chrome.tabs.sendMessage(tab.id, { action: "extractText" });
    const pageText = response.text;

    if (!pageText || pageText.length < 20) {
      status.textContent = "No meaningful text found on this page.";
      return;
    }

    status.textContent = "Analyzing...";

    const analyzeResponse = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pageText })
    });
    const data = await analyzeResponse.json();
    status.textContent = `Found ${data.clauses.length} clause(s)`;

    data.clauses.forEach(c => {
      const div = document.createElement("div");
      div.className = `clause ${c.risk_level}`;
      div.innerHTML = `<strong>${c.category}</strong> (${c.risk_level})<br>${c.explanation}`;
      results.appendChild(div);
    });
  } catch (err) {
    status.textContent = "Error: " + err.message;
    console.error(err);
  }
});