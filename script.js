const GAS_API_URL = "https://script.google.com/macros/s/AKfycbx4A80FX5kCIwzpRgf2_tJHo4mijo1lHZ17kNxsEh3BJPCyN_itG6rKssY-OQoh6A8u/exec"; 

// --- DOM 元素獲取 ---
const gallery = document.getElementById('gallery');
const searchInput = document.getElementById('searchInput');
const imageInput = document.getElementById('imageInput');
const quoteInput = document.getElementById('quoteInput');
const tagsInput = document.getElementById('tagsInput');
const uploadButton = document.getElementById('uploadButton');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileTypeBadge = document.getElementById('fileTypeBadge');
const galleryTitle = document.getElementById('galleryTitle');
const searchClearBtn = document.getElementById('searchClearBtn');

// --- 系統全域變數 ---
let allMemes = []; 
let currentViewType = 'image'; 
let currentUploadFileType = 'image'; 

// ==========================================================================
// SPA 視圖切換與側邊欄控制邏輯
// ==========================================================================
const menuToggle = document.getElementById('menuToggle');
const navDrawer = document.getElementById('navDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const closeDrawerBtn = document.getElementById('closeDrawer');
const navBtns = document.querySelectorAll('.nav-btn');
const viewSections = document.querySelectorAll('.view-section');

window.openDrawer = function() {
  if(navDrawer) navDrawer.classList.add('active');
  if(drawerOverlay) drawerOverlay.classList.add('active');
}

window.closeDrawerFunc = function() {
  if(navDrawer) navDrawer.classList.remove('active');
  if(drawerOverlay) drawerOverlay.classList.remove('active');
}

if(menuToggle) menuToggle.addEventListener('click', window.openDrawer);
if(closeDrawerBtn) closeDrawerBtn.addEventListener('click', window.closeDrawerFunc);
if(drawerOverlay) drawerOverlay.addEventListener('click', window.closeDrawerFunc);

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const targetType = btn.getAttribute('data-type'); 

    if (!targetId) return;

    viewSections.forEach(sec => sec.classList.remove('active-view'));
    
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.classList.add('active-view');
    }

    navBtns.forEach(b => {
      if(b.getAttribute('data-target')) b.classList.remove('active');
    });
    btn.classList.add('active');

    if (targetId === 'galleryView' && targetType) {
      currentViewType = targetType;
      if (galleryTitle) galleryTitle.innerHTML = btn.innerHTML; 
      if (searchInput) searchInput.value = ''; 
      renderGallery(); 
    }
    window.closeDrawerFunc(); 
  });
});

// ==========================================================================
// 上傳邏輯：自動辨識檔案副檔名與大小控制
// ==========================================================================
if(imageInput) {
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      fileNameDisplay.innerText = '尚未選擇檔案';
      fileTypeBadge.style.display = 'none';
      currentUploadFileType = 'image';
      return;
    }

    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`檔案太大了！為了保護伺服器，請上傳小於 ${maxSizeMB}MB 的檔案！`);
      imageInput.value = ''; 
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'gif') {
      currentUploadFileType = 'gif';
      fileTypeBadge.innerText = '⚡ 動態 GIF';
      fileTypeBadge.className = 'file-type-badge badge-gif';
    } else if (ext === 'mp4' || ext === 'webm' || ext === 'mov') {
      currentUploadFileType = 'video';
      fileTypeBadge.innerText = '🎬 短影片';
      fileTypeBadge.className = 'file-type-badge badge-video';
    } else {
      currentUploadFileType = 'image'; 
      fileTypeBadge.innerText = '🖼️ 靜態圖片';
      fileTypeBadge.className = 'file-type-badge badge-image';
    }

    fileNameDisplay.innerText = `📄 已選擇: ${file.name}`;
    fileNameDisplay.style.color = "#1a5e63"; 
    fileTypeBadge.style.display = 'inline-block';
  });
}

if (uploadButton) {
  uploadButton.addEventListener('click', () => {
    const file = imageInput.files[0];
    const rawTags = tagsInput.value.trim();
    const cleanedTags = rawTags.replace(/[，、\s]+/g, ',').replace(/^,+|,+$/g, '');
    const quote = quoteInput.value.trim();

    if (!file) {
      alert('請先選擇一個檔案！');
      return;
    }

    uploadButton.disabled = true;
    uploadButton.innerText = '正在把藏品送往雲端... (影片可能需要稍等一下)';

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
      const base64Data = reader.result;
      const payload = {
        action: 'upload', 
        image: base64Data,
        fileName: file.name,
        quote: quote,
        tags: cleanedTags,
        fileType: currentUploadFileType,
        uploader: currentUser.username 
      };

      fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(response => response.json())
      .then(result => {
        if (result.status === 'success') {
          alert('藏品上傳成功！你真酷！');
          imageInput.value = '';
          quoteInput.value = '';
          tagsInput.value = '';
          fileNameDisplay.innerText = '尚未選擇檔案';
          fileTypeBadge.style.display = 'none';
          
          currentViewType = currentUploadFileType; 
          const targetNavBtn = document.querySelector(`[data-type="${currentViewType}"]`);
          if(targetNavBtn) targetNavBtn.click(); 
          
          loadGallery(); 
        } else {
          alert('上傳失敗：' + result.message);
        }
      })
      .catch(err => {
        console.error('上傳出錯:', err);
        alert('上傳發生錯誤，可能是檔案太大或是網路不穩定。');
      })
      .finally(() => {
        uploadButton.disabled = false;
        uploadButton.innerText = '確定上傳藏品';
      });
    };
  });
}

// ==========================================================================
// 讀取與渲染邏輯 (🛡️ 鈦合金防護版：防崩潰、精準報錯)
// ==========================================================================
window.loadGallery = function() {
  if (gallery) gallery.innerHTML = '<p>努力加載藏品中，請稍候...</p>';
  
  fetch(GAS_API_URL)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP 錯誤狀態碼: ${response.status}`);
      return response.text(); // 🛡️ 先拿純文字，防止 GAS 回傳錯誤 HTML 導致 json 解析當機
    })
    .then(text => {
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          throw new Error(data.message || "資料庫回傳的不是正常的陣列格式！");
        }
        allMemes = data;
        renderGallery(); 
      } catch (e) {
        console.error('解析或渲染崩潰:', e);
        if (gallery) gallery.innerHTML = `<div style="text-align:center; color:#e74c3c; width:100%;"><p><b>⚠️ 網頁內部解析發生崩潰！</b></p><p style="font-size:0.9rem;">錯誤代碼：${e.message}</p></div>`;
      }
    })
    .catch(err => {
      console.error('連線失敗:', err);
      if (gallery) gallery.innerHTML = `<div style="text-align:center; color:#e74c3c; width:100%;"><p><b>⚠️ 無法連線到阿公的雲端伺服器</b></p><p style="font-size:0.9rem;">原因：${err.message}</p></div>`;
    });
}

function renderGallery() {
  const gallery = document.getElementById('gallery');
  const galleryTitle = document.getElementById('galleryTitle');
  if (!gallery) return;

  gallery.innerHTML = '';

  if (galleryTitle) {
    if (currentViewType === 'image') galleryTitle.innerHTML = '<i class="fas fa-image"></i> 🖼️ 靜態圖片區';
    else if (currentViewType === 'gif') galleryTitle.innerHTML = '<i class="fas fa-bolt"></i> ⚡ 動態 GIF 區';
    else if (currentViewType === 'video') galleryTitle.innerHTML = '<i class="fas fa-video"></i> 🎬 短影片專區';
  }

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filteredMemes = allMemes.filter(meme => {
    const itemType = meme.type || 'image';
    if (itemType !== currentViewType) return false;
    if (!keyword) return true;
    
    // 🛡️ 防禦：強制把標題(quote)轉成字串，防止純數字標題引發 toLowerCase 當機！
    const safeQuote = String(meme.quote || '').toLowerCase();
    const matchQuote = safeQuote.includes(keyword);
    
    // 🛡️ 防禦：確保 tags 存在且為陣列，並將標籤強制轉字串比對
    const matchTags = Array.isArray(meme.tags) ? 
      meme.tags.some(tag => String(tag).toLowerCase().includes(keyword)) : false;
      
    return matchQuote || matchTags;
  });

  if (filteredMemes.length === 0) {
    gallery.innerHTML = '<p style="text-align:center; width:100%; color:#7f8c8d; margin-top: 20px;">此區目前還沒有任何藏品哦！</p>';
    return;
  }

  filteredMemes.forEach(meme => {
    const card = document.createElement('div');
    card.className = 'card';

    let tagsHTML = '';
    if (Array.isArray(meme.tags) && meme.tags.length > 0 && meme.tags[0] !== "") {
      const tagsList = meme.tags.map(t => `<span class="tag-badge">#${String(t).trim()}</span>`).join('');
      tagsHTML = `<div class="card-tags">${tagsList}</div>`;
    }

    // 🛡️ 防禦：強制安全輸出字串
    const safeQuoteHTML = String(meme.quote || '未命名藏品');
    const safeUrl = String(meme.url || '');

    if (currentViewType === 'image') {
      card.classList.add('interactive-card');
      card.innerHTML = `
        <img class="card-media" src="${safeUrl}" alt="${safeQuoteHTML}">
        <p class="card-title">${safeQuoteHTML}</p>
        ${tagsHTML}
      `;

      card.addEventListener('click', async () => {
        try {
          card.style.opacity = '0.5';
          const proxyUrl = "https://wsrv.nl/?url=" + encodeURIComponent(safeUrl);
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error('阻擋下載');
          let blob = await response.blob();
          if (blob.type !== 'image/png') blob = new Blob([blob], {type: 'image/png'});
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          alert(`已成功複製照片：${safeQuoteHTML}！\n可以直接貼上了！`);
        } catch (err) {
          navigator.clipboard.writeText(safeUrl)
            .then(() => alert(`圖片本體下載失敗，但已複製「圖片網址」！`))
            .catch(e => console.error(e));
        } finally {
          card.style.opacity = '1';
        }
      });
      
    } else if (currentViewType === 'video' || currentViewType === 'gif') {
      const fileIdMatch = safeUrl.match(/id=([^&]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : '';
      const fileTypeName = currentViewType === 'video' ? '影片' : '動圖';

      let mediaHTML = '';

      if (currentViewType === 'video') {
        // 🎬 影片：維持 iframe，這是 Google Drive 唯一穩定的影片串流方式
        const iframeUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : safeUrl;
        mediaHTML = `
          <div class="media-wrapper video-wrapper">
            <iframe class="card-media video-iframe" src="${iframeUrl}" allow="autoplay" allowfullscreen style="border:none; background:#000;"></iframe>
          </div>
        `;
      } else if (currentViewType === 'gif') {
        // ⚡ GIF 妥協解法：Google 嚴格封殺直連，必須改回 iframe 官方播放器。
        // 手機版 Google 播放器強制需「點擊」才會播放 GIF。
        const iframeUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : safeUrl;
        mediaHTML = `
          <div class="media-wrapper gif-wrapper">
            <iframe class="card-media gif-iframe" src="${iframeUrl}" allow="autoplay" style="border:none; background:#000;"></iframe>
          </div>
        `;
      }

      card.innerHTML = `
        ${mediaHTML}
        <p class="card-title">${safeQuoteHTML}</p>
        ${tagsHTML}
        <a href="${safeUrl}" target="_blank" class="download-btn"><i class="fas fa-external-link-alt"></i> 點此開啟原始${fileTypeName} / 下載</a>
      `;
    }

    const tagBadges = card.querySelectorAll('.tag-badge');
    tagBadges.forEach(badge => {
      badge.addEventListener('click', (event) => {
        event.stopPropagation();
        const tagText = badge.innerText.replace('#', '').trim();
        if (searchInput) searchInput.value = tagText;
        const clearBtn = document.getElementById('searchClearBtn');
        if (clearBtn) clearBtn.classList.add('active'); 
        renderGallery();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    gallery.appendChild(card); 
  });
}

// ==========================================================================
// 搜尋欄聯動與全域功能
// ==========================================================================
if (searchInput && searchClearBtn) {
  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
      searchClearBtn.classList.add('active'); 
    } else {
      searchClearBtn.classList.remove('active'); 
    }
    renderGallery(); 
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = ''; 
    searchClearBtn.classList.remove('active'); 
    searchInput.focus(); 
    renderGallery(); 
  });
}

window.toggleMobileVideo = function(videoEl) {
  if (videoEl.paused) {
    videoEl.play();
    videoEl.setAttribute('controls', 'true');
  } else {
    videoEl.pause();
  }
}

// 啟動引擎
window.loadGallery();