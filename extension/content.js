if (window.__clauseGuardLoaded) {
  // Already injected into this page (declarative script or popup inject).
} else {
  window.__clauseGuardLoaded = true;

  console.log("ClauseGuard content script loaded");

  function extractPageText() {
    if (!document.body) {
      return "";
    }

    const clone = document.body.cloneNode(true);

    const removeSelectors = [
      "script",
      "style",
      "nav",
      "footer",
      "header",
      "noscript",
    ];

    removeSelectors.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((element) => {
        element.remove();
      });
    });

    const text = clone.innerText || clone.textContent || "";
    return text.replace(/\s+/g, " ").trim();
  }

  function highlightClauses(clauses) {
    document.querySelectorAll(".clauseguard-highlight").forEach((element) => {
      const parent = element.parentNode;
      if (parent) {
        parent.replaceChild(
          document.createTextNode(element.textContent),
          element
        );
        parent.normalize();
      }
    });

    if (!Array.isArray(clauses)) {
      return;
    }

    clauses.forEach((clause) => {
      if (!clause || !clause.clause_text) {
        return;
      }
      highlightText(clause.clause_text, clause.risk_level);
    });
  }

  function highlightText(searchText, riskLevel) {
    if (!searchText || searchText.length < 10) {
      return;
    }

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent || "";
      const index = text.indexOf(searchText);

      if (index === -1) {
        continue;
      }

      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + searchText.length);

      const span = document.createElement("span");
      span.className = `clauseguard-highlight clauseguard-${riskLevel}`;
      span.style.cssText = getHighlightStyle(riskLevel);

      try {
        range.surroundContents(span);
      } catch (error) {
        console.warn(
          "ClauseGuard could not highlight clause:",
          searchText.slice(0, 50)
        );
      }

      break;
    }
  }

  function getHighlightStyle(riskLevel) {
    const styles = {
      high:
        "background-color: rgba(198, 40, 40, 0.18); " +
        "border-bottom: 2px solid #c62828; ",
      medium:
        "background-color: rgba(217, 119, 6, 0.18); " +
        "border-bottom: 2px solid #d97706; ",
      low:
        "background-color: rgba(46, 125, 50, 0.15); " +
        "border-bottom: 2px solid #2e7d32; ",
    };

    return styles[riskLevel] || styles.low;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("ClauseGuard received message:", message.action);

    if (message.action === "ping") {
      sendResponse({ ok: true });
      return true;
    }

    if (message.action === "extractText") {
      const text = extractPageText();
      console.log("ClauseGuard extracted:", text.length, "characters");
      sendResponse({ text });
      return true;
    }

    if (message.action === "highlightClauses") {
      highlightClauses(message.clauses);
      sendResponse({ success: true });
      return true;
    }

    sendResponse({ success: false, error: "Unknown action" });
    return true;
  });
}
