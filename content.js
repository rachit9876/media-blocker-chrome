// MediaBlock Pro - Content Script
(function () {
  "use strict";
  if (window.__MB_LOADED) return;
  window.__MB_LOADED = true;

  const IMG_SELECTORS = 'img, picture, canvas, svg image, object[type^="image"], embed[type^="image"], [role="img"]';
  const BG_SELECTORS = '[style*="background-image"], [style*="url("]';
  const VID_SELECTORS = 'video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"], iframe[src*="twitch"], iframe[src*="tiktok"], iframe[src*="facebook"], iframe[src*="instagram"], iframe[src*="twitter"], iframe[src*="x.com"], object[type^="video"], embed[type^="video"]';
  const IMG_ALL = `${IMG_SELECTORS}, ${BG_SELECTORS}`;
  
  const prefix = (parent, selectors) => selectors.split(',').map(s => `${parent} ${s.trim()}`).join(', ');

  const MASTER_CSS = `
    :root {
      --mb-blur-val: 25px;
      --mb-blur: 0px;
      --mb-grayscale: 0%;
      --mb-invert: 0;
      --mb-hue: 0deg;
      --mb-opacity: 1;
    }
    
    /* Toggle Variables */
    :root[data-mb-blur="true"] { --mb-blur: var(--mb-blur-val); }
    :root[data-mb-invert="true"] { --mb-invert: 1; --mb-hue: 180deg; }
    :root[data-mb-uniform="true"] { --mb-grayscale: 100%; }
    :root[data-mb-block="true"] { --mb-opacity: 0; }

    /* BASE TARGET RULES
      We keep the filters and transition applied permanently so long as Targeting is ON.
      This allows variables to smoothly animate back to 0 when an effect is turned OFF.
    */
    ${prefix(':root[data-mb-target-img="true"]', IMG_ALL)} {
      filter: blur(var(--mb-blur)) grayscale(var(--mb-grayscale)) invert(var(--mb-invert)) hue-rotate(var(--mb-hue)) !important;
      opacity: var(--mb-opacity) !important;
      transition: filter 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease !important;
    }

    ${prefix(':root[data-mb-target-vid="true"]', VID_SELECTORS)} {
      filter: blur(var(--mb-blur)) grayscale(var(--mb-grayscale)) invert(var(--mb-invert)) hue-rotate(var(--mb-hue)) !important;
      opacity: var(--mb-opacity) !important;
      transition: filter 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease !important;
      transform: translateZ(0); 
    }

    /* Hover Reveal (Smoothly overrides variables back to default on mouse hover) */
    ${prefix(':root[data-mb-target-img="true"][data-mb-hover="true"]', IMG_ALL).split(',').map(s => `${s.trim()}:hover`).join(', ')} {
      --mb-blur: 0px !important; --mb-grayscale: 0% !important; --mb-invert: 0 !important; --mb-hue: 0deg !important; --mb-opacity: 1 !important;
    }
    ${prefix(':root[data-mb-target-img="true"][data-mb-hover="true"]', IMG_ALL)} { cursor: pointer !important; }

    ${prefix(':root[data-mb-target-vid="true"][data-mb-hover="true"]', VID_SELECTORS).split(',').map(s => `${s.trim()}:hover`).join(', ')} {
      --mb-blur: 0px !important; --mb-grayscale: 0% !important; --mb-invert: 0 !important; --mb-hue: 0deg !important; --mb-opacity: 1 !important;
    }
    ${prefix(':root[data-mb-target-vid="true"][data-mb-hover="true"]', VID_SELECTORS)} { cursor: pointer !important; }

    /* Extra Block Module Safety: Disable pointer events so invisible elements can't be clicked */
    ${prefix(':root[data-mb-target-img="true"][data-mb-block="true"]', IMG_SELECTORS)},
    ${prefix(':root[data-mb-target-vid="true"][data-mb-block="true"]', VID_SELECTORS)} {
      pointer-events: none !important;
    }
    
    /* Background images must be manually detached when fully blocked */
    ${prefix(':root[data-mb-target-img="true"][data-mb-block="true"]', BG_SELECTORS)} { 
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

  const STATE_MAP = {
    mediaBlockEnabled: "data-mb-block",
    mediaInvertEnabled: "data-mb-invert",
    mediaBlurEnabled: "data-mb-blur",
    mediaHoverEnabled: "data-mb-hover",
    mediaUniformEnabled: "data-mb-uniform",
    targetImgEnabled: "data-mb-target-img",
    targetVidEnabled: "data-mb-target-vid"
  };

  function applyState(key, value) {
    const root = document.documentElement;
    if (key === "blurIntensity") {
      root.style.setProperty("--mb-blur-val", `${value}px`);
    } else if (STATE_MAP[key]) {
      value ? root.setAttribute(STATE_MAP[key], "true") : root.removeAttribute(STATE_MAP[key]);
    }
  }

  function init() {
    injectMasterStyle();
    chrome.runtime.sendMessage({ type: "GET_ALL_STATE" }, (state) => {
      if(!state) return;
      Object.keys(state).forEach(key => applyState(key, state[key]));
    });
  }

  init();

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SYNC_SETTING") applyState(msg.key, msg.value);
    if (msg.type === "SYNC_ALL") Object.keys(msg).forEach(k => applyState(k, msg[k]));
  });
})();