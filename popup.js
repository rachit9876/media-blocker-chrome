// MediaBlock — Popup Script

(function () {
  "use strict";

  const toggle = document.getElementById("toggle");
  const statusLabel = document.getElementById("statusLabel");
  const blockedCount = document.getElementById("blockedCount");
  const imgCount = document.getElementById("imgCount");
  const vidCount = document.getElementById("vidCount");
  const statusCard = document.getElementById("statusCard");

  let currentEnabled = false;

  // ─── Apply UI state ─────────────────────────────────────────────────────────

  function applyUI(enabled) {
    currentEnabled = enabled;
    toggle.checked = enabled;

    if (enabled) {
      document.body.classList.add("is-enabled");
      statusLabel.textContent = "ACTIVE";
      blockedCount.textContent = "ALL MEDIA BLOCKED";
    } else {
      document.body.classList.remove("is-enabled");
      statusLabel.textContent = "INACTIVE";
      blockedCount.textContent = "BLOCKING INACTIVE";
      imgCount.textContent = "0";
      vidCount.textContent = "0";
    }
  }

  // ─── Get live media counts from the active tab ───────────────────────────────

  async function fetchMediaCounts() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return {
            images: document.querySelectorAll("img, picture, svg image").length,
            videos: document.querySelectorAll("video, iframe[src*='youtube'], iframe[src*='vimeo'], iframe[src*='dailymotion']").length
          };
        }
      });

      if (results && results[0] && results[0].result) {
        const { images, videos } = results[0].result;
        imgCount.textContent = images;
        vidCount.textContent = videos;
      }
    } catch (_) {
      // Can't run on special pages — show dashes
      imgCount.textContent = "—";
      vidCount.textContent = "—";
    }
  }

  // ─── Toggle handler ──────────────────────────────────────────────────────────

  toggle.addEventListener("change", async () => {
    const newEnabled = toggle.checked;

    // Immediate UI feedback
    applyUI(newEnabled);

    // Ripple effect
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = "80px";
    ripple.style.left = "110px";
    ripple.style.top = "20px";
    statusCard.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // Send to background
    await chrome.runtime.sendMessage({ type: "SET_STATE", enabled: newEnabled });

    // Update counts after toggling
    if (newEnabled) {
      setTimeout(fetchMediaCounts, 300);
    }
  });

  // ─── Init ────────────────────────────────────────────────────────────────────

  async function init() {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    applyUI(response?.enabled ?? false);

    if (response?.enabled) {
      fetchMediaCounts();
    }
  }

  init();

})();
