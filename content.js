// MediaBlock Pro — Content Script
(function () {
  "use strict";

  // Prevent duplicate injections
  if (window.__MB_LOADED) return;
  window.__MB_LOADED = true;

  const STYLE_ID = "__mediablock_style__";
  const INVERT_STYLE_ID = "__mediablock_invert_style__";
  const BLUR_STYLE_ID = "__mediablock_blur_style__";

  const STORAGE_KEY = "mediaBlockEnabled";
  const INVERT_STORAGE_KEY = "mediaInvertEnabled";
  const BLUR_STORAGE_KEY = "mediaBlurEnabled";

  const BASE_SELECTORS = `
    img, picture, video, canvas, svg image,
    iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"],
    object[type^="image"], object[type^="video"],
    embed[type^="video"], embed[type^="image"]
  `;

  const BLOCK_CSS = `
    ${BASE_SELECTORS} {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    [style*="background-image"] {
      background-image: none !important;
    }
  `;

  const INVERT_CSS = `
    ${BASE_SELECTORS} {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;

  const BLUR_CSS = `
    ${BASE_SELECTORS} {
      filter: blur(25px) grayscale(80%) !important;
      transition: filter 0.3s ease !important;
      cursor: pointer !important;
    }
    ${BASE_SELECTORS.split(',').map(s => `${s}:hover`).join(',')} {
      filter: blur(0px) grayscale(0%) !important;
    }
  `;

  function manageStyle(id, css, enable) {
    let style = document.getElementById(id);
    if (enable) {
      if (!style) {
        style = document.createElement("style");
        style.id = id;
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
      }
    } else if (style) {
      style.remove();
    }
  }

  function init() {
    chrome.storage.local.get([STORAGE_KEY, INVERT_STORAGE_KEY, BLUR_STORAGE_KEY], (res) => {
      if (res[STORAGE_KEY]) manageStyle(STYLE_ID, BLOCK_CSS, true);
      if (res[INVERT_STORAGE_KEY]) manageStyle(INVERT_STYLE_ID, INVERT_CSS, true);
      if (res[BLUR_STORAGE_KEY]) manageStyle(BLUR_STYLE_ID, BLUR_CSS, true);
    });
  }

  init();

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "MEDIA_BLOCK_TOGGLE") manageStyle(STYLE_ID, BLOCK_CSS, message.enabled);
    if (message.type === "MEDIA_INVERT_TOGGLE") manageStyle(INVERT_STYLE_ID, INVERT_CSS, message.enabled);
    if (message.type === "MEDIA_BLUR_TOGGLE") manageStyle(BLUR_STYLE_ID, BLUR_CSS, message.enabled);
  });
})();