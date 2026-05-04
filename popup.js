// MediaBlock Pro — Popup Script
(function () {
  "use strict";

  const UI = {
    main: { toggle: document.getElementById("mainToggle"), label: document.getElementById("mainLabel"), dot: document.getElementById("mainDot") },
    blur: { toggle: document.getElementById("blurToggle"), label: document.getElementById("blurLabel"), dot: document.getElementById("blurDot"), track: document.getElementById("blurTrack"), thumb: document.getElementById("blurThumb"), color: "var(--blur-accent)" },
    invert: { toggle: document.getElementById("invertToggle"), label: document.getElementById("invertLabel"), dot: document.getElementById("invertDot"), track: document.getElementById("invertTrack"), thumb: document.getElementById("invertThumb"), color: "var(--invert-accent)" },
    counts: { images: document.getElementById("imgCount"), videos: document.getElementById("vidCount"), status: document.getElementById("blockedCount") }
  };

  function updateMainUI(enabled) {
    UI.main.toggle.checked = enabled;
    document.body.classList.toggle("is-enabled", enabled);
    UI.main.label.textContent = enabled ? "ACTIVE" : "INACTIVE";
    UI.counts.status.textContent = enabled ? "ALL MEDIA BLOCKED" : "BLOCKING INACTIVE";
    if (!enabled) { UI.counts.images.textContent = "0"; UI.counts.videos.textContent = "0"; }
  }

  function updateSubUI(type, enabled) {
    const config = UI[type];
    config.toggle.checked = enabled;
    config.label.textContent = enabled ? `${type.toUpperCase()} ON` : `${type.toUpperCase()} OFF`;
    config.dot.style.background = enabled ? config.color : "var(--text-dim)";
    config.dot.style.boxShadow = enabled ? `0 0 8px ${config.color}` : "none";
    config.track.style.background = enabled ? config.color : "#1e1e26";
    config.track.style.borderColor = enabled ? config.color : "var(--off-border)";
    config.thumb.style.left = enabled ? "calc(100% - 25px)" : "3px";
    config.thumb.style.background = enabled ? "#fff" : "var(--text-dim)";
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
      UI.counts.images.textContent = "—";
      UI.counts.videos.textContent = "—";
    }
  }

  // Event Listeners
  UI.main.toggle.addEventListener("change", async (e) => {
    const enabled = e.target.checked;
    updateMainUI(enabled);
    await chrome.runtime.sendMessage({ type: "SET_STATE", enabled });
    if (enabled) setTimeout(fetchMediaCounts, 200);
  });

  UI.blur.toggle.addEventListener("change", async (e) => {
    updateSubUI('blur', e.target.checked);
    await chrome.runtime.sendMessage({ type: "SET_BLUR", enabled: e.target.checked });
  });

  UI.invert.toggle.addEventListener("change", async (e) => {
    updateSubUI('invert', e.target.checked);
    await chrome.runtime.sendMessage({ type: "SET_INVERT", enabled: e.target.checked });
  });

  // Init
  async function init() {
    const [state, blur, invert] = await Promise.all([
      chrome.runtime.sendMessage({ type: "GET_STATE" }),
      chrome.runtime.sendMessage({ type: "GET_BLUR" }),
      chrome.runtime.sendMessage({ type: "GET_INVERT" })
    ]);
    
    updateMainUI(state?.enabled ?? false);
    updateSubUI('blur', blur?.enabled ?? false);
    updateSubUI('invert', invert?.enabled ?? false);

    if (state?.enabled) fetchMediaCounts();
  }

  init();
})();