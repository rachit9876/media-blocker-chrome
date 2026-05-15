// MediaBlock Pro - Popup Script
(function () {
  "use strict";

  const configMap = {
    mediaBlockEnabled: { color: "var(--on-accent)", labelPrefix: "BLOCK" },
    mediaBlurEnabled: { color: "var(--blur-accent)", labelPrefix: "BLUR" },
    mediaInvertEnabled: { color: "var(--invert-accent)", labelPrefix: "INVERT" },
    mediaUniformEnabled: { color: "var(--uniform-accent)", labelPrefix: "UNIFORM VISUALS" },
    mediaHoverEnabled: { color: "var(--hover-accent)", labelPrefix: "HOVER REVEAL" },
    forceRightClickEnabled: { color: "var(--frc-accent)", labelPrefix: "FORCE RIGHT-CLICK" },
    stableVolumeEnabled: { color: "var(--vol-accent)", labelPrefix: "STABLE VOL" },
    browserLockEnabled: { color: "var(--on-accent)", labelPrefix: "LOCK" }
  };

  function updateSubUI(key, enabled) {
    if (!configMap[key]) {
      const toggle = document.getElementById(key);
      if (toggle) toggle.checked = enabled;
      return;
    }

    const config = configMap[key];
    const toggleEl = document.getElementById(key);
    if(toggleEl) toggleEl.checked = enabled;
    
    const card = document.getElementById(`${key}Card`);
    const label = document.getElementById(`${key}Label`);
    const dot = document.getElementById(`${key}Dot`);
    const track = document.getElementById(`${key}Track`);
    const thumb = document.getElementById(`${key}Thumb`);

    // Ensure we don't overwrite the special "SET PASSWORD" label if disabled
    if (key === 'browserLockEnabled' && toggleEl && toggleEl.disabled) {
       return; 
    }

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

  async function initUrlShortener() {
    const btn = document.getElementById('shortenUrlBtn');
    const statusText = document.getElementById('shortenStatusLabel');

    btn.addEventListener('click', async () => {
      if (statusText.textContent === 'GENERATING...') return;

      try {
        statusText.textContent = 'GENERATING...';
        statusText.style.color = 'var(--text-secondary)';

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab?.url || tab.url.startsWith("chrome://")) {
            statusText.textContent = 'CANNOT SHORTEN BROWSER PAGES';
            statusText.style.color = '#ff3b3b';
            setTimeout(() => { statusText.textContent = 'SHORTEN URL'; statusText.style.color = 'var(--text-secondary)'; }, 3000);
            return;
        }

        chrome.runtime.sendMessage({ type: "SHORTEN_URL", url: tab.url }, async (data) => {
          if (chrome.runtime.lastError || !data) {
            statusText.textContent = 'NETWORK ERROR';
            statusText.style.color = '#ff3b3b';
            return;
          }

          if (data.status === 200) {
            await navigator.clipboard.writeText(data.shorturl);
            statusText.textContent = 'COPIED TO CLIPBOARD!';
            statusText.style.color = '#10b981';
          } else {
            statusText.textContent = `ERROR ${data.status}`;
            statusText.style.color = '#ff3b3b';
          }
        });
      } catch (err) {
        statusText.textContent = 'NETWORK ERROR';
        statusText.style.color = '#ff3b3b';
      }

      setTimeout(() => {
        statusText.textContent = 'SHORTEN URL';
        statusText.style.color = 'var(--text-secondary)';
      }, 3000);
    });
  }

  async function init() {
    const lockPw = document.getElementById('popupLockPw');
    const lockErr = document.getElementById('popupLockErr');
    const lockScreen = document.getElementById('popupLockScreen');
    
    // Track context: Did they click toggle off, or was it already locked when opened?
    let isTogglingOff = false; 
    
    const submitUnlock = () => {
      chrome.runtime.sendMessage({ type: "UNLOCK_ATTEMPT", password: lockPw.value }, (res) => {
        if (res && res.success) {
          lockScreen.style.display = 'none';
          lockPw.value = '';
          lockErr.style.display = 'none';
          isTogglingOff = false;
        } else {
          lockErr.style.display = 'block';
          lockPw.value = '';
          lockPw.focus();
        }
      });
    };
    
    document.getElementById('popupLockBtn').addEventListener('click', submitUnlock);
    
    document.getElementById('popupLockCancel').addEventListener('click', () => {
      if (isTogglingOff) {
        // They were trying to toggle off, cancel reverts toggle visually
        lockScreen.style.display = 'none';
        lockPw.value = '';
        lockErr.style.display = 'none';
        updateSubUI('browserLockEnabled', true);
        isTogglingOff = false;
      } else {
        // They opened the popup while fully locked, cancel means close popup
        window.close();
      }
    });

    lockPw.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitUnlock(); });

    document.getElementById("appVersion").textContent = `v${chrome.runtime.getManifest().version}`;
    
    chrome.runtime.sendMessage({ type: "GET_ALL_STATE" }, (state) => {
      if(!state) return;
      
      // SECURITY PATCH: Enforce popup lock screen immediately if globally locked
      if (state.browserLockEnabled) {
        lockScreen.style.display = 'flex';
        isTogglingOff = false; 
        setTimeout(() => lockPw.focus(), 100);
      }

      const lockToggle = document.getElementById('browserLockEnabled');
      const lockLabel = document.getElementById('browserLockEnabledLabel');
      
      if (!state.browserLockPassword) {
        if(lockToggle) {
           lockToggle.disabled = true;
           lockToggle.parentElement.style.cursor = 'not-allowed';
           document.getElementById('browserLockEnabledTrack').style.opacity = '0.4';
           document.getElementById('browserLockEnabledCard').style.opacity = '0.6';
           lockLabel.textContent = "SET PASSWORD FIRST";
           lockLabel.style.color = "var(--text-secondary)";
        }
      }

      Object.keys(state).forEach(key => updateSubUI(key, state[key]));
    });

    fetchMediaCounts();
    initUrlShortener();

    const lockToggle = document.getElementById('browserLockEnabled');
    if (lockToggle) {
      lockToggle.addEventListener('change', (e) => {
        if(lockToggle.disabled) {
           e.preventDefault();
           return;
        }

        const isTurningOn = e.target.checked;
        updateSubUI('browserLockEnabled', isTurningOn);
        
        if (isTurningOn) {
           chrome.runtime.sendMessage({ type: "UPDATE_SETTING", key: "browserLockEnabled", value: true });
        } else {
           isTogglingOff = true;
           lockScreen.style.display = 'flex';
           setTimeout(() => lockPw.focus(), 100);
        }
      });
    }

    Object.keys(configMap).concat(['targetImgEnabled', 'targetVidEnabled']).forEach(key => {
      if (key === 'browserLockEnabled') return;
      const el = document.getElementById(key);
      if(el) {
        el.addEventListener('change', (e) => {
          updateSubUI(key, e.target.checked);
          chrome.runtime.sendMessage({ type: "UPDATE_SETTING", key, value: e.target.checked });
        });
      }
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  init();

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SYNC_SETTING") {
      updateSubUI(msg.key, msg.value);
    }
  });
})();