// MediaBlock Pro - Content Script
(function () {
  "use strict";
  if (window.__MB_LOADED) return;
  window.__MB_LOADED = true;

  const STORAGE_KEY = "mediaBlockEnabled";
  const INVERT_STORAGE_KEY = "mediaInvertEnabled";
  const BLUR_STORAGE_KEY = "mediaBlurEnabled";
  const HOVER_STORAGE_KEY = "mediaHoverEnabled";
  const UNIFORM_STORAGE_KEY = "mediaUniformEnabled";
  const TARGET_IMG_KEY = "targetImgEnabled"; 
  const TARGET_VID_KEY = "targetVidEnabled"; 

  const IMG_SELECTORS = 'img, picture, canvas, svg image, object[type^="image"], embed[type^="image"], [role="img"]';
  const BG_SELECTORS = '[style*="background-image"], [style*="url("]';
  const VID_SELECTORS = 'video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"], iframe[src*="twitch"], iframe[src*="tiktok"], iframe[src*="facebook"], iframe[src*="instagram"], iframe[src*="twitter"], iframe[src*="x.com"], object[type^="video"], embed[type^="video"]';
  const IMG_ALL = `${IMG_SELECTORS}, ${BG_SELECTORS}`;
  const VID_ALL = VID_SELECTORS;
  
  const prefix = (parent, selectors) => selectors.split(',').map(s => `${parent} ${s.trim()}`).join(', ');

  const MASTER_CSS = `
    :root {
      --mb-blur: 0px;
      --mb-grayscale: 0%;
      --mb-invert: 0;
      --mb-hue: 0deg;
    }
    /* Base Effects */
    :root[data-mb-blur="true"] {
      --mb-blur: 25px;
    }
    :root[data-mb-invert="true"] {
      --mb-invert: 1;
      --mb-hue: 180deg;
    }
    
    /* Uniform Visuals now sets 100% grayscale */
    :root[data-mb-uniform="true"] {
      --mb-grayscale: 100%;
    }

    /* Target: Images - Base Filters (Now includes Uniform as a trigger) */
    ${prefix(':root[data-mb-target-img="true"][data-mb-blur="true"]', IMG_ALL)},
    ${prefix(':root[data-mb-target-img="true"][data-mb-invert="true"]', IMG_ALL)},
    ${prefix(':root[data-mb-target-img="true"][data-mb-uniform="true"]', IMG_ALL)} {
      filter: blur(var(--mb-blur)) grayscale(var(--mb-grayscale)) invert(var(--mb-invert)) hue-rotate(var(--mb-hue)) !important;
      transition: filter 0.3s ease !important;
    }

    /* Target: Videos - Base Filters (Now includes Uniform as a trigger) */
    ${prefix(':root[data-mb-target-vid="true"][data-mb-blur="true"]', VID_ALL)},
    ${prefix(':root[data-mb-target-vid="true"][data-mb-invert="true"]', VID_ALL)},
    ${prefix(':root[data-mb-target-vid="true"][data-mb-uniform="true"]', VID_ALL)} {
      filter: blur(var(--mb-blur)) grayscale(var(--mb-grayscale)) invert(var(--mb-invert)) hue-rotate(var(--mb-hue)) !important;
      transition: filter 0.3s ease !important;
      transform: translateZ(0); 
    }

    /* Hover Reveal (Images) */
    ${prefix(':root[data-mb-target-img="true"][data-mb-hover="true"]', IMG_ALL).split(',').map(s => `${s.trim()}:hover`).join(', ')} {
      --mb-blur: 0px !important;
      --mb-grayscale: 0% !important;
      --mb-invert: 0 !important;
      --mb-hue: 0deg !important;
    }
    ${prefix(':root[data-mb-target-img="true"][data-mb-hover="true"]', IMG_ALL)} {
      cursor: pointer !important;
    }

    /* Hover Reveal (Videos) */
    ${prefix(':root[data-mb-target-vid="true"][data-mb-hover="true"]', VID_ALL).split(',').map(s => `${s.trim()}:hover`).join(', ')} {
      --mb-blur: 0px !important;
      --mb-grayscale: 0% !important;
      --mb-invert: 0 !important;
      --mb-hue: 0deg !important;
    }
    ${prefix(':root[data-mb-target-vid="true"][data-mb-hover="true"]', VID_ALL)} {
      cursor: pointer !important;
    }

    /* Block Module (Images) */
    ${prefix(':root[data-mb-target-img="true"][data-mb-block="true"]', IMG_SELECTORS)} {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    ${prefix(':root[data-mb-target-img="true"][data-mb-block="true"]', BG_SELECTORS)} {
      background-image: none !important;
    }

    /* Block Module (Videos) */
    ${prefix(':root[data-mb-target-vid="true"][data-mb-block="true"]', VID_SELECTORS)} {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;

  function injectMasterStyle() {
    if (document.getElementById("__mediablock_master_style__")) return;
    const style = document.createElement("style");
    style.id = "__mediablock_master_style__";
    style.textContent = MASTER_CSS;
    
    if (document.head) {
      document.head.insertBefore(style, document.head.firstChild);
    } else {
      document.documentElement.appendChild(style);
    }
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
    } else if (type === "MEDIA_UNIFORM_TOGGLE") {
      enabled ? root.setAttribute("data-mb-uniform", "true") : root.removeAttribute("data-mb-uniform");
    } else if (type === "MEDIA_TARGET_IMG_TOGGLE") {
      enabled ? root.setAttribute("data-mb-target-img", "true") : root.removeAttribute("data-mb-target-img");
    } else if (type === "MEDIA_TARGET_VID_TOGGLE") {
      enabled ? root.setAttribute("data-mb-target-vid", "true") : root.removeAttribute("data-mb-target-vid");
    }
  }

  function init() {
    injectMasterStyle();
    
    chrome.storage.local.get({
      [STORAGE_KEY]: false,
      [INVERT_STORAGE_KEY]: false,
      [BLUR_STORAGE_KEY]: false,
      [HOVER_STORAGE_KEY]: false,
      [UNIFORM_STORAGE_KEY]: false,
      [TARGET_IMG_KEY]: true, 
      [TARGET_VID_KEY]: true
    }, (res) => {
      updateState("MEDIA_BLOCK_TOGGLE", res[STORAGE_KEY]);
      updateState("MEDIA_INVERT_TOGGLE", res[INVERT_STORAGE_KEY]);
      updateState("MEDIA_BLUR_TOGGLE", res[BLUR_STORAGE_KEY]);
      updateState("MEDIA_HOVER_TOGGLE", res[HOVER_STORAGE_KEY]);
      updateState("MEDIA_UNIFORM_TOGGLE", res[UNIFORM_STORAGE_KEY]);
      updateState("MEDIA_TARGET_IMG_TOGGLE", res[TARGET_IMG_KEY]);
      updateState("MEDIA_TARGET_VID_TOGGLE", res[TARGET_VID_KEY]);
    });
  }

  init();

  chrome.runtime.onMessage.addListener((message) => {
    updateState(message.type, message.enabled);
  });
})();