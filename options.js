document.addEventListener('DOMContentLoaded', () => {
  const lockScreen = document.getElementById('mb-options-lock-screen');

  const inputs = {
    targetImgEnabled: document.getElementById('targetImgEnabled'),
    targetVidEnabled: document.getElementById('targetVidEnabled'),
    forceRightClickEnabled: document.getElementById('forceRightClickEnabled'),
    stableVolumeEnabled: document.getElementById('stableVolumeEnabled'),
    blurIntensity: document.getElementById('blurIntensity'),
    shortcutAction: document.getElementById('shortcutAction'),
    browserLockPassword: document.getElementById('browserLockPassword')
  };
  
  const savePasswordBtn = document.getElementById('savePasswordBtn');
  const deletePasswordBtn = document.getElementById('deletePasswordBtn');

  // Load settings
  function loadSettings() {
    chrome.runtime.sendMessage({ type: "GET_ALL_STATE" }, (state) => {
      if (!state) return;

      // SECURITY PATCH: Enforce lock screen visibility
      lockScreen.style.display = state.browserLockEnabled ? 'flex' : 'none';

      inputs.targetImgEnabled.checked = state.targetImgEnabled;
      inputs.targetVidEnabled.checked = state.targetVidEnabled;
      inputs.forceRightClickEnabled.checked = state.forceRightClickEnabled;
      inputs.stableVolumeEnabled.checked = state.stableVolumeEnabled;
      inputs.blurIntensity.value = state.blurIntensity;
      inputs.shortcutAction.value = state.shortcutAction;
      
      // Do not show the hashed password back to the user
      inputs.browserLockPassword.value = "";
      if (state.browserLockPassword && state.browserLockPassword !== "") {
        inputs.browserLockPassword.placeholder = "******** (Set new password)";
        deletePasswordBtn.style.display = "flex";
      } else {
        inputs.browserLockPassword.placeholder = "Enter password...";
        deletePasswordBtn.style.display = "none";
      }
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
  
  // Real-time slider update
  inputs.blurIntensity.addEventListener('input', (e) => {
    updateSetting('blurIntensity', parseInt(e.target.value));
  });

  // Explicit Save button for password
  savePasswordBtn.addEventListener('click', () => {
    const pw = inputs.browserLockPassword.value;
    if (!pw) return; // Prevent empty saves via the save button
    
    updateSetting('browserLockPassword', pw);
    
    // Visual feedback
    savePasswordBtn.textContent = "Saved!";
    savePasswordBtn.style.background = "#10b981"; // Success Green
    inputs.browserLockPassword.value = "";
    inputs.browserLockPassword.placeholder = "******** (Set new password)";
    deletePasswordBtn.style.display = "flex";
    
    setTimeout(() => {
      savePasswordBtn.textContent = "Save";
      savePasswordBtn.style.background = "var(--accent)";
    }, 2000);
  });

  // Delete Password button listener
  deletePasswordBtn.addEventListener('click', () => {
    if (confirm("Remove your password? This will also turn off the Browser Lock.")) {
      updateSetting('browserLockPassword', "");
      updateSetting('browserLockEnabled', false); // Important: Force unlock
      
      inputs.browserLockPassword.value = "";
      inputs.browserLockPassword.placeholder = "Enter password...";
      deletePasswordBtn.style.display = "none";
    }
  });

  // Reset logic
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm("Factory Reset: Are you sure you want to reset all settings and remove your password?")) {
      chrome.runtime.sendMessage({ type: "RESET_DEFAULTS" }, () => {
        loadSettings();
      });
    }
  });

  // Listen for sync from other tabs/popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SYNC_SETTING") {
      // SECURITY PATCH: Real-time settings block
      if (msg.key === 'browserLockEnabled') {
         lockScreen.style.display = msg.value ? 'flex' : 'none';
      }
      
      if (inputs[msg.key]) {
        if (msg.key === 'blurIntensity' || msg.key === 'shortcutAction') {
          inputs[msg.key].value = msg.value;
        } else if (msg.key === 'browserLockPassword') {
          if (msg.value && msg.value !== "") {
            inputs.browserLockPassword.placeholder = "******** (Set new password)";
            deletePasswordBtn.style.display = "flex";
          } else {
            inputs.browserLockPassword.placeholder = "Enter password...";
            deletePasswordBtn.style.display = "none";
          }
          inputs.browserLockPassword.value = "";
        } else {
          inputs[msg.key].checked = msg.value;
        }
      }
    } else if (msg.type === "SYNC_ALL") {
       loadSettings();
    }
  });
});