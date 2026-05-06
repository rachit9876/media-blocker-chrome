// MediaBlock Pro - Content Script
(function () {
  "use strict";

  if (window.__MB_LOADED) return;
  window.__MB_LOADED = true;

  const STORAGE_KEY = "mediaBlockEnabled";
  const INVERT_STORAGE_KEY = "mediaInvertEnabled";
  const BLUR_STORAGE_KEY = "mediaBlurEnabled";
  const HOVER_STORAGE_KEY = "mediaHoverEnabled"; // New key

  const ALL_MEDIA = [
    'img', 'picture', 'video', 'canvas', 'svg image',
    'iframe[src*="youtube"]', 'iframe[src*="vimeo"]', 'iframe[src*="dailymotion"]',
    'object[type^="image"]', 'object[type^="video"]',
    'embed[type^="video"]', 'embed[type^="image"]',
    '[role="img"]'
  ].join(', ');

  const ALL_BG = '[style*="background-image"], [style*="url("]';
  const COMBINED = `${ALL_MEDIA}, ${ALL_BG}`;
  const prefix = (parent, selectors) => selectors.split(',').map(s => `${parent} ${s.trim()}`).join(', ');

  const MASTER_CSS = `
    :root {
      --mb-blur: 0px;
      --mb-grayscale: 0%;
      --mb-invert: 0;
      --mb-hue: 0deg;
    }
    
    :root[data-mb-blur="true"] {
      --mb-blur: 25px;
      --mb-grayscale: 80%;
    }
    
    :root[data-mb-invert="true"] {
      --mb-invert: 1;
      --mb-hue: 180deg;
    }

    ${prefix(':root[data-mb-blur="true"]', COMBINED)},
    ${prefix(':root[data-mb-invert="true"]', COMBINED)} {
      filter: blur(var(--mb-blur)) grayscale(var(--mb-grayscale)) invert(var(--mb-invert)) hue-rotate(var(--mb-hue)) !important;
      transition: filter 0.3s ease !important;
    }

    /* Hover Reveal now requires BOTH blur and hover states to be true */
    ${prefix(':root[data-mb-blur="true"][data-mb-hover="true"]', COMBINED).split(',').map(s => `${s.trim()}:hover`).join(', ')} {
      --mb-blur: 0px;
      --mb-grayscale: 0%;
    }

    /* Ensure pointer cursor only shows if Hover is enabled */
    ${prefix(':root[data-mb-blur="true"][data-mb-hover="true"]', COMBINED)} {
      cursor: pointer !important;
    }

    ${prefix(':root[data-mb-block="true"]', ALL_MEDIA)} {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    ${prefix(':root[data-mb-block="true"]', ALL_BG)} {
      background-image: none !important;
    }
  `;

  function injectMasterStyle() {
    if (document.getElementById("__mediablock_master_style__")) return;
    const style = document.createElement("style");
    style.id = "__mediablock_master_style__";
    style.textContent = MASTER_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function updateState(type, enabled) {
    const root = document.documentElement;
    if (type === "MEDIA_BLOCK_TOGGLE") {
      enabled ? root.setAttribute("data-mb-block", "true") : root.removeAttribute("data-mb-block");
    } else if (type === "MEDIA_INVERT_TOGGLE") {
      enabled ? root.setAttribute("data-mb-invert", "true") : root.removeAttribute("data-mb-invert");
    } else if (type === "MEDIA_BLUR_TOGGLE") {
      enabled ? root.setAttribute("data-mb-blur", "true") : root.removeAttribute("data-mb-blur");
    } else if (type === "MEDIA_HOVER_TOGGLE") {
      enabled ? root.setAttribute("data-mb-hover", "true") : root.removeAttribute("data-mb-hover");
    }
  }

  function init() {
    injectMasterStyle();
    chrome.storage.local.get([STORAGE_KEY, INVERT_STORAGE_KEY, BLUR_STORAGE_KEY, HOVER_STORAGE_KEY], (res) => {
      updateState("MEDIA_BLOCK_TOGGLE", res[STORAGE_KEY]);
      updateState("MEDIA_INVERT_TOGGLE", res[INVERT_STORAGE_KEY]);
      updateState("MEDIA_BLUR_TOGGLE", res[BLUR_STORAGE_KEY]);
      updateState("MEDIA_HOVER_TOGGLE", res[HOVER_STORAGE_KEY]);
    });
  }

  init();

  chrome.runtime.onMessage.addListener((message) => {
    updateState(message.type, message.enabled);
  });
})();