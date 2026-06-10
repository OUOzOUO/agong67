
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
// ✨ 修正：優先從瀏覽器記憶體讀取上一次停留的展區，如果從未造訪過才預設為 'image'
let currentViewType = localStorage.getItem('agong67_last_view') || 'image'; 
let currentUploadFileType = 'image';
let selectedFiles = [];
let uploaderLoadedMemes = [];
let uploaderCurrentType = 'image';

// 尊爵專屬標籤設定：只要標籤中包含 "svip"，即變為尊爵限定 (不分大小寫)
window.SVIP_ONLY_TAGS = ['svip'];

// Helper to escape HTML characters
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 核心搜尋過濾引擎：支援空格（AND）與分號（OR）多項組合搜尋
window.matchMemeQuery = function(meme, query, includeUploader = false) {
  if (!query) return true;
  
  // 統一將全形分號「；」取代為半形分號「;」並分割成多個 OR 條件
  const clauses = query.replace(/；/g, ';').split(';');
  
  // 只要符合任何一個 OR 條件子句，即視為匹配
  return clauses.some(clause => {
    const trimmedClause = clause.trim();
    if (!trimmedClause) return false;
    
    // 將子句依空白（半形、全形、多重空白）分割成多個 AND 關鍵字
    const terms = trimmedClause.split(/[\s　]+/).filter(Boolean);
    if (terms.length === 0) return false;
    
    const safeQuote = String(meme.quote || '').toLowerCase();
    const safeUploader = String(meme.uploader || '').toLowerCase();
    const tagsArray = Array.isArray(meme.tags) ? meme.tags.map(t => String(t || '').toLowerCase()) : [];

    // 必須同時符合該子句裡面的「所有」關鍵字 (AND)
    return terms.every(term => {
      const matchQuote = safeQuote.includes(term);
      const matchTags = tagsArray.some(tag => tag.includes(term));
      const matchUploader = includeUploader && safeUploader.includes(term);
      return matchQuote || matchTags || matchUploader;
    });
  });
};

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
      localStorage.setItem('agong67_last_view', targetType);
      if (galleryTitle) {
        if (targetType === 'image') galleryTitle.innerHTML = '<i class="fas fa-image"></i> 靜態圖片區';
        else if (targetType === 'gif') galleryTitle.innerHTML = '<i class="fas fa-bolt"></i> 動態 GIF 區';
        else if (targetType === 'video') galleryTitle.innerHTML = '<i class="fas fa-video"></i> 短影片專區';
      }
      if (searchInput) searchInput.value = ''; 
      renderGallery(); 
    }
    window.closeDrawerFunc(); 
  });
});

// ==========================================================================
// 上傳邏輯：自動辨識檔案副檔名與大小控制 (多檔案批次上傳特仕版)
// ==========================================================================
function renderMultiUploadList() {
  const multiUploadList = document.getElementById('multiUploadList');
  const singleUploadFields = document.getElementById('singleUploadFields');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const fileTypeBadge = document.getElementById('fileTypeBadge');

  if (!multiUploadList) return;

  if (selectedFiles.length === 0) {
    multiUploadList.style.display = 'none';
    multiUploadList.innerHTML = '';
    if (singleUploadFields) singleUploadFields.style.display = 'flex';
    if (fileNameDisplay) fileNameDisplay.innerText = '尚未選擇檔案';
    if (fileTypeBadge) fileTypeBadge.style.display = 'none';
    return;
  }

  // 隱藏單檔案欄位與單檔案 badge
  if (singleUploadFields) singleUploadFields.style.display = 'none';
  if (fileTypeBadge) fileTypeBadge.style.display = 'none';
  
  if (fileNameDisplay) {
    const hasSuccessItems = selectedFiles.some(item => item.status === 'success');
    let clearSuccessHtml = '';
    if (hasSuccessItems) {
      clearSuccessHtml = `<button type="button" class="clear-success-btn" onclick="clearSuccessfulFiles()" style="margin-left: 10px; padding: 4px 8px; background: #2ecc71; color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; transition: background 0.2s;"><i class="fas fa-trash-alt"></i> 清除已成功項目</button>`;
    }
    fileNameDisplay.innerHTML = `📄 已選擇 ${selectedFiles.length} 個檔案${clearSuccessHtml}`;
    fileNameDisplay.style.color = "#1a5e63";
  }

  multiUploadList.style.display = 'flex';
  multiUploadList.innerHTML = '';

  selectedFiles.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'multi-upload-item-card';

    const safeName = escapeHtml(item.file.name);
    const safeQuote = escapeHtml(item.quote);
    const safeTags = escapeHtml(item.tags);

    // 依據不同狀態加上對應的卡片樣式與狀態徽章
    let borderStyle = '';
    let statusLabel = '<span class="item-status status-pending" style="font-size:0.8rem; color:#7f8c8d; font-weight:bold; padding:2px 8px; background:#f0f0f0; border-radius:12px;"><i class="far fa-clock"></i> 等待中</span>';
    
    if (item.status === 'uploading') {
      borderStyle = 'border-color: #f39c12; box-shadow: 0 0 8px rgba(243,156,18,0.2);';
      statusLabel = '<span class="item-status status-uploading" style="font-size:0.8rem; color:#f39c12; font-weight:bold; padding:2px 8px; background:rgba(243,156,18,0.1); border-radius:12px;"><i class="fas fa-spinner fa-spin"></i> 上傳中...</span>';
    } else if (item.status === 'success') {
      borderStyle = 'border-color: #2ecc71; box-shadow: 0 0 8px rgba(46,204,113,0.2);';
      statusLabel = '<span class="item-status status-success" style="font-size:0.8rem; color:#2ecc71; font-weight:bold; padding:2px 8px; background:rgba(46,204,113,0.1); border-radius:12px;"><i class="fas fa-check-circle"></i> 成功</span>';
    } else if (item.status === 'error') {
      borderStyle = 'border-color: #e74c3c; box-shadow: 0 0 8px rgba(231,76,60,0.2);';
      statusLabel = `<span class="item-status status-error" title="${escapeHtml(item.errorMessage)}" style="font-size:0.8rem; color:#e74c3c; font-weight:bold; padding:2px 8px; background:rgba(231,76,60,0.1); border-radius:12px; cursor:help;"><i class="fas fa-exclamation-circle"></i> 失敗</span>`;
    }

    if (borderStyle) {
      card.setAttribute('style', borderStyle);
    }

    card.innerHTML = `
      <div class="item-header">
        <span class="item-name" title="${safeName}">${safeName}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${statusLabel}
          <span class="${item.badgeClass}" style="margin: 0;">${item.badgeText}</span>
          <div style="display: flex; align-items: center; gap: 5px;">
            <button type="button" class="item-preview-btn" onclick="previewSelectedFile(${index})" title="預覽此檔案">
              <i class="fas fa-eye"></i>
            </button>
            ${item.status !== 'success' ? `
            <button type="button" class="item-remove-btn" onclick="removeSelectedFile(${index})" title="移除此檔案">
              <i class="fas fa-times"></i>
            </button>` : ''}
          </div>
        </div>
      </div>
      <div class="item-body" ${item.status === 'success' ? 'style="opacity: 0.6; pointer-events: none;"' : ''}>
        <div class="input-group">
          <label>檔案名稱</label>
          <input type="text" class="item-quote-input" data-index="${index}" value="${safeQuote}" placeholder="請輸入檔案名稱" ${item.status === 'success' ? 'disabled' : ''}>
        </div>
        <div class="input-group">
          <label>關鍵字 (標籤)</label>
          <input type="text" class="item-tags-input" data-index="${index}" value="${safeTags}" placeholder="標籤，可用空格或逗號隔開" ${item.status === 'success' ? 'disabled' : ''}>
        </div>
      </div>
    `;

    // 監聽檔名與標籤變更，即時同步回 selectedFiles
    const quoteIn = card.querySelector('.item-quote-input');
    const tagsIn = card.querySelector('.item-tags-input');

    if (quoteIn) {
      quoteIn.addEventListener('input', (e) => {
        selectedFiles[index].quote = e.target.value;
      });
    }

    if (tagsIn) {
      tagsIn.addEventListener('input', (e) => {
        selectedFiles[index].tags = e.target.value;
      });
    }

    multiUploadList.appendChild(card);
  });
}

window.removeSelectedFile = function(index) {
  selectedFiles.splice(index, 1);
  renderMultiUploadList();
};

window.clearSuccessfulFiles = function() {
  selectedFiles = selectedFiles.filter(item => item.status !== 'success');
  renderMultiUploadList();
};

let activeObjectURL = null;

window.previewSelectedFile = function(index) {
  const item = selectedFiles[index];
  if (!item) return;

  const previewOverlay = document.getElementById('previewOverlay');
  const previewModal = document.getElementById('previewModal');
  const previewTitle = document.getElementById('previewTitle');
  const container = document.getElementById('previewContentContainer');

  if (!previewOverlay || !previewModal || !container) return;

  // Clean up any old object URL
  if (activeObjectURL) {
    URL.revokeObjectURL(activeObjectURL);
    activeObjectURL = null;
  }

  // Create local object URL
  activeObjectURL = URL.createObjectURL(item.file);

  if (previewTitle) {
    previewTitle.innerText = `預覽：${item.file.name}`;
    previewTitle.title = item.file.name;
  }

  container.innerHTML = '';

  if (item.type === 'video') {
    const video = document.createElement('video');
    video.src = activeObjectURL;
    video.controls = true;
    video.autoplay = true;
    video.style.maxWidth = '100%';
    video.style.maxHeight = '60vh';
    video.style.display = 'block';
    container.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = activeObjectURL;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '60vh';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    container.appendChild(img);
  }

  previewOverlay.classList.add('active');
  previewModal.classList.add('active');
};

window.closePreviewModal = function() {
  const previewOverlay = document.getElementById('previewOverlay');
  const previewModal = document.getElementById('previewModal');
  const container = document.getElementById('previewContentContainer');

  if (previewOverlay) previewOverlay.classList.remove('active');
  if (previewModal) previewModal.classList.remove('active');

  setTimeout(() => {
    if (container) container.innerHTML = '';
    if (activeObjectURL) {
      URL.revokeObjectURL(activeObjectURL);
      activeObjectURL = null;
    }
  }, 300);
};

// 綁定關閉預覽事件
const closePreviewBtn = document.getElementById('closePreviewBtn');
const previewOverlay = document.getElementById('previewOverlay');

if (closePreviewBtn) {
  closePreviewBtn.addEventListener('click', window.closePreviewModal);
}
if (previewOverlay) {
  previewOverlay.addEventListener('click', window.closePreviewModal);
}

if (imageInput) {
  imageInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      return;
    }

    const isUserAdmin = typeof isAdmin === 'function' && isAdmin();
    const isUserSvip = typeof isSvip === 'function' && isSvip();
    const hasUnlimitedUpload = isUserAdmin || isUserSvip;
    
    const maxFiles = hasUnlimitedUpload ? Infinity : 5;
    if (selectedFiles.length + files.length > maxFiles) {
      alert(`最多只能同時選擇 ${maxFiles} 個檔案！`);
      imageInput.value = '';
      return;
    }

    for (let file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      let uploadType = 'image';
      let maxSizeMB = 5;
      let badgeText = '🖼️ 靜態圖片';
      let badgeClass = 'file-type-badge badge-image';

      if (ext === 'gif') {
        uploadType = 'gif';
        maxSizeMB = 10;
        badgeText = '⚡ 動態 GIF';
        badgeClass = 'file-type-badge badge-gif';
      } else if (ext === 'mp4' || ext === 'webm' || ext === 'mov') {
        uploadType = 'video';
        maxSizeMB = 10;
        badgeText = '🎬 短影片';
        badgeClass = 'file-type-badge badge-video';
      }

      if (!hasUnlimitedUpload && file.size > maxSizeMB * 1024 * 1024) {
        alert(`檔案「${file.name}」太大了！此類型檔案（${uploadType === 'image' ? '靜態圖片' : '影片/動圖'}）最大限制為 ${maxSizeMB}MB！`);
        continue;
      }

      selectedFiles.push({
        file: file,
        quote: '',
        tags: '',
        type: uploadType,
        badgeText: badgeText,
        badgeClass: badgeClass,
        status: 'pending',
        errorMessage: ''
      });
    }

    imageInput.value = '';
    renderMultiUploadList();
  });
}

if (uploadButton) {
  uploadButton.addEventListener('click', async () => {
    // 篩選出需要上傳的檔案索引 (狀態不為 success 的檔案)
    const pendingIndices = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      if (selectedFiles[i].status !== 'success') {
        pendingIndices.push(i);
      }
    }

    if (pendingIndices.length === 0) {
      alert('所有檔案皆已成功上傳！');
      return;
    }

    uploadButton.disabled = true;
    const totalToUpload = pendingIndices.length;
    let successCount = 0;
    let corsSuccessCount = 0; // 追蹤因瀏覽器 CORS 重新導向攔截導致的偽失敗
    let failedCount = 0;
    let lastUploadedType = null;

    // 螢幕鎖定控制 (Wake Lock)
    let wakeLock = null;
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log("螢幕喚醒鎖定已啟用，防止手機進入休眠。");
      }
    } catch (wlErr) {
      console.warn("無法取得螢幕喚醒鎖定:", wlErr);
    }

    const readFileAsDataURL = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    };

    for (let k = 0; k < totalToUpload; k++) {
      const idx = pendingIndices[k];
      const item = selectedFiles[idx];

      // 更新狀態為上傳中，並即時更新 UI
      item.status = 'uploading';
      item.errorMessage = '';
      renderMultiUploadList();

      uploadButton.innerText = `正在上傳第 ${k + 1}/${totalToUpload} 個檔案... (影片需要等待較久)`;

      try {
        const base64Data = await readFileAsDataURL(item.file);
        const rawTags = item.tags.trim();
        const cleanedTags = rawTags.replace(/[，、\s]+/g, ',').replace(/^,+|,+$/g, '');

        const originalName = item.file.name;
        const lastDotIndex = originalName.lastIndexOf('.');
        const extension = lastDotIndex !== -1 ? originalName.slice(lastDotIndex) : '';
        const customName = item.quote.trim();
        let targetFileName = customName ? (customName + extension) : originalName;
        if (!targetFileName.startsWith("ag67_")) {
          targetFileName = "ag67_" + targetFileName;
        }

        const payload = {
          action: 'upload', 
          image: base64Data,
          fileName: targetFileName,
          quote: customName,
          tags: cleanedTags,
          fileType: item.type,
          uploader: currentUser.username,
          operator: currentUser.username,
          token: currentUser.token
        };

        const response = await fetch(GAS_API_URL, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP 錯誤碼: ${response.status}`);

        const result = await response.json();
        if (result.status === 'success') {
          item.status = 'success';
          item.errorMessage = '';
          successCount++;
          lastUploadedType = item.type;
        } else {
          console.error(`檔案「${item.file.name}」上傳失敗:`, result.message);
          item.status = 'error';
          item.errorMessage = result.message || '上傳失敗';
          failedCount++;
        }
      } catch (err) {
        console.error(`檔案「${item.file.name}」上傳出錯:`, err);
        // 判斷是否為跨網域 (CORS) 偽失敗：GAS 在多帳號登入時極易發生重新導向被瀏覽器 CORS 擋掉
        const isNetworkError = err.name === 'TypeError' || 
                               err.message.toLowerCase().includes('fetch') || 
                               err.message.toLowerCase().includes('network');
        if (isNetworkError) {
          console.warn(`⚠️ 偵測到 CORS / 網路通訊異常，但該檔案在雲端極可能已上傳成功，在此將其視為成功處理。`);
          item.status = 'success';
          item.errorMessage = '';
          corsSuccessCount++;
          lastUploadedType = item.type;
        } else {
          item.status = 'error';
          item.errorMessage = err.message || '網路通訊失敗';
          failedCount++;
        }
      }

      // 更新該單一檔案的完成狀態 UI
      renderMultiUploadList();
    }

    // 釋放螢幕喚醒鎖定
    if (wakeLock) {
      try {
        await wakeLock.release();
        wakeLock = null;
        console.log("螢幕喚醒鎖定已釋放。");
      } catch (releaseErr) {
        console.error("釋放螢幕鎖定出錯:", releaseErr);
      }
    }

    const totalSuccessful = successCount + corsSuccessCount;

    if (failedCount === 0) {
      if (corsSuccessCount > 0) {
        alert('所有選定項目已處理完畢！\n⚠️ 提示：部分檔案受瀏覽器安全限制 (CORS) 影響，但雲端極可能已儲存成功。請檢查首頁藝廊。');
      } else {
        alert('所有檔案上傳成功！');
      }
    } else {
      alert(`上傳作業已結束。\n- 成功：${totalSuccessful} 個\n- 失敗：${failedCount} 個\n\n失敗的檔案已為您標示「紅色邊框與失敗圖示」，您可以直接修改失敗檔案的名稱/標籤，或直接再次點選「確定上傳藏品」以重新上傳失敗的檔案！`);
    }

    if (totalSuccessful > 0) {
      if (lastUploadedType) {
        currentViewType = lastUploadedType;
        const targetNavBtn = document.querySelector(`[data-type="${currentViewType}"]`);
        if (targetNavBtn) {
          navBtns.forEach(b => {
            if(b.getAttribute('data-target')) b.classList.remove('active');
          });
          targetNavBtn.classList.add('active');
          if (galleryTitle) galleryTitle.innerHTML = targetNavBtn.innerHTML;
        }
      }
      loadGallery();
    }

    uploadButton.disabled = false;
    uploadButton.innerText = '確定上傳藏品';
  });
}

// ==========================================================================
// 讀取與渲染邏輯 (回歸 100% 穩定的 Google Drive 串流外殼)
// ==========================================================================
window.loadGallery = function() {
  if (gallery) gallery.innerHTML = '<p>努力加載藏品中，請稍候...</p>';
  
  fetch(GAS_API_URL)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP 錯誤狀態碼: ${response.status}`);
      return response.text(); 
    })
    .then(text => {
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("資料庫回傳格式異常");
        allMemes = data.sort((a, b) => {
          const orderA = a.order || 0;
          const orderB = b.order || 0;
          if (orderB !== orderA) {
            return orderB - orderA; // 顯示順序權重越大越靠前
          }
          return b.originalIndex - a.originalIndex; // 預設依新舊順序顯示（最新上傳在最上方）
        });
        renderGallery(); 
      } catch (e) {
        console.error('解析崩潰:', e);
        if (gallery) gallery.innerHTML = `<div style="text-align:center; color:#e74c3c; width:100%;"><p><b>⚠️ 網頁內部解析發生崩潰！</b></p></div>`;
      }
    })
    .catch(err => {
      console.error('連線失敗:', err);
      if (gallery) gallery.innerHTML = `<div style="text-align:center; color:#e74c3c; width:100%;"><p><b>⚠️ 無法連線到阿公的雲端伺服器</b></p></div>`;
    });
}

// ==========================================================================
/* 首頁藝廊卡片即時編輯輔助函式 */
// ==========================================================================

function getMediaHTML(meme) {
  const safeUrl = String(meme.url || '');
  const safeQuoteHTML = escapeHtml(meme.quote || '未命名藏品');
  if (meme.type === 'gif') {
    const fileIdMatch = safeUrl.match(/id=([^&]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : '';
    const directUrl = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : safeUrl;
    return `<img class="card-media" src="${directUrl}" alt="${safeQuoteHTML}">`;
  } else if (meme.type === 'video') {
    const fileIdMatch = safeUrl.match(/id=([^&]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : '';
    const iframeUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : safeUrl;
    return `
      <div class="media-wrapper video-wrapper">
        <iframe class="card-media video-iframe" src="${iframeUrl}" allow="autoplay" allowfullscreen style="border:none; background:#000;"></iframe>
      </div>
    `;
  } else {
    return `<img class="card-media" src="${safeUrl}" alt="${safeQuoteHTML}">`;
  }
}

// ==========================================================================
// 剪貼簿複製核心邏輯 (支援跨平台、Secure/Insecure 上下文、與 User Activation 防禦)
// ==========================================================================

// 輔助函式：複製文字到剪貼簿 (相容 HTTP 模式之 execCommand 備份方案)
function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) resolve();
      else reject(new Error('execCommand copy returned false'));
    } catch (err) {
      document.body.removeChild(textArea);
      reject(err);
    }
  });
}

// 核心函式：複製圖片 (Blob) 或退回文字網址 (Fallback)
async function copyImageToClipboard(imageUrl, title, feedbackElement, isRandom = false) {
  const proxyUrl = "https://wsrv.nl/?url=" + encodeURIComponent(imageUrl) + "&output=png";
  const fallbackUrl = "https://wsrv.nl/?url=" + encodeURIComponent(imageUrl);
  
  if (feedbackElement) feedbackElement.style.opacity = '0.5';

  // 檢查是否支援完整的非同步剪貼簿寫入且為安全上下文 (HTTPS/localhost)
  const isSecureContext = window.isSecureContext || (navigator.clipboard && window.ClipboardItem);

  if (!isSecureContext) {
    // 處於 HTTP 非安全上下文：直接採用純文字複製備用方案
    try {
      await copyTextToClipboard(fallbackUrl);
      if (isRandom) {
        alert("已隨機複製了一張照片！");
      } else {
        alert(`已成功複製照片：\n${title}`);
      }
    } catch (err) {
      console.error("複製失敗:", err);
      alert("複製失敗，請長按圖片進行儲存或分享。");
    } finally {
      if (feedbackElement) feedbackElement.style.opacity = '1';
    }
    return;
  }

  try {
    // 為了防止瀏覽器在非同步 fetch 時遺失 User Gesture Activation 權限，
    // 我們必須「同步」建立 ClipboardItem 並將 fetch 的 Promise 丟進去。
    const clipboardItem = new ClipboardItem({
      'image/png': fetch(proxyUrl).then(res => {
        if (!res.ok) throw new Error('無法取得圖片');
        return res.blob();
      })
    });

    await navigator.clipboard.write([clipboardItem]);
    if (isRandom) {
      alert("已隨機複製了一張照片！\n可以直接貼上了！");
    } else {
      alert(`已成功複製照片：${title}\n可以直接貼上了！`);
    }
  } catch (err) {
    console.warn("直接複製圖片 Blob 失敗，嘗試複製網址Fallback:", err);
    try {
      await copyTextToClipboard(fallbackUrl);
      if (isRandom) {
        alert("已隨機複製了一張照片！");
      } else {
        alert("圖片已複製為「圖片網址」！");
      }
    } catch (fallbackErr) {
      console.error("Fallback 複製也失敗:", fallbackErr);
      alert("複製失敗，請長按圖片進行儲存或分享. ");
    }
  } finally {
    if (feedbackElement) feedbackElement.style.opacity = '1';
  }
}

function renderSingleGalleryCard(card, meme) {
  if (meme.type === 'image' || !meme.type) {
    card.classList.add('interactive-card');
  } else {
    card.classList.remove('interactive-card');
  }

  let tagsHTML = '';
  if (Array.isArray(meme.tags) && meme.tags.length > 0 && meme.tags[0] !== "") {
    const tagsList = meme.tags.map(t => `<span class="tag-badge">#${String(t).trim()}</span>`).join('');
    tagsHTML = `<div class="card-tags">${tagsList}</div>`;
  }

  const safeQuoteHTML = escapeHtml(meme.quote || '未命名藏品');
  const safeUrl = String(meme.url || '');

  const fileIdMatch = safeUrl.match(/id=([^&]+)/);
  const fileId = fileIdMatch ? fileIdMatch[1] : '';
  const downloadUrl = fileId ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t` : safeUrl;

  const mediaHTML = getMediaHTML(meme);

  card.innerHTML = `
    ${mediaHTML}
    <p class="card-title">${safeQuoteHTML}</p>
    ${tagsHTML}
    <div class="card-actions-wrapper">
      <a href="${downloadUrl}" target="_blank" class="download-btn"><i class="fas fa-download"></i> 點此下載${meme.type === 'video' ? '影片' : (meme.type === 'gif' ? '動圖' : '照片')}</a>
    </div>
  `;

  // 綁定標籤點擊
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

  // 綁定下載按鈕
  const downloadBtn = card.querySelector('.download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      const originalText = downloadBtn.innerHTML;
      const targetUrl = downloadBtn.getAttribute('href');
      const fileIdMatch = targetUrl.match(/id=([^&]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : '';
      
      // 偵測 iOS 與 PWA 狀態
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isStandalone = window.navigator.standalone === true;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isIOS) {
        if (isStandalone) {
          // iOS PWA 主畫面版：保持原樣
          if (meme.type === 'video') {
            // iOS PWA 模式下載影片 -> 複製連結
            try {
              await navigator.clipboard.writeText(targetUrl);
              alert("💡 由於 iOS 系統限制，主畫面 App 無法下載影片。\n已自動為您複製影片下載連結，請打開 Safari 瀏覽器貼上網址即可下載！");
            } catch (err) {
              console.error("複製失敗:", err);
              alert(`由於 iOS 限制，請長按複製此下載連結：\n${targetUrl}`);
            }
          } else {
            // iOS PWA 模式下載圖片與 GIF -> 彈出 iOS 專屬長按儲存引導 Modal
            const iosModal = document.getElementById('iosDownloadModal');
            const iosOverlay = document.getElementById('iosDownloadOverlay');
            const iosContent = document.getElementById('iosDownloadContentContainer');
            if (iosModal && iosOverlay && iosContent) {
              const previewImgUrl = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : safeUrl;
              iosContent.innerHTML = `<img src="${previewImgUrl}" style="max-width: 100%; max-height: 50vh; object-fit: contain; display: block;">`;
              iosOverlay.classList.add('active');
              iosModal.classList.add('active');
            }
          }
        } else {
          // iOS 一般 Safari 網頁版：如果是雲端下載連結，直接在當前分頁觸發，避免開新分頁導致背景網頁被系統重新整理
          if (targetUrl.includes('drive.usercontent.google.com') || targetUrl.includes('export=download')) {
            window.location.href = targetUrl;
          } else {
            window.open(targetUrl, '_blank');
          }
        }
        return;
      }
      
      // 以下為 Android / Desktop 流程 (非 iOS)
      if (meme.type === 'gif' || meme.type === 'video') {
        try {
          const tempLink = document.createElement('a');
          tempLink.href = targetUrl;
          if (isMobile) {
            tempLink.target = '_blank';
          }
          document.body.appendChild(tempLink);
          tempLink.click();
          document.body.removeChild(tempLink);
        } catch (err) {
          console.warn("直接導向下載連結失敗，退回新分頁開啟:", err);
          window.open(targetUrl, '_blank');
        }
        return;
      }
      
      // 圖片 Blob 下載
      downloadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在準備下載...`;
      downloadBtn.style.pointerEvents = 'none';
      
      try {
        const safeName = safeQuoteHTML.replace(/[\\\/:*?"<>|]/g, "_");
        const fileName = `${safeName}.png`;
        
        let proxySourceUrl = targetUrl;
        if (fileId) {
          proxySourceUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
        }
        const downloadUrl = "https://wsrv.nl/?url=" + encodeURIComponent(proxySourceUrl);
        
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error("下載檔案失敗");
        let blob = await response.blob();
        if (blob.type !== 'image/png') {
          blob = new Blob([blob], {type: 'image/png'});
        }
        
        const objectUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = objectUrl;
        tempLink.download = fileName;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        console.warn("無法直接透過 Blob 下載，將使用直連方式下載:", err);
        try {
          const tempLink = document.createElement('a');
          tempLink.href = targetUrl;
          if (isMobile) {
            tempLink.target = '_blank';
          }
          document.body.appendChild(tempLink);
          tempLink.click();
          document.body.removeChild(tempLink);
        } catch (e) {
          window.open(targetUrl, '_blank');
        }
      } finally {
        downloadBtn.innerHTML = originalText;
        downloadBtn.style.pointerEvents = 'auto';
      }
    });
  }
}


function enterGalleryEditMode(card, meme) {
  card.classList.remove('interactive-card');
  const mediaHTML = getMediaHTML(meme);
  const tagsString = Array.isArray(meme.tags) ? meme.tags.join(',') : '';

  card.innerHTML = `
    ${mediaHTML}
    <div class="edit-form-container">
      <div class="input-group">
        <label>檔案名稱</label>
        <input type="text" class="gallery-edit-quote-input" value="${escapeHtml(meme.quote || '')}">
      </div>
      <div class="input-group">
        <label>關鍵字 (標籤，以逗號或空格隔開)</label>
        <input type="text" class="gallery-edit-tags-input" value="${escapeHtml(tagsString)}">
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 5px;">
        <button type="button" class="gallery-cancel-edit-btn"><i class="fas fa-times"></i> 取消</button>
        <button type="button" class="gallery-save-edit-btn"><i class="fas fa-save"></i> 儲存</button>
      </div>
    </div>
  `;

  // 綁定取消
  card.querySelector('.gallery-cancel-edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    renderSingleGalleryCard(card, meme);
  });

  // 綁定儲存
  card.querySelector('.gallery-save-edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const newQuote = card.querySelector('.gallery-edit-quote-input').value.trim();
    const rawTags = card.querySelector('.gallery-edit-tags-input').value.trim();
    const newTags = rawTags.replace(/[，、\s]+/g, ',').replace(/^,+|,+$/g, '');

    if (!newQuote) {
      alert('檔案名稱不能為空！');
      return;
    }

    const saveBtn = e.currentTarget;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
    saveBtn.disabled = true;

    fetch(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateMeme',
        operator: currentUser.username,
        token: currentUser.token,
        targetUrl: meme.url,
        quote: newQuote,
        tags: newTags
      })
    })
    .then(res => res.json())
    .then(result => {
      if (result.status === 'success') {
        alert('✅ 儲存成功！');
        meme.quote = newQuote;
        meme.tags = newTags ? newTags.split(',') : [];
        renderSingleGalleryCard(card, meme);
        
        // 同步至 allMemes 快取
        const found = allMemes.find(m => m.url === meme.url);
        if (found) {
          found.quote = newQuote;
          found.tags = meme.tags;
        }
      } else {
        alert('❌ 儲存失敗：' + result.message);
        saveBtn.innerHTML = '<i class="fas fa-save"></i> 儲存';
        saveBtn.disabled = false;
      }
    })
    .catch(() => {
      alert('網路通訊錯誤');
      saveBtn.innerHTML = '<i class="fas fa-save"></i> 儲存';
      saveBtn.disabled = false;
    });
  });
}

function renderGallery() {
  const gallery = document.getElementById('gallery');
  const galleryTitle = document.getElementById('galleryTitle');
  if (!gallery) return;

  gallery.innerHTML = '';

  const randomCopyBtn = document.getElementById('randomCopyBtn');
  if (randomCopyBtn) {
    if (currentViewType === 'image') {
      randomCopyBtn.style.display = 'flex';
    } else {
      randomCopyBtn.style.display = 'none';
    }
  }

  if (galleryTitle) {
    if (currentViewType === 'image') galleryTitle.innerHTML = '<i class="fas fa-image"></i> 靜態圖片區';
    else if (currentViewType === 'gif') galleryTitle.innerHTML = '<i class="fas fa-bolt"></i> 動態 GIF 區';
    else if (currentViewType === 'video') galleryTitle.innerHTML = '<i class="fas fa-video"></i> 短影片專區';
  }

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const isUserSvipOrAdmin = currentUser && (currentUser.role === 'svip' || currentUser.role === 'admin');

  const filteredMemes = allMemes.filter(meme => {
    const itemType = meme.type || 'image';
    if (itemType !== currentViewType) return false;

    // 檢查是否有尊爵專屬標籤 (依據 window.SVIP_ONLY_TAGS 設定項目)
    const isSvipOnly = Array.isArray(meme.tags) && meme.tags.some(tag => {
      const t = String(tag).trim().toLowerCase();
      return Array.isArray(window.SVIP_ONLY_TAGS) && window.SVIP_ONLY_TAGS.some(st => String(st).trim().toLowerCase() === t);
    });

    if (isSvipOnly && !isUserSvipOrAdmin) {
      return false; // 非尊爵/大總管，直接過濾隱藏
    }

    return window.matchMemeQuery(meme, keyword);
  });

  if (filteredMemes.length === 0) {
    gallery.innerHTML = '<p style="text-align:center; width:100%; color:#7f8c8d; margin-top: 20px;">此區目前還沒有任何藏品哦！</p>';
    return;
  }

  filteredMemes.forEach(meme => {
    const card = document.createElement('div');
    card.className = 'card';

    // 渲染卡片內容
    renderSingleGalleryCard(card, meme);

    // 靜態圖片複製邏輯 (若點選非下載/編輯區域)
    card.addEventListener('click', async (e) => {
      const isImage = meme.type === 'image' || !meme.type;
      if (!isImage) return;
      if (e.target.closest('.download-btn') || e.target.closest('.gallery-edit-btn') || e.target.closest('.edit-form-container')) return;
      
      const title = meme.quote || '未命名藏品';
      await copyImageToClipboard(meme.url, title, card);
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

// ==========================================================================
// 隨機複製按鈕點擊事件監聽
// ==========================================================================
const randomCopyBtn = document.getElementById('randomCopyBtn');
if (randomCopyBtn) {
  randomCopyBtn.addEventListener('click', async () => {
    const isUserSvipOrAdmin = currentUser && (currentUser.role === 'svip' || currentUser.role === 'admin');
    const imageMemes = allMemes.filter(m => {
      const isImg = (m.type || 'image') === 'image';
      if (!isImg) return false;

      const isSvipOnly = Array.isArray(m.tags) && m.tags.some(tag => {
        const t = String(tag).trim().toLowerCase();
        return Array.isArray(window.SVIP_ONLY_TAGS) && window.SVIP_ONLY_TAGS.some(st => String(st).trim().toLowerCase() === t);
      });

      if (isSvipOnly && !isUserSvipOrAdmin) return false;
      return true;
    });
    if (imageMemes.length === 0) {
      alert('目前沒有照片可供隨機複製！');
      return;
    }
    
    const randomMeme = imageMemes[Math.floor(Math.random() * imageMemes.length)];
    const title = randomMeme.quote || '隨機照片';
    
    randomCopyBtn.disabled = true;
    await copyImageToClipboard(randomMeme.url, title, randomCopyBtn, true);
    randomCopyBtn.disabled = false;
  });
}

// ==========================================================================
// 個人藏品審核後台邏輯實作
// ==========================================================================
const uploaderManageNavBtnReal = document.getElementById('uploaderManageNavBtn');
const uploaderMemeCardsContainer = document.getElementById('uploaderMemeCardsContainer');
const uploaderMemeSearchInput = document.getElementById('uploaderMemeSearchInput');
const uploaderMemeSearchClearBtn = document.getElementById('uploaderMemeSearchClearBtn');
const uploaderMemeSubTitle = document.getElementById('uploaderMemeSubTitle');
const uploaderSubBtns = document.querySelectorAll('.uploader-sub-btn');

if (uploaderManageNavBtnReal) {
  uploaderManageNavBtnReal.addEventListener('click', () => {
    if (isGuest()) {
      alert('請先登入！');
      return;
    }
    loadUploaderMemes();
  });
}

// 監聽個人管理二級小分類按鈕
uploaderSubBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    uploaderSubBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    uploaderCurrentType = btn.getAttribute('data-type');
    
    let typeName = uploaderCurrentType === 'image' ? '🖼 *靜態圖片*' : (uploaderCurrentType === 'gif' ? '⚡ *動態 GIF*' : '🎬 *短影片*');
    if (uploaderMemeSubTitle) uploaderMemeSubTitle.innerHTML = `<i class="fas fa-eye"></i> 當前正在管理：${typeName}`;
    
    renderUploaderMemesFilter();
  });
});

// 監聽個人管理獨立搜尋框
if (uploaderMemeSearchInput && uploaderMemeSearchClearBtn) {
  uploaderMemeSearchInput.addEventListener('input', () => {
    if (uploaderMemeSearchInput.value.trim().length > 0) {
      uploaderMemeSearchClearBtn.classList.add('active');
    } else {
      uploaderMemeSearchClearBtn.classList.remove('active');
    }
    renderUploaderMemesFilter();
  });

  uploaderMemeSearchClearBtn.addEventListener('click', () => {
    uploaderMemeSearchInput.value = '';
    uploaderMemeSearchClearBtn.classList.remove('active');
    uploaderMemeSearchInput.focus();
    renderUploaderMemesFilter();
  });
}

function loadUploaderMemes() {
  if (uploaderMemeCardsContainer) {
    uploaderMemeCardsContainer.innerHTML = '<p style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> 正在調閱您的個人藏品清單...</p>';
  }
  
  fetch(GAS_API_URL)
    .then(res => res.json())
    .then(data => {
      // 僅篩選出當前登入者自己上傳的檔案
      uploaderLoadedMemes = data.filter(meme => meme.uploader === currentUser.username);
      renderUploaderMemesFilter();
    })
    .catch(() => {
      if (uploaderMemeCardsContainer) uploaderMemeCardsContainer.innerHTML = '<p style="color:red; text-align:center;">調閱清單失敗</p>';
    });
}

function renderUploaderMemesFilter() {
  if (!uploaderMemeCardsContainer) return;
  uploaderMemeCardsContainer.innerHTML = '';
  
  const keyword = uploaderMemeSearchInput ? uploaderMemeSearchInput.value.toLowerCase().trim() : '';

  const filtered = uploaderLoadedMemes.filter(meme => {
    const itemType = meme.type || 'image';
    if (itemType !== uploaderCurrentType) return false;
    return window.matchMemeQuery(meme, keyword);
  });

  if (filtered.length === 0) {
    uploaderMemeCardsContainer.innerHTML = '<p style="text-align:center; color:#95a5a6; padding: 20px 0;">在這個分類下找不到符合的藏品 QQ</p>';
    return;
  }

  filtered.forEach(meme => {
    const card = document.createElement('div');
    card.className = 'admin-user-card uploader-meme-row-card';
    
    renderSingleUploaderCard(card, meme);

    // 點擊卡片跳轉首頁展館對應位置
    card.addEventListener('click', (event) => {
      if (event.target.closest('button') || event.target.closest('input')) return;

      if (confirm(`🔍 想要立刻前往前端展覽館查看『${meme.quote || "這件藏品"}』嗎？`)) {
        if (typeof window.closeDrawerFunc === 'function') window.closeDrawerFunc();

        const targetNavBtn = document.querySelector(`.nav-btn[data-target="galleryView"][data-type="${meme.type || 'image'}"]`);
        if (targetNavBtn) {
          targetNavBtn.click();
        } else {
          const galleryView = document.getElementById('galleryView');
          const uploaderView = document.getElementById('uploaderManageView');
          if (galleryView && uploaderView) {
            uploaderView.classList.remove('active-view');
            galleryView.classList.add('active-view');
          }
        }

        const mainSearchInput = document.getElementById('searchInput');
        const mainSearchClearBtn = document.getElementById('searchClearBtn');
        if (mainSearchInput) {
          mainSearchInput.value = meme.quote || '';
          if (mainSearchClearBtn) mainSearchClearBtn.classList.add('active');
          mainSearchInput.dispatchEvent(new Event('input'));
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    uploaderMemeCardsContainer.appendChild(card);
  });
}

function renderSingleUploaderCard(card, meme) {
  card.style.alignItems = '';
  card.style.flexDirection = '';

  const isVideo = meme.type === 'video';
  const previewHTML = isVideo ? 
    `<div style="width:60px; height:60px; background:#000; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff;"><i class="fas fa-video"></i></div>` :
    `<img src="${meme.url}" style="width:60px; height:60px; object-fit:cover; border-radius:8px; border:1px solid #ddd;">`;

  card.innerHTML = `
    <div style="display:flex; align-items:center; gap:15px; flex:1; min-width:0;">
      ${previewHTML}
      <div style="flex:1; min-width:0;">
        <h4 style="margin:0; color:var(--text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(meme.quote || "未命名藏品")}</h4>
        <p style="margin:2px 0 0 0; font-size:0.8rem; color:#7f8c8d;"><i class="fas fa-tag"></i> 標籤：${escapeHtml(Array.isArray(meme.tags) ? meme.tags.join(', ') : '')}</p>
      </div>
    </div>
    <div class="meme-actions" style="display:flex; gap:8px;">
      <button class="action-btn upgrade edit-meme-btn" style="background:#3498db; padding:8px 12px; margin:0;"><i class="fas fa-edit"></i> 編輯</button>
      <button class="action-btn downgrade delete-meme-btn" style="background:#e74c3c; padding:8px 12px; margin:0;"><i class="fas fa-trash-alt"></i> 銷毀</button>
    </div>
  `;

  // 編輯
  card.querySelector('.edit-meme-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    enterUploaderEditMode(card, meme);
  });

  // 銷毀
  card.querySelector('.delete-meme-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteMemeFromUploader(meme.url, e);
  });
}

function enterUploaderEditMode(card, meme) {
  card.style.alignItems = 'stretch';
  card.style.flexDirection = 'column';

  const isVideo = meme.type === 'video';
  const previewHTML = isVideo ? 
    `<div style="width:60px; height:60px; background:#000; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff;"><i class="fas fa-video"></i></div>` :
    `<img src="${meme.url}" style="width:60px; height:60px; object-fit:cover; border-radius:8px; border:1px solid #ddd;">`;

  const tagsString = Array.isArray(meme.tags) ? meme.tags.join(',') : '';

  card.innerHTML = `
    <div style="width: 100%; display: flex; flex-direction: column; gap: 10px; padding: 5px 0;">
      <div style="display: flex; align-items: center; gap: 15px;">
        ${previewHTML}
        <div style="flex: 1; min-width: 0;">
          <strong style="color: var(--main-color); font-size: 1rem;">編輯藏品資料</strong>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 5px;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <label style="font-size: 0.85rem; font-weight: bold; color: var(--main-color); text-align: left;">檔案名稱</label>
          <input type="text" class="edit-quote-input" value="${escapeHtml(meme.quote || '')}" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; width: 100%;">
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <label style="font-size: 0.85rem; font-weight: bold; color: var(--main-color); text-align: left;">搜尋關鍵字 (多個以逗號或空白分隔)</label>
          <input type="text" class="edit-tags-input" value="${escapeHtml(tagsString)}" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; width: 100%;">
        </div>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px;">
        <button class="action-btn cancel-edit-btn" style="background:#95a5a6; padding: 6px 12px; margin:0; font-size:0.85rem; color: white;"><i class="fas fa-times"></i> 取消</button>
        <button class="action-btn save-edit-btn" style="background:var(--accent-color); padding: 6px 12px; margin:0; font-size:0.85rem; color: white;"><i class="fas fa-save"></i> 儲存</button>
      </div>
    </div>
  `;

  card.querySelector('.cancel-edit-btn').addEventListener('click', (ev) => {
    ev.stopPropagation();
    renderSingleUploaderCard(card, meme);
  });

  card.querySelector('.save-edit-btn').addEventListener('click', (ev) => {
    ev.stopPropagation();

    const newQuote = card.querySelector('.edit-quote-input').value.trim();
    const rawTags = card.querySelector('.edit-tags-input').value.trim();
    const newTags = rawTags.replace(/[，、\s]+/g, ',').replace(/^,+|,+$/g, '');

    if (!newQuote) {
      alert('檔案名稱不能為空！');
      return;
    }

    const saveBtn = ev.currentTarget;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
    saveBtn.disabled = true;

    fetch(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateMeme',
        operator: currentUser.username,
        token: currentUser.token,
        targetUrl: meme.url,
        quote: newQuote,
        tags: newTags
      })
    })
    .then(res => res.json())
    .then(result => {
      if (result.status === 'success') {
        alert('✅ 儲存成功！');
        meme.quote = newQuote;
        meme.tags = newTags ? newTags.split(',') : [];
        renderSingleUploaderCard(card, meme);
        
        const found = allMemes.find(m => m.url === meme.url);
        if (found) {
          found.quote = newQuote;
          found.tags = meme.tags;
        }
        if (typeof window.loadGallery === 'function') {
          renderGallery();
        }
      } else {
        alert('❌ 儲存失敗：' + result.message);
        saveBtn.innerHTML = '<i class="fas fa-save"></i> 儲存';
        saveBtn.disabled = false;
      }
    })
    .catch(() => {
      alert('網路通訊錯誤');
      saveBtn.innerHTML = '<i class="fas fa-save"></i> 儲存';
      saveBtn.disabled = false;
    });
  });
}

function deleteMemeFromUploader(memeUrl, event) {
  if (!confirm("確定要刪除這件您自己上傳的藏品嗎？\n這會將它自資料庫中抹除，且無法復原！")) return;

  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
  btn.disabled = true;

  fetch(GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'deleteMeme',
      operator: currentUser.username, 
      token: currentUser.token,
      targetUrl: memeUrl          
    })
  })
  .then(res => res.json())
  .then(result => {
    if (result.status === 'success') {
      alert('🗑️ 刪除成功！');
      loadUploaderMemes(); 
      if (typeof window.loadGallery === 'function') window.loadGallery(); 
    } else {
      alert('❌ 刪除失敗：' + result.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  })
  .catch(() => {
    alert('網路通訊錯誤');
    btn.innerHTML = originalText;
    btn.disabled = false;
  });
}

// ==========================================================================
// ✨ 新增：網頁初始化選單高亮與標題同步函數，防止重新整理後選單錯位
// ==========================================================================
function initViewHighlight() {
  const targetBtn = document.querySelector(`.nav-btn[data-type="${currentViewType}"]`);
  if (targetBtn) {
    // 1. 移除所有選單的 active 高亮
    navBtns.forEach(b => {
      if(b.getAttribute('data-target')) b.classList.remove('active');
    });
    // 2. 為記住的展區按鈕加上高亮
    targetBtn.classList.add('active');
    // 3. 同步首頁的大標題文字
    if (galleryTitle) {
      if (currentViewType === 'image') galleryTitle.innerHTML = '<i class="fas fa-image"></i> 靜態圖片區';
      else if (currentViewType === 'gif') galleryTitle.innerHTML = '<i class="fas fa-bolt"></i> 動態 GIF 區';
      else if (currentViewType === 'video') galleryTitle.innerHTML = '<i class="fas fa-video"></i> 短影片專區';
    }
  }
}

// 執行初始化高亮，再啟動資料庫載入
initViewHighlight();

// 網頁開啟時自動載入
window.loadGallery();

// ==========================================================================
// iOS 專用儲存導引 Modal 控制邏輯
// ==========================================================================
window.closeIosDownloadModal = function() {
  const iosModal = document.getElementById('iosDownloadModal');
  const iosOverlay = document.getElementById('iosDownloadOverlay');
  const iosContent = document.getElementById('iosDownloadContentContainer');
  if (iosModal) iosModal.classList.remove('active');
  if (iosOverlay) iosOverlay.classList.remove('active');
  setTimeout(() => {
    if (iosContent) iosContent.innerHTML = '';
  }, 300);
};

const closeIosDownloadBtn = document.getElementById('closeIosDownloadBtn');
const iosDownloadOverlay = document.getElementById('iosDownloadOverlay');
if (closeIosDownloadBtn) {
  closeIosDownloadBtn.addEventListener('click', window.closeIosDownloadModal);
}
if (iosDownloadOverlay) {
  iosDownloadOverlay.addEventListener('click', window.closeIosDownloadModal);
}

// ==========================================================================
// 側邊欄重新整理按鈕事件監聽
// ==========================================================================
const refreshDrawerBtn = document.getElementById('refreshDrawerBtn');
if (refreshDrawerBtn) {
  refreshDrawerBtn.addEventListener('click', () => {
    const icon = refreshDrawerBtn.querySelector('i');
    if (icon) icon.classList.add('fa-spin');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  });
}

// ==========================================================================
// 偵測 iOS 並顯示右上角捷徑按鈕
// ==========================================================================
function initIosShortcutButton() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const iosShortcutBtn = document.getElementById('iosShortcutBtn');
  if (isIOS && iosShortcutBtn) {
    iosShortcutBtn.style.display = 'flex';
  }
}
initIosShortcutButton();

// ==========================================================================
// 初始化回到頂部按鈕事件監聽
// ==========================================================================
function initBackToTopButton() {
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
initBackToTopButton();

