// MediaBlock Pro - Popup Script
(function () {
  "use strict";

  const configMap = {
    mediaBlockEnabled: { color: "var(--on-accent)", labelPrefix: "BLOCK" },
    mediaBlurEnabled: { color: "var(--blur-accent)", labelPrefix: "BLUR" },
    mediaInvertEnabled: { color: "var(--invert-accent)", labelPrefix: "INVERT" },
    mediaUniformEnabled: { color: "var(--uniform-accent)", labelPrefix: "UNIFORM VISUALS" },
    mediaHoverEnabled: { color: "var(--hover-accent)", labelPrefix: "HOVER REVEAL" }
  };

  function updateSubUI(key, enabled) {
    if (!configMap[key]) {
      const toggle = document.getElementById(key);
      if (toggle) toggle.checked = enabled;
      return;
    }

    const config = configMap[key];
    document.getElementById(key).checked = enabled;
    
    const card = document.getElementById(`${key}Card`);
    const label = document.getElementById(`${key}Label`);
    const dot = document.getElementById(`${key}Dot`);
    const track = document.getElementById(`${key}Track`);
    const thumb = document.getElementById(`${key}Thumb`);

    label.textContent = enabled ? `${config.labelPrefix} ON` : `${config.labelPrefix} OFF`;
    dot.style.background = enabled ? config.color : "var(--text-dim)";
    dot.style.boxShadow = enabled ? `0 0 8px ${config.color}` : "none";
    track.style.background = enabled ? config.color : "#1e1e26";
    track.style.borderColor = enabled ? config.color : "var(--off-border)";
    thumb.style.left = enabled ? "calc(100% - 25px)" : "3px";
    thumb.style.background = enabled ? "#fff" : "var(--text-dim)";
    
    card.classList.toggle(`active-${key}`, enabled);
    label.style.color = enabled ? config.color : "var(--text-secondary)";
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
        document.getElementById("imgCount").textContent = results[0].result.images;
        document.getElementById("vidCount").textContent = results[0].result.videos;
      }
    } catch (_) {
      document.getElementById("imgCount").textContent = "-";
      document.getElementById("vidCount").textContent = "-";
    }
  }

  async function init() {
    document.getElementById("appVersion").textContent = `v${chrome.runtime.getManifest().version}`;
    
    chrome.runtime.sendMessage({ type: "GET_ALL_STATE" }, (state) => {
      Object.keys(state).forEach(key => updateSubUI(key, state[key]));
    });

    fetchMediaCounts();

    // Bind event listeners
    Object.keys(configMap).concat(['targetImgEnabled', 'targetVidEnabled']).forEach(key => {
      document.getElementById(key).addEventListener('change', (e) => {
        updateSubUI(key, e.target.checked);
        chrome.runtime.sendMessage({ type: "UPDATE_SETTING", key, value: e.target.checked });
      });
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  init();

  // Listen for background syncs (e.g. keyboard shortcut toggles)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SYNC_SETTING") {
      updateSubUI(msg.key, msg.value);
    }
  });
})();