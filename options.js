document.addEventListener('DOMContentLoaded', () => {
  const inputs = {
    targetImgEnabled: document.getElementById('targetImgEnabled'),
    targetVidEnabled: document.getElementById('targetVidEnabled'),
    forceRightClickEnabled: document.getElementById('forceRightClickEnabled'),
    darkModeEnabled: document.getElementById('darkModeEnabled'),
    blurMode: document.getElementById('blurMode'),
    blurIntensity: document.getElementById('blurIntensity'),
    stableVolumeEnabled: document.getElementById('stableVolumeEnabled'),
    audioEqMode: document.getElementById('audioEqMode'),
    shortcutAction: document.getElementById('shortcutAction'),
    textAlternativesEnabled: document.getElementById('textAlternativesEnabled'),
    textSpoofingEnabled: document.getElementById('textSpoofingEnabled'),
    textSpoofingSeed: document.getElementById('textSpoofingSeed'),
    browserLockPassword: document.getElementById('browserLockPassword'),
    browserLockPasswordConfirm: document.getElementById('browserLockPasswordConfirm'),
    domainLockEnabled: document.getElementById('domainLockEnabled')
  };
  
  const historyContainer = document.getElementById('historyContainer');

  function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
      }[char]));
  }
  
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
         const div = document.createElement('div'); div.className = 'history-item';
         const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(item.short)}&bgcolor=FFFFFF&color=000000`;
         const qrUrlHighRes = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(item.short)}&bgcolor=FFFFFF&color=000000`;
         const shortUrl = escapeHtml(item.short);
         const originalUrl = escapeHtml(item.original);
         
         div.innerHTML = `
            <div class="qr-box" title="Click to expand"><img src="${qrUrl}" alt="QR Code"></div>
            <div class="link-info">
               <a href="${shortUrl}" target="_blank" rel="noopener noreferrer" class="link-short">${shortUrl}</a>
               <span class="link-original" title="${originalUrl}">${originalUrl}</span>
            </div>
         `;
         
         div.querySelector('.qr-box').addEventListener('click', () => {
            document.getElementById('qrModalImg').src = qrUrlHighRes;
            document.getElementById('qrModal').style.display = 'flex';
         });
         historyContainer.appendChild(div);
      });
  }
  
  function renderLockedDomains(domains) {
      const container = document.getElementById('lockedDomainsList');
      container.innerHTML = '';
      if (!domains || domains.length === 0) {
          container.innerHTML = '<div style="color: var(--text-secondary); font-size: 12px; padding: 4px;">No domains locked.</div>';
          return;
      }
      domains.forEach(domain => {
          const div = document.createElement('div');
          div.style.cssText = "display: flex; justify-content: space-between; background: #1e1e26; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--off-border); font-size: 13px; align-items: center;";
          const safeDomain = escapeHtml(domain);
          div.innerHTML = `<span>${safeDomain}</span> <button data-domain="${safeDomain}" class="remove-domain-btn" style="background:transparent; border:none; color:var(--danger); cursor:pointer; font-weight:bold; transition: 0.2s;">X</button>`;
          container.appendChild(div);
      });
      
      document.querySelectorAll('.remove-domain-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const toRemove = e.target.getAttribute('data-domain');
              chrome.storage.local.get(['lockedDomains'], (res) => {
                  const updated = (res.lockedDomains || []).filter(d => d !== toRemove);
                  updateSetting("lockedDomains", updated);
              });
          });
      });
  }

  document.getElementById('closeQrModal').addEventListener('click', () => document.getElementById('qrModal').style.display = 'none');
  document.getElementById('qrModal').addEventListener('click', (e) => { if(e.target.id === 'qrModal') document.getElementById('qrModal').style.display = 'none'; });

  function loadSettings() {
    chrome.runtime.sendMessage({ type: "GET_ALL_STATE" }, (state) => {
      if (!state) return;

      inputs.targetImgEnabled.checked = state.targetImgEnabled;
      inputs.targetVidEnabled.checked = state.targetVidEnabled;
      inputs.forceRightClickEnabled.checked = state.forceRightClickEnabled;
      inputs.darkModeEnabled.checked = state.darkModeEnabled;
      inputs.blurMode.value = state.blurMode;
      inputs.blurIntensity.value = state.blurIntensity;
      inputs.stableVolumeEnabled.checked = state.stableVolumeEnabled;
      inputs.audioEqMode.value = state.audioEqMode;
      inputs.shortcutAction.value = state.shortcutAction;
      
      if(inputs.textAlternativesEnabled) {
          inputs.textAlternativesEnabled.checked = state.textAlternativesEnabled || false;
      }
      if(inputs.textSpoofingEnabled) {
          inputs.textSpoofingEnabled.checked = state.textSpoofingEnabled || false;
      }
      if(inputs.textSpoofingSeed) {
          inputs.textSpoofingSeed.value = state.textSpoofingSeed || "mediablock";
      }
      if(inputs.domainLockEnabled) {
          inputs.domainLockEnabled.checked = state.domainLockEnabled || false;
      }
      
      updateIntensityLabel();
      renderHistory(state.urlHistory);
      renderLockedDomains(state.lockedDomains || []);
      
      inputs.browserLockPassword.value = ""; inputs.browserLockPasswordConfirm.value = "";
      
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

  ['targetImgEnabled', 'targetVidEnabled', 'forceRightClickEnabled', 'stableVolumeEnabled', 'darkModeEnabled', 'textAlternativesEnabled', 'textSpoofingEnabled', 'domainLockEnabled'].forEach(key => {
      if (inputs[key]) {
          inputs[key].addEventListener('change', (e) => updateSetting(key, e.target.checked));
      }
  });

  if (inputs.textSpoofingSeed) {
      inputs.textSpoofingSeed.addEventListener('change', (e) => {
          const seed = e.target.value.trim() || "mediablock";
          e.target.value = seed;
          updateSetting('textSpoofingSeed', seed);
      });
  }

  ['blurMode', 'audioEqMode', 'shortcutAction'].forEach(key => {
      if (inputs[key]) {
          inputs[key].addEventListener('change', (e) => {
              updateSetting(key, e.target.value);
              if (key === 'blurMode') updateIntensityLabel();
          });
      }
  });

  if (inputs.blurIntensity) {
      inputs.blurIntensity.addEventListener('input', (e) => updateSetting('blurIntensity', parseInt(e.target.value)));
  }

  function showFeedback(msg, isError = false) {
    const feedback = document.getElementById('passwordFeedback');
    feedback.textContent = msg; feedback.style.color = isError ? "var(--danger)" : "#10b981"; 
    feedback.style.display = "block"; setTimeout(() => { feedback.style.display = "none"; }, 3000);
  }

  document.getElementById('savePasswordBtn').addEventListener('click', () => {
    const pw = inputs.browserLockPassword.value;
    const confirmPw = inputs.browserLockPasswordConfirm.value;
    if (!pw) { showFeedback("Password cannot be empty!", true); return; }
    if (pw !== confirmPw) { showFeedback("Passwords do not match!", true); return; }

    updateSetting('browserLockPassword', pw);
    
    inputs.browserLockPassword.value = ""; inputs.browserLockPasswordConfirm.value = "";
    inputs.browserLockPassword.placeholder = "Enter new password..."; inputs.browserLockPasswordConfirm.placeholder = "Confirm new password...";
    document.getElementById('savePasswordBtn').textContent = "Update"; document.getElementById('deletePasswordBtn').style.display = "block";
    showFeedback("Password saved successfully!");
  });

  document.getElementById('deletePasswordBtn').addEventListener('click', () => {
    if (confirm("Remove your password? This will also disable Domain Locks.")) {
      updateSetting('browserLockPassword', ""); updateSetting('browserLockEnabled', false); 
      inputs.browserLockPassword.value = ""; inputs.browserLockPasswordConfirm.value = "";
      inputs.browserLockPassword.placeholder = "Enter password..."; inputs.browserLockPasswordConfirm.placeholder = "Confirm password...";
      document.getElementById('savePasswordBtn').textContent = "Save"; document.getElementById('deletePasswordBtn').style.display = "none";
      showFeedback("Password removed!");
    }
  });

  document.getElementById('addDomainBtn').addEventListener('click', () => {
      const input = document.getElementById('newLockedDomain');
      let val = input.value.trim().toLowerCase();
      if (!val) return;
      
      // Strip out http://, https://, and www. if pasted directly from URL bar
      val = val.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
      if (!/^[a-z0-9.-]+$/.test(val) || !val.includes('.')) {
          alert("Enter a valid domain, for example reddit.com");
          return;
      }
      
      chrome.storage.local.get(['lockedDomains'], (res) => {
          const current = res.lockedDomains || [];
          if (!current.includes(val)) {
              current.push(val);
              updateSetting("lockedDomains", current);
              input.value = '';
          }
      });
  });

  document.getElementById('clearHistoryBtn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" }, () => renderHistory([]));
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      Object.keys(changes).forEach(key => {
        const newValue = changes[key].newValue;
        if (inputs[key] && !['browserLockPassword', 'browserLockPasswordConfirm'].includes(key)) {
            if (['blurIntensity', 'shortcutAction', 'blurMode', 'audioEqMode', 'textSpoofingSeed'].includes(key)) {
                inputs[key].value = newValue;
                if (key === 'blurMode') updateIntensityLabel();
            } else {
                inputs[key].checked = newValue;
            }
        } else if (key === 'urlHistory') {
            renderHistory(newValue);
        } else if (key === 'lockedDomains') {
            renderLockedDomains(newValue);
        } else if (key === 'browserLockPassword') {
            loadSettings(); 
        }
      });
    }
  });

});