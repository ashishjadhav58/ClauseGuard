// content.js

function extractPageText() {
  // Clone body so we don't affect the live page
  const clone = document.body.cloneNode(true);

  // Remove noisy elements that aren't real content
  const removeSelectors = ["script", "style", "nav", "footer", "header", "noscript"];
  removeSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  let text = clone.innerText || clone.textContent || "";

  // Collapse excessive whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractText") {
    const text = extractPageText();
    sendResponse({ text });
  }
  // Returning true keeps the message channel open for async sendResponse
  return true;
});