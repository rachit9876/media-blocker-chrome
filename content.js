// MediaBlock — Content Script
// Runs at document_start on every page.
// Reads blocking state from storage and applies/removes DOM-level media hiding.

(function () {
  "use strict";

  const STYLE_ID = "__mediablock_style__";
  const STORAGE_KEY = "mediaBlockEnabled";

  // ─── CSS that hides all images and videos ───────────────────────────────────
  const BLOCK_CSS = `
    img,
    picture,
    video,
    source,
    iframe[src*="youtube"],
    iframe[src*="vimeo"],
    iframe[src*="dailymotion"],
    [style*="background-image"],
    canvas,
    svg image,
    object[type^="image"],
    object[type^="video"],
    embed[type^="video"],
    embed[type^="image"] {
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;

  // ─── Style injection ────────────────────────────────────────────────────────

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = BLOCK_CSS;
    // Inject as early as possible
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }
  }

  function removeStyle() {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }

  // ─── Inline background-image stripping via MutationObserver ────────────────

  let observer = null;

  function stripInlineBackgrounds(node) {
    if (node.nodeType !== 1) return; // Element nodes only
    if (node.style && node.style.backgroundImage && node.style.backgroundImage !== "none") {
      node.dataset.__mbOrigBg = node.style.backgroundImage;
      node.style.backgroundImage = "none";
    }
    node.querySelectorAll && node.querySelectorAll("[style*='background-image']").forEach(el => {
      if (el.style.backgroundImage && el.style.backgroundImage !== "none") {
        el.dataset.__mbOrigBg = el.style.backgroundImage;
        el.style.backgroundImage = "none";
      }
    });
  }

  function restoreInlineBackgrounds() {
    document.querySelectorAll("[data-__mb-orig-bg]").forEach(el => {
      el.style.backgroundImage = el.dataset.__mbOrigBg;
      delete el.dataset.__mbOrigBg;
    });
  }

  function startObserver() {
    if (observer) return;
    // Strip existing inline backgrounds immediately
    document.documentElement && stripInlineBackgrounds(document.documentElement);

    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) stripInlineBackgrounds(node);
        }
        if (mutation.type === "attributes" && mutation.target.style) {
          stripInlineBackgrounds(mutation.target);
        }
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"]
    });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    restoreInlineBackgrounds();
  }

  // ─── Apply / Remove blocking ─────────────────────────────────────────────────

  function applyBlocking() {
    injectStyle();
    startObserver();
  }

  function removeBlocking() {
    removeStyle();
    stopObserver();
  }

  // ─── Init: read state from storage ──────────────────────────────────────────

  function init() {
    chrome.storage.local.get(STORAGE_KEY, ({ mediaBlockEnabled }) => {
      if (mediaBlockEnabled) applyBlocking();
    });
  }

  // Run as early as possible
  init();

  // ─── Listen for toggle messages from background ──────────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "MEDIA_BLOCK_TOGGLE") {
      if (message.enabled) {
        applyBlocking();
      } else {
        removeBlocking();
      }
    }
  });

})();
