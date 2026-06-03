(function() {
  if (window.sbiSelectorActive) return;
  window.sbiSelectorActive = true;

  function preventDefault(e) { 
    e.preventDefault(); 
    e.stopPropagation(); 
  }

  function clickHandler(e) {
    preventDefault(e);
    cleanup();
    
    let target = e.target;
    let imgUrl = null;

    if (target.tagName === 'IMG') {
      // 1. Smart URL extraction: Look for the real URL first (bypasses lazy-loading)
      imgUrl = target.getAttribute('data-src') || 
               target.getAttribute('data-original') || 
               target.getAttribute('data-url') || 
               target.src;

      // 2. Fallback to srcset if it's still base64
      if (imgUrl && imgUrl.startsWith('data:') && target.srcset) {
          const sources = target.srcset.split(',').map(s => s.trim().split(' ')[0]);
          if (sources.length > 0) imgUrl = sources[sources.length - 1];
      }
    } else {
      // 3. Check for CSS background images
      const bg = window.getComputedStyle(target).backgroundImage;
      if (bg && bg !== 'none') {
        const match = bg.match(/url\(['"]?(.*?)['"]?\)/i);
        if (match && match[1]) imgUrl = match[1];
      }
    }
    
    if (imgUrl) chrome.runtime.sendMessage({ action: "search_image", imgUrl: imgUrl });
  }

  function cleanup() {
    document.removeEventListener('click', clickHandler, true);
    window.sbiSelectorActive = false;
    document.body.classList.remove('sbi-selecting');
  }

  document.addEventListener('click', clickHandler, true);
  document.body.classList.add('sbi-selecting');
})();