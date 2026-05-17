document.addEventListener('DOMContentLoaded', () => {
  const inputs = {
    targetImgEnabled: document.getElementById('targetImgEnabled'),
    targetVidEnabled: document.getElementById('targetVidEnabled'),
    videoAutoplayPreventEnabled: document.getElementById('videoAutoplayPreventEnabled'),
    videoAutoMuteEnabled: document.getElementById('videoAutoMuteEnabled'),
    forceRightClickEnabled: document.getElementById('forceRightClickEnabled'),
    blurMode: document.getElementById('blurMode'),
    blurIntensity: document.getElementById('blurIntensity'),
    stableVolumeEnabled: document.getElementById('stableVolumeEnabled'),
    audioEqMode: document.getElementById('audioEqMode'),
    shortcutAction: document.getElementById('shortcutAction'),
    browserLockPassword: document.getElementById('browserLockPassword'),
    browserLockPasswordConfirm: document.getElementById('browserLockPasswordConfirm') 
  };
  
  const historyContainer = document.getElementById('historyContainer');
  
  function updateIntensityLabel() {
     document.getElementById('blurIntensityLabel').textContent = inputs.blurMode.value === 'pixelate' ? 'Mosaic Intensity' : 'Blur Intensity';
  }

  function renderHistory(historyArray) {
      historyContainer.innerHTML = '';
      if (!historyArray || historyArray.length === 0) {
          historyContainer.innerHTML = '<div style="padding: 20px; text-align:center; color: var(--text-secondary); font-size:13px;">No recent links. Right click any media to shorten!</div>';
          return;
      }
      
      historyArray.forEach(item => {
         const div = document.createElement('div');
         div.className = 'history-item';
         const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(item.short)}&bgcolor=FFFFFF&color=000000`;
         const qrUrlHighRes = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(item.short)}&bgcolor=FFFFFF&color=000000`;
         
         div.innerHTML = `
            <div class="qr-box" title="Click to expand"><img src="${qrUrl}" alt="QR Code"></div>
            <div class="link-info">
               <a href="${item.short}" target="_blank" class="link-short">${item.short}</a>
               <span class="link-original" title="${item.original}">${item.original}</span>
            </div>
         `;
         
         div.querySelector('.qr-box').addEventListener('click', () => {
            document.getElementById('qrModalImg').src = qrUrlHighRes;
            document.getElementById('qrModal').style.display = 'flex';
         });

         historyContainer.appendChild(div);
      });
  }

  document.getElementById('closeQrModal').addEventListener('click', () => {
      document.getElementById('qrModal').style.display = 'none';
  });
  document.getElementById('qrModal').addEventListener('click', (e) => {
      if(e.target.id === 'qrModal') document.getElementById('qrModal').style.display = 'none';
  });

  function loadSettings() {
    chrome.runtime.sendMessage({ type: "GET_ALL_STATE" }, (state) => {
      if (!state) return;

      inputs.targetImgEnabled.checked = state.targetImgEnabled;
      inputs.targetVidEnabled.checked = state.targetVidEnabled;
      inputs.videoAutoplayPreventEnabled.checked = state.videoAutoplayPreventEnabled;
      inputs.videoAutoMuteEnabled.checked = state.videoAutoMuteEnabled;
      inputs.forceRightClickEnabled.checked = state.forceRightClickEnabled;
      inputs.blurMode.value = state.blurMode;
      inputs.blurIntensity.value = state.blurIntensity;
      inputs.stableVolumeEnabled.checked = state.stableVolumeEnabled;
      inputs.audioEqMode.value = state.audioEqMode;
      inputs.shortcutAction.value = state.shortcutAction;
      
      updateIntensityLabel();
      renderHistory(state.urlHistory);
      
      inputs.browserLockPassword.value = "";
      inputs.browserLockPasswordConfirm.value = "";
      
      if (state.browserLockPassword && state.browserLockPassword !== "") {
        inputs.browserLockPassword.placeholder = "Enter new password...";
        inputs.browserLockPasswordConfirm.placeholder = "Confirm new password...";
        document.getElementById('savePasswordBtn').textContent = "Update";
        document.getElementById('deletePasswordBtn').style.display = "block";
      } else {
        inputs.browserLockPassword.placeholder = "Enter password...";
        inputs.browserLockPasswordConfirm.placeholder = "Confirm password...";
        document.getElementById('savePasswordBtn').textContent = "Save";
        document.getElementById('deletePasswordBtn').style.display = "none";
      }
    });
  }

  loadSettings();

  function updateSetting(key, value) {
    chrome.runtime.sendMessage({ type: "UPDATE_SETTING", key, value });
  }

  ['targetImgEnabled', 'targetVidEnabled', 'videoAutoplayPreventEnabled', 'videoAutoMuteEnabled', 'forceRightClickEnabled', 'stableVolumeEnabled'].forEach(key => {
      inputs[key].addEventListener('change', (e) => updateSetting(key, e.target.checked));
  });

  ['blurMode', 'audioEqMode', 'shortcutAction'].forEach(key => {
      inputs[key].addEventListener('change', (e) => {
          updateSetting(key, e.target.value);
          if (key === 'blurMode') updateIntensityLabel();
      });
  });

  inputs.blurIntensity.addEventListener('input', (e) => updateSetting('blurIntensity', parseInt(e.target.value)));

  // Password Logic
  function showFeedback(msg, isError = false) {
    const feedback = document.getElementById('passwordFeedback');
    feedback.textContent = msg;
    feedback.style.color = isError ? "var(--danger)" : "#10b981"; 
    feedback.style.display = "block";
    setTimeout(() => { feedback.style.display = "none"; }, 3000);
  }

  document.getElementById('savePasswordBtn').addEventListener('click', () => {
    const pw = inputs.browserLockPassword.value;
    const confirmPw = inputs.browserLockPasswordConfirm.value;
    
    if (!pw) {
      showFeedback("Password cannot be empty!", true);
      return; 
    }
    
    if (pw !== confirmPw) {
      showFeedback("Passwords do not match!", true);
      return;
    }

    updateSetting('browserLockPassword', pw);
    
    inputs.browserLockPassword.value = "";
    inputs.browserLockPasswordConfirm.value = "";
    inputs.browserLockPassword.placeholder = "Enter new password...";
    inputs.browserLockPasswordConfirm.placeholder = "Confirm new password...";
    document.getElementById('savePasswordBtn').textContent = "Update";
    document.getElementById('deletePasswordBtn').style.display = "block";
    
    showFeedback("Password saved successfully!");
  });

  document.getElementById('deletePasswordBtn').addEventListener('click', () => {
    if (confirm("Remove your password?")) {
      updateSetting('browserLockPassword', "");
      updateSetting('browserLockEnabled', false); 
      
      inputs.browserLockPassword.value = "";
      inputs.browserLockPasswordConfirm.value = "";
      inputs.browserLockPassword.placeholder = "Enter password...";
      inputs.browserLockPasswordConfirm.placeholder = "Confirm password...";
      document.getElementById('savePasswordBtn').textContent = "Save";
      document.getElementById('deletePasswordBtn').style.display = "none";
      
      showFeedback("Password removed!");
    }
  });

  document.getElementById('clearHistoryBtn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" }, () => {
         renderHistory([]);
      });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SYNC_SETTING" && inputs[msg.key]) {
        if (msg.key === 'blurIntensity' || msg.key === 'shortcutAction' || msg.key === 'blurMode' || msg.key === 'audioEqMode') {
          inputs[msg.key].value = msg.value;
          if (msg.key === 'blurMode') updateIntensityLabel();
        } else if (msg.key !== 'browserLockPassword' && msg.key !== 'browserLockPasswordConfirm') {
          inputs[msg.key].checked = msg.value;
        }
    } else if (msg.type === "SYNC_ALL") loadSettings();
  });
});