// MediaBlock Pro - Background Service Worker
const RULE_SET_ID = "block_media";
const STORAGE_KEY = "mediaBlockEnabled";
const INVERT_STORAGE_KEY = "mediaInvertEnabled";
const BLUR_STORAGE_KEY = "mediaBlurEnabled";
const HOVER_STORAGE_KEY = "mediaHoverEnabled";

async function init() {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  await applyBlockingState(data[STORAGE_KEY] ?? false, false);
}
init();

async function applyBlockingState(enabled, broadcast = true) {
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    enabled ? { enableRulesetIds: [RULE_SET_ID] } : { disableRulesetIds: [RULE_SET_ID] }
  );
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
  
  if (enabled) {
    chrome.action.setBadgeText({ text: "ON" });
    chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
  
  if (broadcast) broadcastState("MEDIA_BLOCK_TOGGLE", enabled);
}

async function broadcastState(type, enabled) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !tab.url || tab.url.startsWith("chrome")) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, { type, enabled });
    } catch (_) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["content.js"]
        });
        await chrome.tabs.sendMessage(tab.id, { type, enabled });
      } catch (err) {}
    }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handleState = async (key, val, type, actionFn) => {
    if (val !== undefined) {
      await chrome.storage.local.set({ [key]: val });
      if (actionFn) await actionFn(val);
      else await broadcastState(type, val);
      sendResponse({ success: true, enabled: val });
    } else {
      const data = await chrome.storage.local.get(key);
      sendResponse({ enabled: data[key] ?? false });
    }
  };

  if (message.type === "GET_STATE" || message.type === "SET_STATE") {
    handleState(STORAGE_KEY, message.enabled, "MEDIA_BLOCK_TOGGLE", applyBlockingState);
    return true;
  }
  if (message.type === "GET_INVERT" || message.type === "SET_INVERT") {
    handleState(INVERT_STORAGE_KEY, message.enabled, "MEDIA_INVERT_TOGGLE");
    return true;
  }
  if (message.type === "GET_BLUR" || message.type === "SET_BLUR") {
    handleState(BLUR_STORAGE_KEY, message.enabled, "MEDIA_BLUR_TOGGLE");
    return true;
  }
  if (message.type === "GET_HOVER" || message.type === "SET_HOVER") {
    handleState(HOVER_STORAGE_KEY, message.enabled, "MEDIA_HOVER_TOGGLE");
    return true;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url || tab.url.startsWith("chrome")) return;
  const data = await chrome.storage.local.get([STORAGE_KEY, INVERT_STORAGE_KEY, BLUR_STORAGE_KEY, HOVER_STORAGE_KEY]);
  try {
    if (data[STORAGE_KEY]) chrome.tabs.sendMessage(tabId, { type: "MEDIA_BLOCK_TOGGLE", enabled: true });
    if (data[INVERT_STORAGE_KEY]) chrome.tabs.sendMessage(tabId, { type: "MEDIA_INVERT_TOGGLE", enabled: true });
    if (data[BLUR_STORAGE_KEY]) chrome.tabs.sendMessage(tabId, { type: "MEDIA_BLUR_TOGGLE", enabled: true });
    if (data[HOVER_STORAGE_KEY]) chrome.tabs.sendMessage(tabId, { type: "MEDIA_HOVER_TOGGLE", enabled: true });
  } catch (_) {}
});