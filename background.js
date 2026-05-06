// MediaBlock Pro - Background Service Worker
const STORAGE_KEY = "mediaBlockEnabled";
const INVERT_STORAGE_KEY = "mediaInvertEnabled";
const BLUR_STORAGE_KEY = "mediaBlurEnabled";
const HOVER_STORAGE_KEY = "mediaHoverEnabled";
const UNIFORM_STORAGE_KEY = "mediaUniformEnabled";
const TARGET_IMG_KEY = "targetImgEnabled";
const TARGET_VID_KEY = "targetVidEnabled";

async function init() {
  const data = await chrome.storage.local.get({
    [STORAGE_KEY]: false,
    [UNIFORM_STORAGE_KEY]: false,
    [TARGET_IMG_KEY]: true,
    [TARGET_VID_KEY]: true
  });
  
  // Ensure defaults are cached immediately
  await chrome.storage.local.set({
    [TARGET_IMG_KEY]: data[TARGET_IMG_KEY],
    [TARGET_VID_KEY]: data[TARGET_VID_KEY]
  });
  
  await updateDNR();
}

init();

async function updateDNR() {
  const data = await chrome.storage.local.get([STORAGE_KEY, TARGET_IMG_KEY, TARGET_VID_KEY]);
  const blockOn = data[STORAGE_KEY] ?? false;
  const imgOn = data[TARGET_IMG_KEY] ?? true;
  const vidOn = data[TARGET_VID_KEY] ?? true;
  
  const enableRulesetIds = [];
  const disableRulesetIds = ["block_images", "block_videos"];
  
  if (blockOn && imgOn) enableRulesetIds.push("block_images");
  if (blockOn && vidOn) enableRulesetIds.push("block_videos");
  
  const finalDisable = disableRulesetIds.filter(id => !enableRulesetIds.includes(id));
  
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds,
    disableRulesetIds: finalDisable
  });
  
  if (blockOn) {
    chrome.action.setBadgeText({ text: "ON" });
    chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

async function broadcastState(type, enabled) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !tab.url || tab.url.startsWith("chrome")) continue;
    chrome.tabs.sendMessage(tab.id, { type, enabled }).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handleState = async (key, val, type, actionFn) => {
    if (val !== undefined) {
      await chrome.storage.local.set({ [key]: val });
      if (actionFn) await actionFn();
      await broadcastState(type, val);
      sendResponse({ success: true, enabled: val });
    } else {
      const defaultValue = (key === TARGET_IMG_KEY || key === TARGET_VID_KEY) ? true : false;
      const data = await chrome.storage.local.get({ [key]: defaultValue });
      sendResponse({ enabled: data[key] });
    }
  };

  if (message.type === "GET_STATE" || message.type === "SET_STATE") {
    handleState(STORAGE_KEY, message.enabled, "MEDIA_BLOCK_TOGGLE", updateDNR);
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
  
  if (message.type === "GET_UNIFORM" || message.type === "SET_UNIFORM") {
    handleState(UNIFORM_STORAGE_KEY, message.enabled, "MEDIA_UNIFORM_TOGGLE");
    return true;
  }
  
  if (message.type === "GET_TARGET_IMG" || message.type === "SET_TARGET_IMG") {
    handleState(TARGET_IMG_KEY, message.enabled, "MEDIA_TARGET_IMG_TOGGLE", updateDNR);
    return true;
  }
  
  if (message.type === "GET_TARGET_VID" || message.type === "SET_TARGET_VID") {
    handleState(TARGET_VID_KEY, message.enabled, "MEDIA_TARGET_VID_TOGGLE", updateDNR);
    return true;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url || tab.url.startsWith("chrome")) return;
  const data = await chrome.storage.local.get({
    [STORAGE_KEY]: false,
    [INVERT_STORAGE_KEY]: false,
    [BLUR_STORAGE_KEY]: false,
    [HOVER_STORAGE_KEY]: false,
    [UNIFORM_STORAGE_KEY]: false,
    [TARGET_IMG_KEY]: true,
    [TARGET_VID_KEY]: true
  });
  if (data[STORAGE_KEY]) chrome.tabs.sendMessage(tabId, { type: "MEDIA_BLOCK_TOGGLE", enabled: true }).catch(() => {});
  if (data[INVERT_STORAGE_KEY]) chrome.tabs.sendMessage(tabId, { type: "MEDIA_INVERT_TOGGLE", enabled: true }).catch(() => {});
  if (data[BLUR_STORAGE_KEY]) chrome.tabs.sendMessage(tabId, { type: "MEDIA_BLUR_TOGGLE", enabled: true }).catch(() => {});
  if (data[HOVER_STORAGE_KEY]) chrome.tabs.sendMessage(tabId, { type: "MEDIA_HOVER_TOGGLE", enabled: true }).catch(() => {});
  if (data[UNIFORM_STORAGE_KEY]) chrome.tabs.sendMessage(tabId, { type: "MEDIA_UNIFORM_TOGGLE", enabled: true }).catch(() => {});
  chrome.tabs.sendMessage(tabId, { type: "MEDIA_TARGET_IMG_TOGGLE", enabled: data[TARGET_IMG_KEY] }).catch(() => {});
  chrome.tabs.sendMessage(tabId, { type: "MEDIA_TARGET_VID_TOGGLE", enabled: data[TARGET_VID_KEY] }).catch(() => {});
});