// MediaBlock Pro - Background Service Worker
const DEFAULTS = {
  mediaBlockEnabled: false,
  mediaInvertEnabled: false,
  mediaBlurEnabled: false,
  mediaHoverEnabled: false,
  mediaUniformEnabled: false,
  forceRightClickEnabled: false,
  stableVolumeEnabled: false,
  targetImgEnabled: true,
  targetVidEnabled: true,
  blurIntensity: 25,
  shortcutAction: "toggle_blur",
  browserLockEnabled: false,
  browserLockPassword: ""
};

// Security: Hash password before storing it
async function hashPassword(password) {
  if (!password) return "";
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function init() {
  const data = await chrome.storage.local.get(DEFAULTS);
  await chrome.storage.local.set(data);
  await updateDNR();
}

init();

async function updateDNR() {
  try {
    const data = await chrome.storage.local.get(['mediaBlockEnabled', 'targetImgEnabled', 'targetVidEnabled']);
    const blockOn = data.mediaBlockEnabled;
    
    const enableRulesetIds = [];
    if (blockOn && data.targetImgEnabled) enableRulesetIds.push("block_images");
    if (blockOn && data.targetVidEnabled) enableRulesetIds.push("block_videos");
    
    const disableRulesetIds = ["block_images", "block_videos"].filter(id => !enableRulesetIds.includes(id));
    
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds, disableRulesetIds });
    
    if (blockOn) {
      chrome.action.setBadgeText({ text: "ON" });
      chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" }); // Red
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (error) {
    console.error("MediaBlock Pro: DNR Update Failed", error);
  }
}

async function broadcastState(type, payload) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    // OPTIMIZATION: Only inject into active web pages, ignoring all browser-specific pages
    if (!tab.id || !tab.url || !tab.url.startsWith("http")) continue;
    chrome.tabs.sendMessage(tab.id, { type, ...payload }).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_ALL_STATE") {
    chrome.storage.local.get(DEFAULTS).then(sendResponse);
    return true;
  }

  if (message.type === "UPDATE_SETTING") {
    if (message.key === 'browserLockPassword') {
      hashPassword(message.value).then(hashed => {
        chrome.storage.local.set({ browserLockPassword: hashed }).then(() => {
          // We don't broadcast passwords to tabs
          sendResponse({ success: true });
        });
      });
      return true;
    }

    chrome.storage.local.set({ [message.key]: message.value }).then(() => {
      if (['mediaBlockEnabled', 'targetImgEnabled', 'targetVidEnabled'].includes(message.key)) {
        updateDNR();
      }
      broadcastState("SYNC_SETTING", { key: message.key, value: message.value });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "RESET_DEFAULTS") {
    chrome.storage.local.set(DEFAULTS).then(() => {
      updateDNR();
      broadcastState("SYNC_ALL", DEFAULTS);
      sendResponse(DEFAULTS);
    });
    return true;
  }

  if (message.type === "SHORTEN_URL") {
    shortenUrlAPI(message.url).then(sendResponse).catch(err => sendResponse({ status: 500, message: err.toString() }));
    return true;
  }

  if (message.type === "CHECK_LOCK") {
    chrome.storage.local.get(['browserLockEnabled']).then((local) => {
      sendResponse({ locked: local.browserLockEnabled });
    });
    return true;
  }

  if (message.type === "UNLOCK_ATTEMPT") {
    Promise.all([
      hashPassword(message.password),
      chrome.storage.local.get(['browserLockPassword'])
    ]).then(([hashedInput, local]) => {
      if (hashedInput === local.browserLockPassword && local.browserLockPassword !== "") {
        chrome.storage.local.set({ browserLockEnabled: false }).then(() => {
          broadcastState("SYNC_SETTING", { key: "browserLockEnabled", value: false });
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "custom-shortcut") {
    const data = await chrome.storage.local.get(DEFAULTS);
    const action = data.shortcutAction;

    if (action === "open_settings") {
      chrome.runtime.openOptionsPage();
    } else if (action === "toggle_block") {
      const newState = !data.mediaBlockEnabled;
      await chrome.storage.local.set({ mediaBlockEnabled: newState });
      updateDNR();
      broadcastState("SYNC_SETTING", { key: "mediaBlockEnabled", value: newState });
    } else if (action === "toggle_blur") {
      const newState = !data.mediaBlurEnabled;
      await chrome.storage.local.set({ mediaBlurEnabled: newState });
      broadcastState("SYNC_SETTING", { key: "mediaBlurEnabled", value: newState });
    } else if (action === "toggle_invert") {
      const newState = !data.mediaInvertEnabled;
      await chrome.storage.local.set({ mediaInvertEnabled: newState });
      broadcastState("SYNC_SETTING", { key: "mediaInvertEnabled", value: newState });
    }
  }
});

// --- SMART CONTEXT MENUS (RIGHT CLICK) ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "shorten_page",
    title: "Copy Short URL (Current Page)",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "shorten_media",
    title: "Copy Short URL (This Media)",
    contexts: ["image", "video", "audio"]
  });

  chrome.contextMenus.create({
    id: "shorten_link",
    title: "Copy Short URL (This Link)",
    contexts: ["link"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let targetUrl = "";

  if (info.menuItemId === "shorten_page") {
    targetUrl = info.pageUrl;
  } else if (info.menuItemId === "shorten_media") {
    targetUrl = info.srcUrl; 
  } else if (info.menuItemId === "shorten_link") {
    targetUrl = info.linkUrl; 
  }

  if (targetUrl) {
    if (targetUrl.startsWith('data:') || targetUrl.startsWith('blob:')) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          alert("MediaBlock Pro: Cannot shorten this image. It is embedded directly as code (Data URI) and does not have a public web link.");
        }
      });
      return; 
    }
    generateAndCopyShortUrl(targetUrl, tab.id);
  }
});

async function shortenUrlAPI(longUrl) {
  const apiKey = 'fcdc158ebe36c6c0408bcb6c7e9a2fde';
  const params = new URLSearchParams({
    key: apiKey,
    url: longUrl,
    analytics: 'true',
    filterbots: 'false'
  });

  const response = await fetch(`https://xgd.io/V1/shorten?${params.toString()}`);
  return await response.json();
}

async function generateAndCopyShortUrl(longUrl, tabId) {
  chrome.action.setBadgeText({ text: "..." });
  chrome.action.setBadgeBackgroundColor({ color: "#F59E0B" });

  try {
    const data = await shortenUrlAPI(longUrl);

    if (data.status === 200) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: (shortenedText) => {
            navigator.clipboard.writeText(shortenedText).then(() => {
              console.log("MediaBlock Pro: Short URL copied to clipboard ->", shortenedText);
            }).catch(err => console.error("MediaBlock Pro: Clipboard copy failed.", err));
          },
          args: [data.shorturl]
        });
      } catch (scriptErr) {
        console.warn("MediaBlock Pro: Could not inject script to copy to clipboard.", scriptErr);
      }
    } else {
      console.error(`MediaBlock Pro API Error ${data.status}: ${data.message}`);
    }
  } catch (error) {
    console.error('MediaBlock Pro Fetch Error:', error);
  } finally {
    updateDNR();
  }
}