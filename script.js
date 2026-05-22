
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
    } else {
      uploadType = 'image';
      maxSizeMB = 5;
      badgeText = '🖼️ 靜態圖片';
      badgeClass = 'file-type-badge badge-image';
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`檔案太大了！此類型檔案（${uploadType === 'image' ? '靜態圖片' : '影片/動圖'}）最大限制為 ${maxSizeMB}MB！`);
      imageInput.value = '';
      fileNameDisplay.innerText = '尚未選擇檔案';
      fileTypeBadge.style.display = 'none';
      currentUploadFileType = 'image';
      return;
    }

    currentUploadFileType = uploadType;
    fileTypeBadge.innerText = badgeText;
    fileTypeBadge.className = badgeClass;
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
        uploader: currentUser.username,
        operator: currentUser.username,
        token: currentUser.token
      };

      fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(response => response.json())
      .then(result => {
        if (result.status === 'success') {
          alert('藏品上傳成功！');
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
        allMemes = data.reverse(); 
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
    
    const safeQuote = String(meme.quote || '').toLowerCase();
    const matchQuote = safeQuote.includes(keyword);
    
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

    const safeQuoteHTML = String(meme.quote || '未命名藏品');
    const safeUrl = String(meme.url || '');

    // A. 靜態圖片區
    if (currentViewType === 'image') {
      card.classList.add('interactive-card');
      const fileIdMatch = safeUrl.match(/id=([^&]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : '';
      const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : safeUrl;
      
      card.innerHTML = `
        <img class="card-media" src="${safeUrl}" alt="${safeQuoteHTML}">
        <p class="card-title">${safeQuoteHTML}</p>
        ${tagsHTML}
        <a href="${downloadUrl}" target="_blank" class="download-btn"><i class="fas fa-download"></i> 點此下載照片</a>
      `;

      card.addEventListener('click', async (e) => {
        if (e.target.closest('.download-btn')) return;
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
          console.warn("Blob 複製失敗，退回複製代理網址:", err);
          const fallbackUrl = "https://wsrv.nl/?url=" + encodeURIComponent(safeUrl);
          navigator.clipboard.writeText(fallbackUrl)
            .then(() => alert(`圖片已複製為「圖片網址」！\n在 LINE、Messenger 貼上送出後會自動展開成圖片哦！`))
            .catch(e => console.error(e));
        } finally {
          card.style.opacity = '1';
        }
      });
      
    // B. 動態 GIF 區
    } else if (currentViewType === 'gif') {
      const fileIdMatch = safeUrl.match(/id=([^&]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : '';
      // 使用 lh3.googleusercontent.com/d/ID 解決大檔案 Google Drive 防毒警告導致的破圖問題，且保持動態 GIF 效果
      const directUrl = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : safeUrl;
      const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : safeUrl;
      
      card.innerHTML = `
        <img class="card-media" src="${directUrl}" alt="${safeQuoteHTML}">
        <p class="card-title">${safeQuoteHTML}</p>
        ${tagsHTML}
        <a href="${downloadUrl}" target="_blank" class="download-btn"><i class="fas fa-download"></i> 點此下載動圖</a>
      `;

    // C. 影音區
    } else if (currentViewType === 'video') {
      const fileIdMatch = safeUrl.match(/id=([^&]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : '';
      const iframeUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : safeUrl;
      
      card.innerHTML = `
        <div class="media-wrapper video-wrapper">
          <iframe class="card-media video-iframe" src="${iframeUrl}" allow="autoplay" allowfullscreen style="border:none; background:#000;"></iframe>
        </div>
        <p class="card-title">${safeQuoteHTML}</p>
        ${tagsHTML}
        <a href="${safeUrl}" target="_blank" class="download-btn"><i class="fas fa-download"></i> 點此下載影片</a>
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

    // 點擊下載按鈕優化：攔截並在背景透過 Blob 觸發真正的本地下載對話框，解決跨網域直接開新預覽分頁的痛點
    const downloadBtn = card.querySelector('.download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async (event) => {
        event.preventDefault(); // 阻止開新分頁預覽
        event.stopPropagation(); // 阻止冒泡至卡片
        
        const originalText = downloadBtn.innerHTML;
        const targetUrl = downloadBtn.getAttribute('href'); // 這會是 https://drive.google.com/uc?export=download&id=FILE_ID 或 safeUrl
        const fileIdMatch = targetUrl.match(/id=([^&]+)/);
        const fileId = fileIdMatch ? fileIdMatch[1] : '';
        
        // 判斷是否為行動裝置
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 對於 GIF 與影片，我們不進行 Blob 下載，因為 GIF 容易被轉為靜態圖片且檔案大易超時，影片則無法透過 wsrv.nl fetch。
        // 我們直接以 Google Drive 的官方下載連結進行下載。
        if (currentViewType === 'gif' || currentViewType === 'video') {
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
        
        // 對於靜態圖片，我們嘗試用 Blob 下載以指定自訂檔名
        downloadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在準備下載...`;
        downloadBtn.style.pointerEvents = 'none';
        
        try {
          const safeName = safeQuoteHTML.replace(/[\\\/:*?"<>|]/g, "_");
          const fileName = `${safeName}.png`;
          
          // 使用 wsrv.nl 避開 CORS 限制以進行 fetch 獲取二進位資料。
          // 為了讓 wsrv.nl 更好處理，如果 fileId 存在，我們使用 thumbnail 網址做為代理源。
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
          
          // 在同源 origin 下建立虛擬連結以觸發 download 屬性
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
          // Fallback 1: 建立直連下載連結 (不走 Blob)
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
    if (galleryTitle) galleryTitle.innerHTML = targetBtn.innerHTML;
  }
}

// 執行初始化高亮，再啟動資料庫載入
initViewHighlight();

// 網頁開啟時自動載入
window.loadGallery();
