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

// 升級為全域函數，讓 auth.js 可以呼叫
window.openDrawer = function() {
  if(navDrawer) navDrawer.classList.add('active');
  if(drawerOverlay) drawerOverlay.classList.add('active');
}

window.closeDrawerFunc = function() {
  if(navDrawer) navDrawer.classList.remove('active');
  if(drawerOverlay) drawerOverlay.classList.remove('active');
}

menuToggle.addEventListener('click', window.openDrawer);
if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', window.closeDrawerFunc);
if (drawerOverlay) drawerOverlay.addEventListener('click', window.closeDrawerFunc);

// 導覽列點擊邏輯 (包含分類切換與防護盾)
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const targetType = btn.getAttribute('data-type'); 

    // ✨ 終極防護盾：如果這個按鈕沒有設定 data-target (例如登入按鈕)，直接跳出，交給 auth.js 處理
    if (!targetId) return;

    // 隱藏所有視圖
    viewSections.forEach(sec => sec.classList.remove('active-view'));
    
    // 顯示目標視圖
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.classList.add('active-view');
    }

    // 選單高亮切換
    navBtns.forEach(b => {
      if(b.getAttribute('data-target')) b.classList.remove('active');
    });
    btn.classList.add('active');

    // 如果點擊的是畫廊展區，切換館別並重新渲染
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

// 處理上傳送出
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
        uploader: currentUser.username // ✨ 新增：將目前的登入帳號傳給後端記錄！
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
// 讀取與渲染邏輯 (分流渲染機制)
// ==========================================================================
window.loadGallery = function() {
  if (gallery) gallery.innerHTML = '<p>努力加載藏品中，請稍候...</p>';
  
  fetch(GAS_API_URL)
    .then(response => response.json())
    .then(data => {
      allMemes = data;
      renderGallery(); 
    })
    .catch(err => {
      console.error('載入失敗:', err);
      if (gallery) gallery.innerHTML = '<p>載入失敗，阿公的伺服器可能在睡覺 QQ</p>';
    });
}

// ==========================================================================
// 渲染畫廊 (全端完整修復版：修復卡片消失、影片黑邊、GIF凍結問題)
// ==========================================================================
function renderGallery() {
  const gallery = document.getElementById('gallery');
  const galleryTitle = document.getElementById('galleryTitle');
  if (!gallery) return;

  gallery.innerHTML = '';

  // 1. 動態更新展區標題
  if (galleryTitle) {
    if (currentViewType === 'image') galleryTitle.innerHTML = '<i class="fas fa-image"></i> 🖼️ 靜態圖片區';
    else if (currentViewType === 'gif') galleryTitle.innerHTML = '<i class="fas fa-bolt"></i> ⚡ 動態 GIF 區';
    else if (currentViewType === 'video') galleryTitle.innerHTML = '<i class="fas fa-video"></i> 🎬 短影片專區';
  }

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

  // 2. 篩選目前要顯示的藏品
  const filteredMemes = allMemes.filter(meme => {
    const itemType = meme.type || 'image';
    if (itemType !== currentViewType) return false;

    if (!keyword) return true;
    const matchQuote = meme.quote && meme.quote.toLowerCase().includes(keyword);
    const matchTags = meme.tags ? meme.tags.some(tag => tag.toLowerCase().includes(keyword)) : false;
    return matchQuote || matchTags;
  });

  if (filteredMemes.length === 0) {
    gallery.innerHTML = '<p style="text-align:center; width:100%; color:#7f8c8d; margin-top: 20px;">此區目前還沒有任何藏品哦！</p>';
    return;
  }

  // 3. 逐一產生卡片並貼上畫面
  filteredMemes.forEach(meme => {
    const card = document.createElement('div');
    card.className = 'card';

    // 產生標籤 HTML
    let tagsHTML = '';
    if (meme.tags && meme.tags.length > 0 && meme.tags[0] !== "") {
      const tagsList = meme.tags.map(t => `<span class="tag-badge">#${t.trim()}</span>`).join('');
      tagsHTML = `<div class="card-tags">${tagsList}</div>`;
    }

    // A. 處理靜態圖片
    if (currentViewType === 'image') {
      card.classList.add('interactive-card');
      card.innerHTML = `
        <img class="card-media" src="${meme.url}" alt="${meme.quote}">
        <p class="card-title">${meme.quote}</p>
        ${tagsHTML}
      `;

      card.addEventListener('click', async () => {
        try {
          card.style.opacity = '0.5';
          const proxyUrl = "https://wsrv.nl/?url=" + encodeURIComponent(meme.url);
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error('阻擋下載');
          let blob = await response.blob();
          if (blob.type !== 'image/png') blob = new Blob([blob], {type: 'image/png'});
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          alert(`已成功複製照片：${meme.quote}！\n可以直接貼上了！`);
        } catch (err) {
          navigator.clipboard.writeText(meme.url)
            .then(() => alert(`圖片本體下載失敗，但已複製「圖片網址」！`))
            .catch(e => console.error(e));
        } finally {
          card.style.opacity = '1';
        }
      });
      
    // B. 處理 GIF 動圖與短影片 (套用防黑邊智慧外殼)
    } else if (currentViewType === 'video' || currentViewType === 'gif') {
      const fileIdMatch = meme.url.match(/id=([^&]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : '';
      const fileTypeName = currentViewType === 'video' ? '影片' : '動圖';

      const iframeUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : meme.url;
      let mediaHTML = '';

      if (currentViewType === 'video') {
        mediaHTML = `<iframe class="card-media video-iframe" src="${iframeUrl}" allow="autoplay" allowfullscreen style="border:none; background:#000;"></iframe>`;
      } else if (currentViewType === 'gif') {
        mediaHTML = `<iframe class="card-media gif-iframe" src="${iframeUrl}" style="border:none; background:#000; pointer-events: none;"></iframe>`;
      }

      card.innerHTML = `
        <div class="media-wrapper">${mediaHTML}</div>
        <p class="card-title">${meme.quote}</p>
        ${tagsHTML}
        <a href="${meme.url}" target="_blank" class="download-btn"><i class="fas fa-external-link-alt"></i> 點此開啟原始${fileTypeName} / 下載</a>
      `;
    }

    // 4. 綁定標籤點擊搜尋事件
    const tagBadges = card.querySelectorAll('.tag-badge');
    tagBadges.forEach(badge => {
      badge.addEventListener('click', (event) => {
        event.stopPropagation();
        const tagText = badge.innerText.replace('#', '').trim();
        if (searchInput) searchInput.value = tagText;
        const clearBtn = document.getElementById('searchClearBtn');
        if (clearBtn) clearBtn.classList.add('active'); // 讓叉叉自動亮起
        renderGallery();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // 👑 絕不能漏掉的靈魂核心：把做好的卡片貼到畫面上！
    gallery.appendChild(card); 
  });
}

// ==========================================================================
// ✨ 新增：搜尋欄叉叉按鈕聯動邏輯
// ==========================================================================
if (searchInput && searchClearBtn) {
  // A. 監聽使用者輸入：只要有打字就顯示叉叉，沒打字就隱藏
  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
      searchClearBtn.classList.add('active'); // 彈出叉叉
    } else {
      searchClearBtn.classList.remove('active'); // 隱藏叉叉
    }
    renderGallery(); // 觸發原本的即時搜尋渲染
  });

  // B. 監聽叉叉點擊：點擊後清空、隱藏叉叉、重新渲染完整畫廊
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = ''; // 1. 清空文字
    searchClearBtn.classList.remove('active'); // 2. 隱藏自己
    searchInput.focus(); // 3. 貼心體驗：讓游標自動重新聚焦在搜尋框內
    renderGallery(); // 4. 恢復顯示當前展區的所有迷因
  });
}

// 網頁開啟時自動載入
window.loadGallery();

// ==========================================================================
// ✨ 新增：手機版短影片點擊播放/暫停與智慧控制條切換
// ==========================================================================
window.toggleMobileVideo = function(videoEl) {
  if (videoEl.paused) {
    // 1. 播放影片
    videoEl.play();
    // 2. 當使用者真的點擊播放後，才把控制條叫出來，方便他調整進度和全螢幕
    videoEl.setAttribute('controls', 'true');
  } else {
    // 3. 再次點擊則暫停
    videoEl.pause();
    // 4. 暫停時可以選擇保留或移除控制條，這裡保持顯示方便操作
  }
}
