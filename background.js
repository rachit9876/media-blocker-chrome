// MediaBlock — Background Service Worker
// Manages blocking state, declarativeNetRequest rules, and coordinates content scripts

const RULE_SET_ID = "block_media";
const STORAGE_KEY = "mediaBlockEnabled";

// ─── Initialization ──────────────────────────────────────────────────────────

async function init() {
  const { mediaBlockEnabled } = await chrome.storage.local.get(STORAGE_KEY);
  const enabled = mediaBlockEnabled ?? false;
  await applyBlockingState(enabled, false);
}

init();

// ─── Core Blocking Logic ─────────────────────────────────────────────────────

async function applyBlockingState(enabled, broadcast = true) {
  // 1. Toggle declarativeNetRequest ruleset (blocks future network requests)
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    enabled
      ? { enableRulesetIds: [RULE_SET_ID] }
      : { disableRulesetIds: [RULE_SET_ID] }
  );

  // 2. Persist state
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });

  // 3. Update badge
  updateBadge(enabled);

  // 4. Broadcast to all content scripts
  if (broadcast) {
    broadcastToAllTabs(enabled);
  }
}

function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: "ON" });
    chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

async function broadcastToAllTabs(enabled) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "MEDIA_BLOCK_TOGGLE",
        enabled
      });
    } catch (_) {
      // Tab may not have content script injected yet — inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["content.js"]
        });
        await chrome.tabs.sendMessage(tab.id, {
          type: "MEDIA_BLOCK_TOGGLE",
          enabled
        });
      } catch (_) {
        // Silently ignore restricted pages
      }
    }
  }
}

// ─── Message Handling ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_STATE") {
    chrome.storage.local.get(STORAGE_KEY).then(({ mediaBlockEnabled }) => {
      sendResponse({ enabled: mediaBlockEnabled ?? false });
    });
    return true; // async response
  }

  if (message.type === "SET_STATE") {
    applyBlockingState(message.enabled).then(() => {
      sendResponse({ success: true, enabled: message.enabled });
    });
    return true;
  }
});

// ─── Tab Updates ──────────────────────────────────────────────────────────────
// When a new page loads, send the current blocking state to its content script

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;

  const { mediaBlockEnabled } = await chrome.storage.local.get(STORAGE_KEY);
  if (!mediaBlockEnabled) return; // No need to message if disabled

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "MEDIA_BLOCK_TOGGLE",
      enabled: true
    });
  } catch (_) {
    // Content script not ready yet — it will read state on its own init
  }
});
