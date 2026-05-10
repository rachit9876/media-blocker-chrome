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

    ${prefix(':root[data-mb-target-img="true"][data-mb-hover="true"]', IMG_ALL).split(',').map(s => `${s.trim()}:hover`).join(', ')} {
      --mb-blur: 0px !important; --mb-grayscale: 0% !important; --mb-invert: 0 !important; --mb-hue: 0deg !important; --mb-opacity: 1 !important;
    }
    ${prefix(':root[data-mb-target-img="true"][data-mb-hover="true"]', IMG_ALL)} { cursor: pointer !important; }

    ${prefix(':root[data-mb-target-vid="true"][data-mb-hover="true"]', VID_SELECTORS).split(',').map(s => `${s.trim()}:hover`).join(', ')} {
      --mb-blur: 0px !important; --mb-grayscale: 0% !important; --mb-invert: 0 !important; --mb-hue: 0deg !important; --mb-opacity: 1 !important;
    }
    ${prefix(':root[data-mb-target-vid="true"][data-mb-hover="true"]', VID_SELECTORS)} { cursor: pointer !important; }

    ${prefix(':root[data-mb-target-img="true"][data-mb-block="true"]', IMG_SELECTORS)},
    ${prefix(':root[data-mb-target-vid="true"][data-mb-block="true"]', VID_SELECTORS)} {
      pointer-events: none !important;
    }
    
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

  // --- FORCE RIGHT CLICK LOGIC ---
  let isForceRightClickOn = false;

  const blockedEvents = ['contextmenu', 'copy', 'paste', 'selectstart', 'dragstart', 'mousedown', 'mouseup'];
  blockedEvents.forEach(eventName => {
      window.addEventListener(eventName, function(e) {
          if (isForceRightClickOn) { e.stopPropagation(); }
      }, true);
  });

  const clearInlineHandlers = () => {
      const allElements = document.querySelectorAll('*');
      for (let el of allElements) {
          if (el.oncontextmenu !== null) el.oncontextmenu = null;
          if (el.onselectstart !== null) el.onselectstart = null;
          if (el.ondragstart !== null) el.ondragstart = null;
      }
  };

  function toggleForceRightClickStyle(enabled) {
      const styleId = "__mb_frc_style__";
      let styleEl = document.getElementById(styleId);
      
      if (enabled) {
          if (!styleEl) {
              styleEl = document.createElement('style');
              styleEl.id = styleId;
              styleEl.innerHTML = `
                  * {
                      -webkit-user-select: text !important;
                      -moz-user-select: text !important;
                      -ms-user-select: text !important;
                      user-select: text !important;
                      pointer-events: auto !important;
                  }
              `;
              (document.head || document.documentElement).appendChild(styleEl);
          }
          clearInlineHandlers();
      } else {
          if (styleEl) styleEl.remove();
      }
  }

  // --- STABLE VOLUME LOGIC (FIXED: Improved AGC + Makeup Gain) ---
  let isStableVolumeOn = false;
  let audioCtx = null;
  const processedMedia = new WeakMap();

  function attachStableVolume(mediaEl) {
    if (processedMedia.has(mediaEl)) return;
    
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      const source = audioCtx.createMediaElementSource(mediaEl);
      const compressor = audioCtx.createDynamicsCompressor();
      
      // Much more natural compression settings
      compressor.threshold.value = -20; // Catch peaks starting at -20dB
      compressor.knee.value = 20;       // Smooth transition
      compressor.ratio.value = 4;       // Medium compression (squashes peaks gently)
      compressor.attack.value = 0.005;  // Fast reaction to spikes
      compressor.release.value = 0.1;   // Faster release so volume recovers quickly
      
      // NEW: Makeup Gain node to restore overall loudness after compressing
      const makeupGain = audioCtx.createGain();
      makeupGain.gain.value = 2.5; // +8dB volume boost to make quiet sounds loud and clear

      const effectGain = audioCtx.createGain();
      effectGain.gain.value = isStableVolumeOn ? 1 : 0;
      
      const bypassGain = audioCtx.createGain();
      bypassGain.gain.value = isStableVolumeOn ? 0 : 1;

      // Routing with makeup gain: Source -> Compressor -> Makeup -> EffectOut
      source.connect(compressor);
      compressor.connect(makeupGain);
      makeupGain.connect(effectGain);
      effectGain.connect(audioCtx.destination);

      // Bypass route remains uncompressed
      source.connect(bypassGain);
      bypassGain.connect(audioCtx.destination);

      processedMedia.set(mediaEl, { effectGain, bypassGain });
    } catch (e) {
      console.warn("MediaBlock Pro: Could not attach volume stabilizer.", e);
    }
  }

  function toggleStableVolumeLive(enabled) {
    isStableVolumeOn = enabled;
    const mediaEls = document.querySelectorAll('video, audio');
    
    mediaEls.forEach(attachStableVolume);

    mediaEls.forEach(el => {
      const nodes = processedMedia.get(el);
      if (nodes) {
        // Crossfade to avoid audio popping
        nodes.effectGain.gain.setTargetAtTime(enabled ? 1 : 0, audioCtx.currentTime, 0.05);
        nodes.bypassGain.gain.setTargetAtTime(enabled ? 0 : 1, audioCtx.currentTime, 0.05);
      }
    });

    if (enabled && audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  document.addEventListener('play', (e) => {
    if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') {
      attachStableVolume(e.target);
      if (isStableVolumeOn && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }
  }, true);
  // ------------------------------------------

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
    } else if (key === "forceRightClickEnabled") {
      isForceRightClickOn = value;
      toggleForceRightClickStyle(value);
    } else if (key === "stableVolumeEnabled") {
      toggleStableVolumeLive(value);
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