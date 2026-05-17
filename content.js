// MediaBlock Pro - Content Script
(function () {
  "use strict";
  if (window.__MB_LOADED) return;
  window.__MB_LOADED = true;

  // ... [Keep IMG_SELECTORS, PIXELATE_SVG, MASTER_CSS, and injectMasterStyle identical] ...
  const IMG_SELECTORS = 'img, picture, canvas, svg image, object[type^="image"], embed[type^="image"], [role="img"]';
  const BG_SELECTORS = '[style*="background-image"], [style*="url("]';
  const VID_SELECTORS = 'video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"], iframe[src*="twitch"], iframe[src*="tiktok"], iframe[src*="facebook"], iframe[src*="instagram"], iframe[src*="twitter"], iframe[src*="x.com"], object[type^="video"], embed[type^="video"]';
  const IMG_ALL = `${IMG_SELECTORS}, ${BG_SELECTORS}`;
  
  const prefix = (parent, selectors) => selectors.split(',').map(s => `${parent} ${s.trim()}`).join(', ');

  const PIXELATE_SVG = `<svg id="__mb_svg_filters__" width="0" height="0" style="position:absolute;z-index:-1;"><filter id="mb-pixelate-filter"><feGaussianBlur stdDeviation="6" result="blur" /><feComponentTransfer in="blur" result="discrete"><feFuncR type="discrete" tableValues="0 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1"/><feFuncG type="discrete" tableValues="0 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1"/><feFuncB type="discrete" tableValues="0 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1"/></feComponentTransfer></filter></svg>`;

  const MASTER_CSS = `:root { --mb-filter-func: blur(25px); --mb-grayscale: 0%; --mb-invert: 0; --mb-hue: 0deg; --mb-opacity: 1; } :root[data-mb-invert="true"] { --mb-invert: 1; --mb-hue: 180deg; } :root[data-mb-uniform="true"] { --mb-grayscale: 100%; } :root[data-mb-block="true"] { --mb-opacity: 0; } ${prefix(':root', IMG_ALL)}, ${prefix(':root', VID_SELECTORS)} { will-change: filter, opacity; } ${prefix(':root[data-mb-target-img="true"]', IMG_ALL)}, ${prefix(':root[data-mb-target-vid="true"]', VID_SELECTORS)} { filter: var(--mb-filter-func) grayscale(var(--mb-grayscale)) invert(var(--mb-invert)) hue-rotate(var(--mb-hue)) !important; opacity: var(--mb-opacity) !important; transition: filter 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease !important; } ${prefix(':root[data-mb-target-vid="true"]', VID_SELECTORS)} { transform: translateZ(0); } ${prefix(':root[data-mb-target-img="true"][data-mb-hover="true"]', IMG_ALL).split(',').map(s => `${s.trim()}:hover`).join(', ')}, ${prefix(':root[data-mb-target-vid="true"][data-mb-hover="true"]', VID_SELECTORS).split(',').map(s => `${s.trim()}:hover`).join(', ')} { --mb-filter-func: blur(0px) !important; --mb-grayscale: 0% !important; --mb-invert: 0 !important; --mb-hue: 0deg !important; --mb-opacity: 1 !important; } ${prefix(':root[data-mb-target-img="true"][data-mb-hover="true"]', IMG_ALL)}, ${prefix(':root[data-mb-target-vid="true"][data-mb-hover="true"]', VID_SELECTORS)} { cursor: pointer !important; } ${prefix(':root[data-mb-target-img="true"][data-mb-block="true"]', 'img')} { position: relative !important; visibility: hidden !important; } ${prefix(':root[data-mb-target-img="true"][data-mb-block="true"]', 'img')}::after { content: attr(alt) " (Media Blocked)" !important; visibility: visible !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background: #1a1a1f !important; color: #a0a0b0 !important; font-size: 13px !important; font-family: sans-serif !important; display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; padding: 8px !important; box-sizing: border-box !important; border: 1px dashed #3a3a4a !important; overflow: hidden !important; text-overflow: ellipsis !important; } ${prefix(':root[data-mb-target-vid="true"][data-mb-block="true"]', VID_SELECTORS)} { pointer-events: none !important; } ${prefix(':root[data-mb-target-img="true"][data-mb-block="true"]', BG_SELECTORS)} { background-image: none !important; }`;

  function injectMasterStyle() {
    if (!document.getElementById("__mb_svg_filters__")) {
      const svgContainer = document.createElement("div"); svgContainer.innerHTML = PIXELATE_SVG;
      (document.body || document.documentElement).appendChild(svgContainer);
    }
    if (!document.getElementById("__mediablock_master_style__")) {
      const style = document.createElement("style"); style.id = "__mediablock_master_style__"; style.textContent = MASTER_CSS;
      (document.head || document.documentElement).appendChild(style);
    }
  }

  // --- FORCE RIGHT CLICK LOGIC (Fixed Propagation) ---
  let isForceRightClickOn = false;
  ['contextmenu', 'copy', 'paste', 'selectstart', 'dragstart', 'mousedown', 'mouseup'].forEach(evt => {
      window.addEventListener(evt, function(e) { 
          if (isForceRightClickOn) { 
              e.stopPropagation(); 
              e.stopImmediatePropagation(); 
          } 
      }, true);
  });

  function toggleForceRightClickStyle(enabled) {
      let styleEl = document.getElementById("__mb_frc_style__");
      if (enabled) {
          if (!styleEl) {
              styleEl = document.createElement('style');
              styleEl.id = "__mb_frc_style__";
              styleEl.innerHTML = `* { -webkit-user-select: text !important; user-select: text !important; pointer-events: auto !important; }`;
              (document.head || document.documentElement).appendChild(styleEl);
          }
      } else { if (styleEl) styleEl.remove(); }
  }

  // ... [Keep VIDEO AUTOPLAY & AUDIO EQ ENGINE code block perfectly identical to original] ...
  let vidAutoplayPrev = false; let vidAutoMute = false;
  function processVideoNode(v) { if (vidAutoplayPrev) { if (v.hasAttribute('autoplay')) v.removeAttribute('autoplay'); if (!v.paused && !v.__mbPaused) { v.pause(); v.__mbPaused = true; } } if (vidAutoMute) v.muted = true; }
  const videoObserver = new MutationObserver((mutations) => { if (!vidAutoplayPrev && !vidAutoMute) return; mutations.forEach(m => { m.addedNodes.forEach(node => { if (node.tagName === 'VIDEO') processVideoNode(node); else if (node.querySelectorAll) node.querySelectorAll('video').forEach(processVideoNode); }); }); });
  function triggerVideoProcessing() { if (vidAutoplayPrev || vidAutoMute) { document.querySelectorAll('video').forEach(processVideoNode); videoObserver.observe(document.documentElement, { childList: true, subtree: true }); } else { videoObserver.disconnect(); } }

  let isStableVolumeOn = false; let audioEqMode = 'stable'; let audioCtx = null; const processedMedia = new WeakMap();
  function attachStableVolume(mediaEl) {
    if (processedMedia.has(mediaEl)) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(mediaEl);
      const lowEQ = audioCtx.createBiquadFilter(); lowEQ.type = "lowshelf"; lowEQ.frequency.value = 250;
      const midEQ = audioCtx.createBiquadFilter(); midEQ.type = "peaking"; midEQ.frequency.value = 2000; midEQ.Q.value = 1.0;
      const compressor = audioCtx.createDynamicsCompressor(); compressor.threshold.value = -20; compressor.knee.value = 20; compressor.ratio.value = 4; compressor.attack.value = 0.005; compressor.release.value = 0.1;   
      const makeupGain = audioCtx.createGain(); makeupGain.gain.value = 2.5; 
      const effectGain = audioCtx.createGain(); effectGain.gain.value = isStableVolumeOn ? 1 : 0;
      const bypassGain = audioCtx.createGain(); bypassGain.gain.value = isStableVolumeOn ? 0 : 1;
      source.connect(lowEQ); lowEQ.connect(midEQ); midEQ.connect(compressor); compressor.connect(makeupGain); makeupGain.connect(effectGain); effectGain.connect(audioCtx.destination); source.connect(bypassGain); bypassGain.connect(audioCtx.destination);
      processedMedia.set(mediaEl, { effectGain, bypassGain, lowEQ, midEQ });
      updateEQNodes(processedMedia.get(mediaEl));
    } catch (e) { }
  }
  function updateEQNodes(nodes) {
    if (!nodes) return;
    if (audioEqMode === 'stable') { nodes.lowEQ.gain.value = 0; nodes.midEQ.gain.value = 0; } else if (audioEqMode === 'dialogue') { nodes.lowEQ.gain.value = -6; nodes.midEQ.gain.value = 5; } else if (audioEqMode === 'bass_cut') { nodes.lowEQ.gain.value = -12; nodes.midEQ.gain.value = 0; }
  }
  function toggleStableVolumeLive(enabled) {
    isStableVolumeOn = enabled; const mediaEls = document.querySelectorAll('video, audio'); mediaEls.forEach(attachStableVolume);
    mediaEls.forEach(el => { const nodes = processedMedia.get(el); if (nodes) { nodes.effectGain.gain.setTargetAtTime(enabled ? 1 : 0, audioCtx.currentTime, 0.05); nodes.bypassGain.gain.setTargetAtTime(enabled ? 0 : 1, audioCtx.currentTime, 0.05); updateEQNodes(nodes); } });
    if (enabled && audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  document.addEventListener('play', (e) => { if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') { attachStableVolume(e.target); if (isStableVolumeOn && audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } }, true);

  // ------------------------------------------

  const STATE_MAP = {
    mediaBlockEnabled: "data-mb-block", mediaInvertEnabled: "data-mb-invert", mediaHoverEnabled: "data-mb-hover", mediaUniformEnabled: "data-mb-uniform", targetImgEnabled: "data-mb-target-img", targetVidEnabled: "data-mb-target-vid"
  };

  let currentBlurVal = 25;
  let currentBlurMode = "blur";

  function updateVisualFilter() {
    const root = document.documentElement;
    if (root.getAttribute("data-mb-blur") !== "true") { root.style.setProperty("--mb-filter-func", "blur(0px)"); return; }
    if (currentBlurMode === "pixelate") { root.style.setProperty("--mb-filter-func", "url(#mb-pixelate-filter)"); } 
    else { root.style.setProperty("--mb-filter-func", `blur(${currentBlurVal}px)`); }
  }

  function applyState(key, value) {
    const root = document.documentElement;
    if (key === "blurIntensity") { currentBlurVal = value; updateVisualFilter(); }
    else if (key === "blurMode") { currentBlurMode = value; updateVisualFilter(); }
    else if (key === "mediaBlurEnabled") { value ? root.setAttribute("data-mb-blur", "true") : root.removeAttribute("data-mb-blur"); updateVisualFilter(); }
    else if (key === "forceRightClickEnabled") { isForceRightClickOn = value; toggleForceRightClickStyle(value); }
    else if (key === "stableVolumeEnabled") { toggleStableVolumeLive(value); }
    else if (key === "audioEqMode") { audioEqMode = value; document.querySelectorAll('video, audio').forEach(el => updateEQNodes(processedMedia.get(el))); }
    else if (key === "videoAutoplayPreventEnabled") { vidAutoplayPrev = value; triggerVideoProcessing(); }
    else if (key === "videoAutoMuteEnabled") { vidAutoMute = value; triggerVideoProcessing(); }
    else if (key === "browserLockEnabled") { value ? showLockScreen() : document.getElementById('mb-lock-screen')?.remove(); }
    else if (STATE_MAP[key]) { value ? root.setAttribute(STATE_MAP[key], "true") : root.removeAttribute(STATE_MAP[key]); }
  }

  // Improved Security Lock Event Handlers
  function showLockScreen() {
    if (document.getElementById('mb-lock-screen')) return;
    const overlay = document.createElement('div');
    overlay.id = 'mb-lock-screen';
    overlay.style.cssText = `
      position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important;
      background: #0f0f11 !important; z-index: 2147483647 !important; display: flex !important; flex-direction: column !important; 
      align-items: center !important; justify-content: center !important; font-family: sans-serif !important; color: #f0f0f5 !important;
    `;
    overlay.innerHTML = `<div style="background: #1a1a1f; padding: 40px; border-radius: 16px; border: 1px solid #2a2a32; text-align: center; width: 340px;"><h2>Browser Locked</h2></div>`;
    const appendOverlay = () => { if (!document.getElementById('mb-lock-screen')) (document.body || document.documentElement).appendChild(overlay); };
    appendOverlay();
    if (!document.body) window.addEventListener('DOMContentLoaded', appendOverlay);
    ['click', 'mousedown', 'keydown', 'wheel', 'contextmenu', 'scroll'].forEach(evt => overlay.addEventListener(evt, e => {
      e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
    }, true));
  }

  function init() {
    injectMasterStyle();
    chrome.runtime.sendMessage({ type: "CHECK_LOCK" }, (r) => { if (r?.locked) showLockScreen(); });
    chrome.runtime.sendMessage({ type: "GET_ALL_STATE" }, (state) => {
      if(!state) return;
      Object.keys(state).forEach(key => applyState(key, state[key]));
    });
  }

  init();

  // Switch to Storage Listener instead of Custom Messages
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      Object.keys(changes).forEach(key => applyState(key, changes[key].newValue));
    }
  });

})();