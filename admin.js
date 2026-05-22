// admin.js - 大總管審核後台（包含二級分流、獨立搜尋、跨視圖錨點跳轉）

const adminNavBtnReal = document.getElementById('adminNavBtn');
const adminUserList = document.getElementById('adminUserList');
const adminMemeList = document.getElementById('adminMemeList');

const showUserSubView = document.getElementById('showUserSubView');
const showMemeSubView = document.getElementById('showMemeSubView');

// 後台藏品獨立搜尋與分類 DOM
const adminMemeSearchInput = document.getElementById('adminMemeSearchInput');
const adminMemeSearchClearBtn = document.getElementById('adminMemeSearchClearBtn');
const adminMemeSubTitle = document.getElementById('adminMemeSubTitle');
const adminMemeCardsContainer = document.getElementById('adminMemeCardsContainer');
const adminSubBtns = document.querySelectorAll('.admin-sub-btn');

// --- 後台全域狀態 ---
let adminLoadedMemes = []; // 快取從後端抓到的全站藏品
let adminCurrentType = 'image'; // 後台當前切換的類型 (image, gif, video)

if (adminNavBtnReal) {
  adminNavBtnReal.addEventListener('click', () => {
    if (currentUser.role !== 'admin') {
      alert('你不是大總管，退下！');
      return;
    }
    loadAdminUsers();
    if(adminUserList) adminUserList.style.display = 'flex';
    if(adminMemeList) adminMemeList.style.display = 'none';
  });
}

// ==========================================================================
// 主頁籤切換邏輯 (會員管理 vs 藏品審核)
// ==========================================================================
if (showUserSubView && showMemeSubView) {
  showUserSubView.addEventListener('click', () => {
    adminUserList.style.display = 'flex';
    adminMemeList.style.display = 'none';
    loadAdminUsers();
  });
  
  showMemeSubView.addEventListener('click', () => {
    adminUserList.style.display = 'none';
    adminMemeList.style.display = 'flex';
    if (adminMemeSearchInput) {
      adminMemeSearchInput.value = ''; // 點進來時清空搜尋
      if (adminMemeSearchClearBtn) adminMemeSearchClearBtn.classList.remove('active');
    }
    loadAdminMemes(); 
  });
}

// ==========================================================================
// 後台功能一：會員權限管理
// ==========================================================================
function loadAdminUsers() {
  adminUserList.innerHTML = '<p style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> 正在向資料庫索取使用者名單...</p>';
  
  fetch(GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'getUsers',
      operator: currentUser.username,
      token: currentUser.token
    })
  })
  .then(res => res.json())
  .then(result => {
    if (result.status === 'success') {
      renderAdminUsers(result.users);
    } else {
      adminUserList.innerHTML = `<p style="color:red; text-align:center;">獲取失敗：${result.message}</p>`;
    }
  })
  .catch(() => {
    adminUserList.innerHTML = `<p style="color:red; text-align:center;">網路錯誤，請稍後再試</p>`;
  });
}

function renderAdminUsers(users) {
  adminUserList.innerHTML = '';
  const targetUsers = users.filter(u => u.role !== 'admin');

  if (targetUsers.length === 0) {
    adminUserList.innerHTML = '<p style="text-align:center;">目前還沒有任何人註冊 QQ</p>';
    return;
  }

  targetUsers.forEach(user => {
    const isMember = user.role === 'member';
    const roleBadge = isMember ? '<span class="role-badge member">💎 VIP 會員</span>' : '<span class="role-badge guest">👤 有登入的人</span>';
    
    const card = document.createElement('div');
    card.className = 'admin-user-card';
    card.innerHTML = `
      <div class="user-info">
        <h3 style="margin:0; color:#1a5e63;">${user.username}</h3>
        ${roleBadge}
      </div>
      <div class="user-actions">
        ${isMember ? 
          `<button class="action-btn downgrade" onclick="updateUserRole('${user.username}', 'guest', event)"><i class="fas fa-level-down-alt"></i> 降回一般路人</button>` : 
          `<button class="action-btn upgrade" onclick="updateUserRole('${user.username}', 'member', event)"><i class="fas fa-level-up-alt"></i> 升級為 VIP</button>`
        }
      </div>
    `;
    adminUserList.appendChild(card);
  });
}

window.updateUserRole = function(targetUser, newRole, event) {
  const actionText = newRole === 'member' ? '升級為 VIP 會員' : '降級為一般使用者';
  if (!confirm(`確定要將 ${targetUser} ${actionText} 嗎？`)) return;

  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';
  btn.disabled = true;

  fetch(GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'updateRole',
      targetUser: targetUser,
      newRole: newRole,
      operator: currentUser.username,
      token: currentUser.token
    })
  })
  .then(res => res.json())
  .then(result => {
    if (result.status === 'success') {
      alert(`✅ 成功！${targetUser} 現在是 ${newRole === 'member' ? 'VIP 會員' : '一般路人'} 了！`);
      loadAdminUsers();
    } else {
      alert('❌ 操作失敗：' + result.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  })
  .catch(() => {
    alert('網路錯誤');
    btn.innerHTML = originalText;
    btn.disabled = false;
  });
}

// ==========================================================================
// 後台功能二：全站藏品審核、分流、搜尋與跳轉
// ==========================================================================

// 監聽後台二級分類小按鈕
adminSubBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    adminSubBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    adminCurrentType = btn.getAttribute('data-type');
    
    // 更新審核小標題提示文字
    let typeName = adminCurrentType === 'image' ? '🖼 *靜態圖片*' : (adminCurrentType === 'gif' ? '⚡ *動態 GIF*' : '🎬 *短影片*');
    if (adminMemeSubTitle) adminMemeSubTitle.innerHTML = `<i class="fas fa-eye"></i> 當前正在審核：${typeName}`;
    
    renderAdminMemesFilter(); // 切換類型時重新篩選渲染
  });
});

// 監聽後台藏品獨立搜尋框
if (adminMemeSearchInput && adminMemeSearchClearBtn) {
  adminMemeSearchInput.addEventListener('input', () => {
    if (adminMemeSearchInput.value.trim().length > 0) {
      adminMemeSearchClearBtn.classList.add('active');
    } else {
      adminMemeSearchClearBtn.classList.remove('active');
    }
    renderAdminMemesFilter(); // 即時搜尋篩選
  });

  adminMemeSearchClearBtn.addEventListener('click', () => {
    adminMemeSearchInput.value = '';
    adminMemeSearchClearBtn.classList.remove('active');
    adminMemeSearchInput.focus();
    renderAdminMemesFilter();
  });
}

function loadAdminMemes() {
  if (adminMemeCardsContainer) {
    adminMemeCardsContainer.innerHTML = '<p style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> 正在調閱全站藏品牆與貢獻者名冊...</p>';
  }
  
  fetch(GAS_API_URL)
    .then(res => res.json())
    .then(data => {
      adminLoadedMemes = data; // 快取全站原始資料
      renderAdminMemesFilter(); // 渲染篩選後的結果
    })
    .catch(() => {
      if (adminMemeCardsContainer) adminMemeCardsContainer.innerHTML = '<p style="color:red; text-align:center;">調閱清單失敗</p>';
    });
}

// 核心過濾與渲染器
function renderAdminMemesFilter() {
  if (!adminMemeCardsContainer) return;
  adminMemeCardsContainer.innerHTML = '';
  
  const keyword = adminMemeSearchInput ? adminMemeSearchInput.value.toLowerCase().trim() : '';

  // 雙重過濾：1. 必須符合當前分流類型 2. 必須符合搜尋關鍵字 (台詞、標籤、或是上傳者名字)
  const filtered = adminLoadedMemes.filter(meme => {
    const itemType = meme.type || 'image';
    if (itemType !== adminCurrentType) return false;

    if (!keyword) return true;
    const matchQuote = meme.quote && meme.quote.toLowerCase().includes(keyword);
    const matchUploader = meme.uploader && meme.uploader.toLowerCase().includes(keyword);
    const matchTags = meme.tags ? meme.tags.some(tag => tag.toLowerCase().includes(keyword)) : false;
    return matchQuote || matchUploader || matchTags;
  });

  if (filtered.length === 0) {
    adminMemeCardsContainer.innerHTML = '<p style="text-align:center; color:#95a5a6; padding: 20px 0;">在這個分類下找不到符合的藏品 QQ</p>';
    return;
  }

  filtered.forEach(meme => {
    const card = document.createElement('div');
    // 套用我們剛寫的 CSS 類名，增加 hover 效果
    card.className = 'admin-user-card admin-meme-row-card';
    card.style.alignItems = 'center';
    
    const isVideo = meme.type === 'video';
    const previewHTML = isVideo ? 
      `<div style="width:60px; height:60px; background:#000; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff;"><i class="fas fa-video"></i></div>` :
      `<img src="${meme.url}" style="width:60px; height:60px; object-fit:cover; border-radius:8px; border:1px solid #ddd;">`;

    const uploaderName = meme.uploader || "前朝遺老 / 匿名訪客";

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:15px; flex:1; min-width:0;">
        ${previewHTML}
        <div style="flex:1; min-width:0;">
          <h4 style="margin:0; color:var(--text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${meme.quote || "未命名藏品"}</h4>
          <p style="margin:2px 0 0 0; font-size:0.8rem; color:#7f8c8d;"><i class="fas fa-user-edit"></i> 貢獻者：<strong style="color:var(--main-color);">${uploaderName}</strong></p>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="action-btn downgrade" onclick="deleteMemeFromAdmin('${meme.url}', event)" style="background:#e74c3c; padding:8px 12px; margin:0;"><i class="fas fa-trash-alt"></i> 銷毀</button>
      </div>
    `;

    // ==========================================================================
    // ✨ 新增：點擊作品錨點自動跳轉功能
    // ==========================================================================
    card.addEventListener('click', (event) => {
      // 如果點到的是刪除按鈕，不要觸發跳轉
      if (event.target.closest('button')) return;

      if (confirm(`🔍 想要立刻前往前端展覽館查看『${meme.quote || "這件藏品"}』嗎？`)) {
        
        // 1. 關閉側邊欄 (以防大總管是從側邊欄點進來的)
        if (typeof window.closeDrawerFunc === 'function') window.closeDrawerFunc();

        // 2. 找到前端導覽列對應這個類型的按鈕，並模擬點擊切換視圖與大展區分類
        const targetNavBtn = document.querySelector(`.nav-btn[data-target="galleryView"][data-type="${meme.type || 'image'}"]`);
        if (targetNavBtn) {
          targetNavBtn.click();
        } else {
          // 防呆：如果沒抓到精準按鈕，至少切回首頁大視圖
          const galleryView = document.getElementById('galleryView');
          const adminView = document.getElementById('adminView');
          if (galleryView && adminView) {
            adminView.classList.remove('active-view');
            galleryView.classList.add('active-view');
          }
        }

        // 3. 將該圖片的名稱完整塞入前端的「首頁搜尋框」中
        const mainSearchInput = document.getElementById('searchInput');
        const mainSearchClearBtn = document.getElementById('searchClearBtn');
        if (mainSearchInput) {
          mainSearchInput.value = meme.quote || '';
          // 讓前端搜尋框的叉叉也亮起來
          if (mainSearchClearBtn) mainSearchClearBtn.classList.add('active');
          
          // 4. 強制觸發一次前端畫廊重新篩選渲染，精準抓出這張圖！
          // 因為 script.js 的變數沒有完全全域公開，我們可以直接手動觸發 input 事件
          mainSearchInput.dispatchEvent(new Event('input'));
        }

        // 5. 流暢滑動回頂部看結果
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    adminMemeCardsContainer.appendChild(card);
  });
}

// 執行一鍵下架銷毀
window.deleteMemeFromAdmin = function(targetUrl, event) {
  event.stopPropagation(); // 阻止冒泡，防觸發卡片跳轉
  if (!confirm("🚨 警告！確定要對這件藏品執行『終極銷毀』嗎？\n這會將它從 Google Sheets 資料庫中徹底抹除，且無法復原！")) return;

  const btn = event.currentTarget;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
  btn.disabled = true;

  fetch(GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'deleteMeme',
      operator: currentUser.username, 
      token: currentUser.token,
      targetUrl: targetUrl          
    })
  })
  .then(res => res.json())
  .then(result => {
    if (result.status === 'success') {
      alert('🗑️ 銷毀成功！該垃圾圖已化為數位塵埃。');
      loadAdminMemes(); 
      if (typeof window.loadGallery === 'function') window.loadGallery(); 
    } else {
      alert('❌ 銷毀失敗：' + result.message);
      btn.innerHTML = '<i class="fas fa-trash-alt"></i> 銷毀';
      btn.disabled = false;
    }
  })
  .catch(() => {
    alert('網路通訊錯誤');
    btn.disabled = false;
  });
}
