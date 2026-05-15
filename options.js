document.addEventListener('DOMContentLoaded', () => {
  const inputs = {
    targetImgEnabled: document.getElementById('targetImgEnabled'),
    targetVidEnabled: document.getElementById('targetVidEnabled'),
    forceRightClickEnabled: document.getElementById('forceRightClickEnabled'),
    stableVolumeEnabled: document.getElementById('stableVolumeEnabled'),
    blurIntensity: document.getElementById('blurIntensity'),
    shortcutAction: document.getElementById('shortcutAction'),
    browserLockPassword: document.getElementById('browserLockPassword')
  };

  // Load settings
  function loadSettings() {
    chrome.runtime.sendMessage({ type: "GET_ALL_STATE" }, (state) => {
      inputs.targetImgEnabled.checked = state.targetImgEnabled;
      inputs.targetVidEnabled.checked = state.targetVidEnabled;
      inputs.forceRightClickEnabled.checked = state.forceRightClickEnabled;
      inputs.stableVolumeEnabled.checked = state.stableVolumeEnabled;
      inputs.blurIntensity.value = state.blurIntensity;
      inputs.shortcutAction.value = state.shortcutAction;
      inputs.browserLockPassword.value = state.browserLockPassword;
    });
  }

  loadSettings();

  function updateSetting(key, value) {
    chrome.runtime.sendMessage({ type: "UPDATE_SETTING", key, value });
  }

  // Bind Listeners
  inputs.targetImgEnabled.addEventListener('change', (e) => updateSetting('targetImgEnabled', e.target.checked));
  inputs.targetVidEnabled.addEventListener('change', (e) => updateSetting('targetVidEnabled', e.target.checked));
  inputs.forceRightClickEnabled.addEventListener('change', (e) => updateSetting('forceRightClickEnabled', e.target.checked));
  inputs.stableVolumeEnabled.addEventListener('change', (e) => updateSetting('stableVolumeEnabled', e.target.checked));
  inputs.shortcutAction.addEventListener('change', (e) => updateSetting('shortcutAction', e.target.value));
  
  inputs.browserLockPassword.addEventListener('input', (e) => {
    updateSetting('browserLockPassword', e.target.value);
  });
  
  // Real-time slider update
  inputs.blurIntensity.addEventListener('input', (e) => {
    updateSetting('blurIntensity', parseInt(e.target.value));
  });

  // Reset logic
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      chrome.runtime.sendMessage({ type: "RESET_DEFAULTS" }, () => {
        loadSettings();
      });
    }
  });

  // Listen for sync from other tabs/popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SYNC_SETTING" && inputs[msg.key]) {
      if (msg.key === 'blurIntensity' || msg.key === 'shortcutAction' || msg.key === 'browserLockPassword') {
        inputs[msg.key].value = msg.value;
      } else {
        inputs[msg.key].checked = msg.value;
      }
    } else if (msg.type === "SYNC_ALL") {
       loadSettings();
    }
  });
});