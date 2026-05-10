// MediaBlock Pro - Background Service Worker
const DEFAULTS = {
  mediaBlockEnabled: false,
  mediaInvertEnabled: false,
  mediaBlurEnabled: false,
  mediaHoverEnabled: false,
  mediaUniformEnabled: false,
  forceRightClickEnabled: false,
  stableVolumeEnabled: false, // NEW FEATURE DEFAULT
  targetImgEnabled: true,
  targetVidEnabled: true,
  blurIntensity: 25,
  shortcutAction: "toggle_blur"
};

async function init() {
  const data = await chrome.storage.local.get(DEFAULTS);
  await chrome.storage.local.set(data);
  await updateDNR();
}

init();

async function updateDNR() {
  const data = await chrome.storage.local.get(['mediaBlockEnabled', 'targetImgEnabled', 'targetVidEnabled']);
  const blockOn = data.mediaBlockEnabled;
  
  const enableRulesetIds = [];
  if (blockOn && data.targetImgEnabled) enableRulesetIds.push("block_images");
  if (blockOn && data.targetVidEnabled) enableRulesetIds.push("block_videos");
  
  const disableRulesetIds = ["block_images", "block_videos"].filter(id => !enableRulesetIds.includes(id));
  
  await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds, disableRulesetIds });
  
  if (blockOn) {
    chrome.action.setBadgeText({ text: "ON" });
    chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

async function broadcastState(type, payload) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !tab.url || tab.url.startsWith("chrome")) continue;
    chrome.tabs.sendMessage(tab.id, { type, ...payload }).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_ALL_STATE") {
    chrome.storage.local.get(DEFAULTS).then(sendResponse);
    return true;
  }

  if (message.type === "UPDATE_SETTING") {
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