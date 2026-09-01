// TabMaxxing - Instagram Downloader & 1-Click Live Copier (insta-dl)
(function () {
  "use strict";
  if (window.__INSTA_DL_LOADED) return;
  window.__INSTA_DL_LOADED = true;

  let isEnabled = true;
  let isCopyEnabled = true;

  // Initialize settings
  chrome.storage.local.get({ instaDlEnabled: true, instaDlCopyEnabled: true }, (items) => {
    isEnabled = items.instaDlEnabled !== false;
    isCopyEnabled = items.instaDlCopyEnabled !== false;
    if (isEnabled) startObserver();
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
      if (changes.instaDlEnabled !== undefined) {
        isEnabled = changes.instaDlEnabled.newValue !== false;
        if (isEnabled) {
          startObserver();
          scanPage();
        } else {
          removeAllInjectedUI();
        }
      }
      if (changes.instaDlCopyEnabled !== undefined) {
        isCopyEnabled = changes.instaDlCopyEnabled.newValue !== false;
        scanPage();
      }
    }
  });

  // SVG Icons
  const ICONS = {
    download: `<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
    image: `<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
    video: `<svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    dropdown: `<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>`
  };

  // Toast Notification system
  function showToast(message, type = "success") {
    let toast = document.getElementById("__insta_dl_toast__");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "__insta_dl_toast__";
      document.body.appendChild(toast);
    }
    toast.className = `insta-dl-toast insta-dl-toast-${type} show`;
    toast.innerHTML = `<span>${type === "success" ? "✨" : "ℹ️"}</span> <span>${message}</span>`;
    
    clearTimeout(toast.__timer);
    toast.__timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  // Extract Highest Resolution Image URL from <img> or srcset
  function getBestImageUrl(imgEl) {
    if (!imgEl) return null;
    const srcset = imgEl.getAttribute("srcset");
    if (srcset) {
      const candidates = srcset.split(",").map(part => {
        const [url, widthStr] = part.trim().split(/\s+/);
        const width = widthStr ? parseInt(widthStr.replace("w", ""), 10) : 0;
        return { url, width };
      });
      candidates.sort((a, b) => b.width - a.width);
      if (candidates.length && candidates[0].url) {
        return candidates[0].url;
      }
    }
    return imgEl.currentSrc || imgEl.src || null;
  }

  // Extract Video URL from <video>
  function getVideoUrl(videoEl) {
    if (!videoEl) return null;
    if (videoEl.src && !videoEl.src.startsWith("blob:")) {
      return videoEl.src;
    }
    const source = videoEl.querySelector("source");
    if (source && source.src && !source.src.startsWith("blob:")) {
      return source.src;
    }
    return videoEl.currentSrc || videoEl.src || null;
  }

  // Extract Post Shortcode and Username
  function getPostMeta(postEl) {
    let username = "instagram_user";
    let shortcode = Date.now().toString();

    // Find username
    const userLink = postEl.querySelector('header a[role="link"], a[href^="/"][role="link"]');
    if (userLink) {
      const u = userLink.getAttribute("href")?.replace(/\//g, "").trim();
      if (u) username = u;
    }

    // Find shortcode from post link or time link
    const timeLink = postEl.querySelector('a[href*="/p/"], a[href*="/reel/"]');
    if (timeLink) {
      const match = timeLink.getAttribute("href")?.match(/\/(p|reel)\/([^\/?#]+)/);
      if (match && match[2]) shortcode = match[2];
    }

    return { username, shortcode };
  }

  // 1-Click Live Clipboard Copier
  async function copyImageToClipboard(imageUrl, optionalVideoEl = null) {
    try {
      showToast("Copying to clipboard...", "info");

      let blob = null;

      // If a video element is passed, capture frame directly via canvas
      if (optionalVideoEl && optionalVideoEl.videoWidth > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = optionalVideoEl.videoWidth;
        canvas.height = optionalVideoEl.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(optionalVideoEl, 0, 0, canvas.width, canvas.height);
        blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      } else if (imageUrl) {
        // Fetch image via background to bypass CORS canvas tainting
        const res = await new Promise(resolve => {
          chrome.runtime.sendMessage({ action: "FETCH_MEDIA_AS_BASE64", url: imageUrl }, resolve);
        });

        if (res && res.success && res.dataUrl) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = res.dataUrl;
          });

          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        } else {
          throw new Error("Unable to fetch image data");
        }
      }

      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        showToast("Image copied to clipboard! (Ready to paste)", "success");
      } else {
        throw new Error("Blob creation failed");
      }
    } catch (err) {
      console.warn("MediaBlock Pro insta-dl copy error:", err);
      // Fallback: Copy URL text to clipboard
      if (imageUrl) {
        await navigator.clipboard.writeText(imageUrl);
        showToast("Direct Image URL copied!", "success");
      } else {
        showToast("Could not copy image directly", "info");
      }
    }
  }

  // Trigger Download via Background Worker
  function triggerDownload(url, filename) {
    showToast("Downloading media... 📥", "info");
    chrome.runtime.sendMessage({
      action: "DOWNLOAD_MEDIA",
      url: url,
      filename: filename
    }, (res) => {
      if (res && res.success) {
        showToast("Download started!", "success");
      } else {
        showToast(res?.error || "Download error", "info");
      }
    });
  }

  // Helper to create Action Bar for Posts
  function createPostActionBar(postEl) {
    const bar = document.createElement("div");
    bar.className = "insta-dl-bar";
    bar.dataset.instaDl = "true";

    const { username, shortcode } = getPostMeta(postEl);

    // Download Button
    const dlBtn = document.createElement("button");
    dlBtn.className = "insta-dl-btn insta-dl-btn-dl";
    dlBtn.innerHTML = `${ICONS.download} <span>Download</span>`;
    dlBtn.title = "Download media in highest resolution";

    dlBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Find active media inside the post
      const video = postEl.querySelector("video");
      const img = postEl.querySelector('article img[src], div[role="button"] img[src], img[srcset]');

      if (video && video.offsetParent !== null) {
        const vidUrl = getVideoUrl(video);
        if (vidUrl) {
          triggerDownload(vidUrl, `${username}_${shortcode}.mp4`);
          return;
        }
      }

      if (img) {
        const imgUrl = getBestImageUrl(img);
        if (imgUrl) {
          triggerDownload(imgUrl, `${username}_${shortcode}.jpg`);
          return;
        }
      }

      showToast("No downloadable media found in post", "info");
    });

    bar.appendChild(dlBtn);

    // Live Copy Button (if enabled)
    if (isCopyEnabled) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "insta-dl-btn insta-dl-btn-copy";
      copyBtn.innerHTML = `${ICONS.copy} <span>Copy</span>`;
      copyBtn.title = "Copy image / frame to clipboard for instant pasting";

      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();

        const video = postEl.querySelector("video");
        const img = postEl.querySelector('article img[src], div[role="button"] img[src], img[srcset]');

        if (video && video.offsetParent !== null && video.videoWidth > 0) {
          copyImageToClipboard(null, video);
        } else if (img) {
          const imgUrl = getBestImageUrl(img);
          if (imgUrl) {
            copyImageToClipboard(imgUrl);
          }
        } else {
          showToast("No image to copy", "info");
        }
      });

      bar.appendChild(copyBtn);
    }

    return bar;
  }

  // Inject into Feed and Profile Posts
  function processPosts() {
    const articles = document.querySelectorAll("article:not([data-insta-dl-processed])");
    articles.forEach(article => {
      article.setAttribute("data-insta-dl-processed", "true");

      // Find action buttons container (like, comment, share bar)
      const actionSection = article.querySelector('section');
      if (actionSection && !article.querySelector(".insta-dl-bar")) {
        const bar = createPostActionBar(article);
        actionSection.parentNode.insertBefore(bar, actionSection.nextSibling);
      }
    });
  }

  // Inject into Instagram Story Viewer
  function processStories() {
    const storyHeader = document.querySelector('section header, div[role="dialog"] header');
    if (!storyHeader || storyHeader.querySelector(".insta-dl-story-bar")) return;

    // Detect if we are on a stories URL
    if (!window.location.pathname.includes("/stories/")) return;

    const bar = document.createElement("div");
    bar.className = "insta-dl-story-bar";

    // Extract username from story header
    let username = "story";
    const userEl = storyHeader.querySelector('a[role="link"], span[role="link"], h2, a');
    if (userEl) {
      const u = userEl.textContent.trim();
      if (u) username = u;
    }

    // Download Button
    const dlBtn = document.createElement("button");
    dlBtn.className = "insta-dl-btn insta-dl-btn-dl";
    dlBtn.innerHTML = `${ICONS.download} <span>Download</span>`;
    dlBtn.title = "Download current story item";

    dlBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Carefully inspect active story container
      const storyContainer = document.querySelector('section[role="region"], div[role="dialog"], section');
      if (!storyContainer) return;

      // Accurate Check: Check if active visible item is a video or image
      const activeVideo = Array.from(storyContainer.querySelectorAll("video")).find(v => {
        return v.offsetWidth > 100 && v.offsetHeight > 100 && !v.paused;
      }) || storyContainer.querySelector("video");

      const activeImg = Array.from(storyContainer.querySelectorAll("img")).find(img => {
        return img.offsetWidth > 100 && img.offsetHeight > 100 && img.src && !img.src.includes("profile_pic");
      });

      // If active video is playing and visible
      if (activeVideo && activeVideo.offsetWidth > 100 && !activeVideo.paused) {
        const vidUrl = getVideoUrl(activeVideo);
        if (vidUrl) {
          triggerDownload(vidUrl, `${username}_story_${Date.now()}.mp4`);
          return;
        }
      }

      // If active image exists (static photo story)
      if (activeImg) {
        const imgUrl = getBestImageUrl(activeImg);
        if (imgUrl) {
          triggerDownload(imgUrl, `${username}_story_${Date.now()}.jpg`);
          return;
        }
      }

      // Fallback
      if (activeVideo) {
        const vidUrl = getVideoUrl(activeVideo);
        if (vidUrl) {
          triggerDownload(vidUrl, `${username}_story_${Date.now()}.mp4`);
          return;
        }
      }

      showToast("No active story media found", "info");
    });

    bar.appendChild(dlBtn);

    // Live Copy Button for Stories
    if (isCopyEnabled) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "insta-dl-btn insta-dl-btn-copy";
      copyBtn.innerHTML = `${ICONS.copy} <span>Copy</span>`;
      copyBtn.title = "Copy story photo/frame to clipboard";

      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();

        const storyContainer = document.querySelector('section[role="region"], div[role="dialog"], section');
        if (!storyContainer) return;

        const activeImg = Array.from(storyContainer.querySelectorAll("img")).find(img => {
          return img.offsetWidth > 100 && img.offsetHeight > 100 && img.src && !img.src.includes("profile_pic");
        });

        const activeVideo = storyContainer.querySelector("video");

        if (activeImg) {
          const imgUrl = getBestImageUrl(activeImg);
          if (imgUrl) {
            copyImageToClipboard(imgUrl);
            return;
          }
        }

        if (activeVideo && activeVideo.videoWidth > 0) {
          copyImageToClipboard(null, activeVideo);
          return;
        }

        showToast("No story image found to copy", "info");
      });

      bar.appendChild(copyBtn);
    }

    // Insert into story header
    storyHeader.insertBefore(bar, storyHeader.firstChild);
  }

  // Inject into Reels Viewer
  function processReels() {
    const reelContainers = document.querySelectorAll('div[role="dialog"] video, div[aria-label*="Reel"] video');
    reelContainers.forEach(video => {
      const parent = video.closest('div[role="dialog"]') || video.parentElement;
      if (!parent || parent.querySelector(".insta-dl-bar")) return;

      const bar = document.createElement("div");
      bar.className = "insta-dl-bar insta-dl-overlay";

      const dlBtn = document.createElement("button");
      dlBtn.className = "insta-dl-btn insta-dl-btn-dl";
      dlBtn.innerHTML = `${ICONS.download} <span>Reel</span>`;
      dlBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const vidUrl = getVideoUrl(video);
        if (vidUrl) {
          triggerDownload(vidUrl, `reel_${Date.now()}.mp4`);
        }
      });
      bar.appendChild(dlBtn);

      if (isCopyEnabled) {
        const copyBtn = document.createElement("button");
        copyBtn.className = "insta-dl-btn insta-dl-btn-copy";
        copyBtn.innerHTML = `${ICONS.copy} <span>Frame</span>`;
        copyBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          copyImageToClipboard(null, video);
        });
        bar.appendChild(copyBtn);
      }

      parent.style.position = "relative";
      parent.appendChild(bar);
    });
  }

  function removeAllInjectedUI() {
    document.querySelectorAll(".insta-dl-bar, .insta-dl-story-bar").forEach(el => el.remove());
    document.querySelectorAll("[data-insta-dl-processed]").forEach(el => el.removeAttribute("data-insta-dl-processed"));
  }

  function scanPage() {
    if (!isEnabled) return;
    processPosts();
    processStories();
    processReels();
  }

  // Debounced Mutation Observer
  let scanTimer = null;
  let observer = null;

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(scanPage, 150);
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    scanPage();
  }

})();
