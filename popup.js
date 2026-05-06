// MediaBlock Pro - Popup Script
(function () {
  "use strict";

  const UI = {
    block: { card: document.getElementById("blockCard"), toggle: document.getElementById("blockToggle"), label: document.getElementById("blockLabel"), dot: document.getElementById("blockDot"), track: document.getElementById("blockTrack"), thumb: document.getElementById("blockThumb"), color: "var(--on-accent)" },
    blur: { card: document.getElementById("blurCard"), toggle: document.getElementById("blurToggle"), label: document.getElementById("blurLabel"), dot: document.getElementById("blurDot"), track: document.getElementById("blurTrack"), thumb: document.getElementById("blurThumb"), color: "var(--blur-accent)" },
    hover: { card: document.getElementById("hoverCard"), toggle: document.getElementById("hoverToggle"), label: document.getElementById("hoverLabel"), dot: document.getElementById("hoverDot"), track: document.getElementById("hoverTrack"), thumb: document.getElementById("hoverThumb"), color: "var(--hover-accent)" },
    invert: { card: document.getElementById("invertCard"), toggle: document.getElementById("invertToggle"), label: document.getElementById("invertLabel"), dot: document.getElementById("invertDot"), track: document.getElementById("invertTrack"), thumb: document.getElementById("invertThumb"), color: "var(--invert-accent)" },
    uniform: { card: document.getElementById("uniformCard"), toggle: document.getElementById("uniformToggle"), label: document.getElementById("uniformLabel"), dot: document.getElementById("uniformDot"), track: document.getElementById("uniformTrack"), thumb: document.getElementById("uniformThumb"), color: "var(--uniform-accent)" },
    targets: { img: document.getElementById("targetImgToggle"), vid: document.getElementById("targetVidToggle") },
    counts: { images: document.getElementById("imgCount"), videos: document.getElementById("vidCount") }
  };

  function updateSubUI(type, enabled) {
    const config = UI[type];
    config.toggle.checked = enabled;
    
    let labelPrefix = type.toUpperCase();
    if (type === 'hover') labelPrefix = "HOVER REVEAL";
    if (type === 'uniform') labelPrefix = "UNIFORM VISUALS";
    
    config.label.textContent = enabled ? `${labelPrefix} ON` : `${labelPrefix} OFF`;
    config.dot.style.background = enabled ? config.color : "var(--text-dim)";
    config.dot.style.boxShadow = enabled ? `0 0 8px ${config.color}` : "none";
    config.track.style.background = enabled ? config.color : "#1e1e26";
    config.track.style.borderColor = enabled ? config.color : "var(--off-border)";
    config.thumb.style.left = enabled ? "calc(100% - 25px)" : "3px";
    config.thumb.style.background = enabled ? "#fff" : "var(--text-dim)";
    
    config.card.classList.toggle(`active-${type}`, enabled);
    config.label.style.color = enabled ? config.color : "var(--text-secondary)";
  }

  async function fetchMediaCounts() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || tab.url.startsWith("chrome")) throw new Error("Restricted");
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          images: document.querySelectorAll("img, picture, svg image").length,
          videos: document.querySelectorAll("video, iframe[src*='youtube'], iframe[src*='vimeo']").length
        })
      });

      if (results?.[0]?.result) {
        UI.counts.images.textContent = results[0].result.images;
        UI.counts.videos.textContent = results[0].result.videos;
      }
    } catch (_) {
      UI.counts.images.textContent = "-";
      UI.counts.videos.textContent = "-";
    }
  }

  // Event Listeners for Filters
  UI.block.toggle.addEventListener("change", async (e) => {
    updateSubUI('block', e.target.checked);
    await chrome.runtime.sendMessage({ type: "SET_STATE", enabled: e.target.checked });
  });

  UI.blur.toggle.addEventListener("change", async (e) => {
    updateSubUI('blur', e.target.checked);
    await chrome.runtime.sendMessage({ type: "SET_BLUR", enabled: e.target.checked });
  });

  UI.hover.toggle.addEventListener("change", async (e) => {
    updateSubUI('hover', e.target.checked);
    await chrome.runtime.sendMessage({ type: "SET_HOVER", enabled: e.target.checked });
  });

  UI.invert.toggle.addEventListener("change", async (e) => {
    updateSubUI('invert', e.target.checked);
    await chrome.runtime.sendMessage({ type: "SET_INVERT", enabled: e.target.checked });
  });

  UI.uniform.toggle.addEventListener("change", async (e) => {
    updateSubUI('uniform', e.target.checked);
    await chrome.runtime.sendMessage({ type: "SET_UNIFORM", enabled: e.target.checked });
  });

  // Event Listeners for Targeting Attributes
  UI.targets.img.addEventListener("change", async (e) => {
    await chrome.runtime.sendMessage({ type: "SET_TARGET_IMG", enabled: e.target.checked });
  });

  UI.targets.vid.addEventListener("change", async (e) => {
    await chrome.runtime.sendMessage({ type: "SET_TARGET_VID", enabled: e.target.checked });
  });

  // Initialize Data
  async function init() {
    const [state, blur, hover, invert, uniform, targetImg, targetVid] = await Promise.all([
      chrome.runtime.sendMessage({ type: "GET_STATE" }),
      chrome.runtime.sendMessage({ type: "GET_BLUR" }),
      chrome.runtime.sendMessage({ type: "GET_HOVER" }),
      chrome.runtime.sendMessage({ type: "GET_INVERT" }),
      chrome.runtime.sendMessage({ type: "GET_UNIFORM" }),
      chrome.runtime.sendMessage({ type: "GET_TARGET_IMG" }),
      chrome.runtime.sendMessage({ type: "GET_TARGET_VID" })
    ]);
    
    updateSubUI('block', state?.enabled ?? false);
    updateSubUI('blur', blur?.enabled ?? false);
    updateSubUI('hover', hover?.enabled ?? false);
    updateSubUI('invert', invert?.enabled ?? false);
    updateSubUI('uniform', uniform?.enabled ?? false);
    
    UI.targets.img.checked = targetImg?.enabled ?? true;
    UI.targets.vid.checked = targetVid?.enabled ?? true;

    fetchMediaCounts();
  }

  init();
})();