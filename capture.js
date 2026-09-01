// TabMaxxing - Full Page Capture Content Orchestrator
(function () {
  "use strict";

  if (window.__TABMAX_CAPTURE_RUNNING) return;
  window.__TABMAX_CAPTURE_RUNNING = true;

  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function createProgressOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "__tabmax_capture_overlay__";
    overlay.className = "tabmax-capture-overlay";
    overlay.innerHTML = `
      <div class="tabmax-capture-spinner"></div>
      <span id="__tabmax_capture_status__">Capturing page... 0%</span>
      <div class="tabmax-capture-bar-wrap">
        <div class="tabmax-capture-bar-fill" id="__tabmax_capture_fill__"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateProgress(percent) {
    const status = document.getElementById("__tabmax_capture_status__");
    const fill = document.getElementById("__tabmax_capture_fill__");
    const p = Math.min(100, Math.max(0, Math.round(percent)));
    if (status) status.textContent = `Capturing page... ${p}%`;
    if (fill) fill.style.width = `${p}%`;
  }

  async function captureFullPage() {
    const originalScrollY = window.scrollY;
    const originalScrollX = window.scrollX;

    // Inject capture styles if not present
    if (!document.getElementById("__tabmax_capture_css__")) {
      const link = document.createElement("link");
      link.id = "__tabmax_capture_css__";
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("capture.css");
      document.head.appendChild(link);
    }

    const overlay = createProgressOverlay();

    // Hide scrollbars during capture
    document.documentElement.classList.add("tabmax-hide-scrollbars");
    document.body.classList.add("tabmax-hide-scrollbars");

    // Find fixed/sticky elements to avoid duplication during scrolling
    const fixedElements = Array.from(document.querySelectorAll("*")).filter(el => {
      if (el === overlay || el.contains(overlay)) return false;
      const pos = window.getComputedStyle(el).position;
      return (pos === "fixed" || pos === "sticky") && el.offsetHeight > 0 && el.offsetHeight < window.innerHeight * 0.75;
    });

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const totalHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );

    const dpr = window.devicePixelRatio || 1;
    const chunks = [];
    let currentY = 0;
    let chunkIndex = 0;

    try {
      while (currentY < totalHeight) {
        // Scroll to position
        window.scrollTo(0, currentY);

        // Hide sticky/fixed headers on subsequent chunks
        if (chunkIndex > 0) {
          fixedElements.forEach(el => el.classList.add("tabmax-hide-sticky"));
        }

        // Wait for render/repaint
        await sleep(140);

        // Actual scroll position after browser clamping
        const actualY = window.scrollY;

        // Temporarily hide the progress overlay so it is NOT captured in the screenshot
        overlay.style.display = "none";

        // Capture visible slice via background service worker
        const res = await new Promise(resolve => {
          chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB_SLICE" }, resolve);
        });

        // Restore overlay immediately for user progress visibility
        overlay.style.display = "flex";

        if (!res || !res.dataUrl) {
          throw new Error(res?.error || "Capture slice failed");
        }

        const isLastChunk = (currentY + viewportHeight >= totalHeight) || (actualY + viewportHeight >= totalHeight);

        chunks.push({
          dataUrl: res.dataUrl,
          y: actualY,
          chunkHeight: viewportHeight,
          isLast: isLastChunk
        });

        updateProgress(((currentY + viewportHeight) / totalHeight) * 100);

        if (isLastChunk) break;

        // Advance to next viewport
        currentY += viewportHeight;
        chunkIndex++;
      }

      updateProgress(100);
      await sleep(100);

      // Restore DOM state
      fixedElements.forEach(el => el.classList.remove("tabmax-hide-sticky"));
      document.documentElement.classList.remove("tabmax-hide-scrollbars");
      document.body.classList.remove("tabmax-hide-scrollbars");
      window.scrollTo(originalScrollX, originalScrollY);
      overlay.remove();
      window.__TABMAX_CAPTURE_RUNNING = false;

      // Send to background to stitch and launch Viewer
      chrome.runtime.sendMessage({
        action: "OPEN_CAPTURE_VIEWER",
        payload: {
          chunks,
          viewportWidth,
          viewportHeight,
          totalHeight: Math.max(totalHeight, currentY + viewportHeight),
          dpr,
          title: document.title || "Webpage Capture",
          url: window.location.href
        }
      });

    } catch (err) {
      console.error("TabMaxxing Capture Error:", err);
      fixedElements.forEach(el => el.classList.remove("tabmax-hide-sticky"));
      document.documentElement.classList.remove("tabmax-hide-scrollbars");
      document.body.classList.remove("tabmax-hide-scrollbars");
      window.scrollTo(originalScrollX, originalScrollY);
      if (overlay) overlay.remove();
      window.__TABMAX_CAPTURE_RUNNING = false;
      alert(`TabMaxxing Full Page Capture: ${err.message || "Failed to capture page."}`);
    }
  }

  captureFullPage();
})();
