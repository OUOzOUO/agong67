const GAS_API_URL = "https://script.google.com/macros/s/AKfycbx4A80FX5kCIwzpRgf2_tJHo4mijo1lHZ17kNxsEh3BJPCyN_itG6rKssY-OQoh6A8u/exec";
// auth.js - 阿公67網 專屬 VIP 會員與權限防護系統

let currentUser = JSON.parse(localStorage.getItem('67net_user')) || { username: '訪客', role: 'guest' };

// --- DOM 元素獲取 ---
const authModal = document.getElementById('authModal');
const authOverlay = document.getElementById('authOverlay');
const modalTitle = document.getElementById('modalTitle');
const authForm = document.getElementById('authForm');
const usernameInput = document.getElementById('authUsername');
const passwordInput = document.getElementById('authPassword');
const submitAuthBtn = document.getElementById('submitAuthBtn');
const switchAuthMode = document.getElementById('switchAuthMode');
const togglePasswordBtn = document.getElementById('togglePasswordBtn'); 

// 修改密碼專屬 DOM
const changePwdModal = document.getElementById('changePwdModal');
const changePwdForm = document.getElementById('changePwdForm');
const oldPwdInput = document.getElementById('oldPwdInput');
const newPwdInput = document.getElementById('newPwdInput');
const confirmPwdInput = document.getElementById('confirmPwdInput');
const submitChangePwdBtn = document.getElementById('submitChangePwdBtn');
const cancelChangePwdBtn = document.getElementById('cancelChangePwdBtn');

// ✨ 新增：修改密碼視窗的眼睛按鈕 DOM
const toggleOldPasswordBtn = document.getElementById('toggleOldPasswordBtn');
const toggleNewPasswordBtn = document.getElementById('toggleNewPasswordBtn');
const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPasswordBtn');

const userStatusArea = document.getElementById('userStatusArea');
const loginNavBtn = document.getElementById('loginNavBtn');
const logoutNavBtn = document.getElementById('logoutNavBtn');
const adminNavBtn = document.getElementById('adminNavBtn');
const uploadNavBtn = document.querySelector('[data-target="uploadView"]');

let isRegisterMode = false; 

function isGuest() { return currentUser.role === 'guest'; }
function isMember() { return currentUser.role === 'member' || currentUser.role === 'admin'; }
function isAdmin() { return currentUser.role === 'admin'; }

// --- 密碼格式檢查器 (4~20碼英數字) ---
function isValidPassword(pwd) {
  const regex = /^[a-zA-Z0-9]{4,20}$/;
  return regex.test(pwd);
}

function updateAuthUI() {
  if (isGuest()) {
    // 沒登入的匿名訪客
    if (userStatusArea) userStatusArea.innerHTML = `<i class="fas fa-user-secret"></i> 當前身份：<strong>一般路人</strong>`;
    if (loginNavBtn) loginNavBtn.style.display = 'flex';
    if (logoutNavBtn) logoutNavBtn.style.display = 'none';
    if (adminNavBtn) adminNavBtn.style.display = 'none';
    
    if (uploadNavBtn) {
      uploadNavBtn.style.opacity = '0.5';
      uploadNavBtn.style.cursor = 'not-allowed';
      uploadNavBtn.title = '請先登入並獲得權限才能上傳藏品喔！';
    }
  } else {
    // 判斷身份：如果是 admin 就是大總管，如果是 member 就是 VIP，其餘有登入但沒權限的稱為「有登入的人」
    let roleText = '🤓 有登入的人';
    if (currentUser.role === 'admin') {
      roleText = '👑 超級大總管';
    } else if (currentUser.role === 'member') {
      roleText = '💎 VIP 會員';
    }

    // 動態加入「修改密碼」按鈕
    if (userStatusArea) {
      userStatusArea.innerHTML = `
        <i class="fas fa-user-circle"></i> ${currentUser.username} (${roleText})
        <button id="openChangePwdBtn" class="change-pwd-btn"><i class="fas fa-key"></i> 修改密碼</button>
      `;
      // 綁定修改密碼按鈕事件
      document.getElementById('openChangePwdBtn').addEventListener('click', () => {
        if (changePwdModal) changePwdModal.classList.add('active');
        if (authOverlay) authOverlay.classList.add('active');
        if (typeof window.closeDrawerFunc === 'function') window.closeDrawerFunc();
      });
    }

    if (loginNavBtn) loginNavBtn.style.display = 'none';
    if (logoutNavBtn) logoutNavBtn.style.display = 'flex';
    
    // 只有真正的會員或大總管才可以點擊上傳
    if (uploadNavBtn) {
      if (currentUser.role === 'member' || currentUser.role === 'admin') {
        uploadNavBtn.style.opacity = '1';
        uploadNavBtn.style.cursor = 'pointer';
        uploadNavBtn.title = '歡迎貢獻藏品！';
      } else {
        uploadNavBtn.style.opacity = '0.5';
        uploadNavBtn.style.cursor = 'not-allowed';
        uploadNavBtn.title = '您已登入，但需等待管理員審核通過才能上傳喔！';
      }
    }
    
    if (adminNavBtn) {
      adminNavBtn.style.display = isAdmin() ? 'flex' : 'none';
    }
  }
}

function openAuthModal() {
  isRegisterMode = false;
  switchMode(false);
  if (authModal) authModal.classList.add('active');
  if (authOverlay) authOverlay.classList.add('active');
}

window.closeAuthModal = function() {
  if (authModal) authModal.classList.remove('active');
  if (changePwdModal) changePwdModal.classList.remove('active');
  if (authOverlay) authOverlay.classList.remove('active');
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
  // ✨ 重設密碼框的 type 為 password，並把眼睛圖示換回閉眼
  if (passwordInput) passwordInput.type = 'password';
  if (oldPwdInput) oldPwdInput.value = '';
  if (oldPwdInput) oldPwdInput.type = 'password';
  if (newPwdInput) newPwdInput.value = '';
  if (newPwdInput) newPwdInput.type = 'password';
  if (confirmPwdInput) confirmPwdInput.value = '';
  if (confirmPwdInput) confirmPwdInput.type = 'password';

  // 重設所有眼睛圖示
  if (togglePasswordBtn) togglePasswordBtn.classList.replace('fa-eye', 'fa-eye-slash');
  if (toggleOldPasswordBtn) toggleOldPasswordBtn.classList.replace('fa-eye', 'fa-eye-slash');
  if (toggleNewPasswordBtn) toggleNewPasswordBtn.classList.replace('fa-eye', 'fa-eye-slash');
  if (toggleConfirmPasswordBtn) toggleConfirmPasswordBtn.classList.replace('fa-eye', 'fa-eye-slash');
}

function switchMode(toRegister) {
  isRegisterMode = toRegister;
  if (!modalTitle || !submitAuthBtn || !switchAuthMode) return;
  if (isRegisterMode) {
    modalTitle.innerText = '註冊 67 帳號';
    submitAuthBtn.innerText = '建立帳號 (預設為遊客階級)';
    switchAuthMode.innerHTML = '已有帳號？<span class="auth-link">點此登入</span>';
  } else {
    modalTitle.innerText = '登入阿公67網';
    submitAuthBtn.innerText = '安全登入';
    switchAuthMode.innerHTML = '新朋友？<span class="auth-link">點此註冊新帳號</span>';
  }
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return '67_' + Math.abs(hash).toString(16);
}

// 處理登入/註冊
if (authForm) {
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!username || !password) return;

    if (isRegisterMode && !isValidPassword(password)) {
      alert('⚠️ 密碼格式錯誤！請輸入 4~20 碼，且僅能使用英文字母與數字。');
      return;
    }

    if (submitAuthBtn) {
      submitAuthBtn.disabled = true;
      submitAuthBtn.innerText = isRegisterMode ? '帳號建立中...' : '密碼驗證中...';
    }

    const payload = {
      action: isRegisterMode ? 'register' : 'login',
      username: username,
      password: password
    };

    fetch(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(result => {
      if (result.status === 'success') {
        if (isRegisterMode) {
          alert('註冊成功！您目前的身份為「有登入的人」，如欲上傳檔案，請聯絡管理員幫您的帳號升級成 VIP ！');
          switchMode(false); 
        } else {
          alert(`歡迎回來，${username}！`);
          currentUser = { username: username, role: result.role, token: result.token };
          localStorage.setItem('67net_user', JSON.stringify(currentUser));
          updateAuthUI();
          window.closeAuthModal();
          
          const galleryView = document.getElementById('galleryView');
          const uploadView = document.getElementById('uploadView');
          if (galleryView && uploadView) {
            uploadView.classList.remove('active-view');
            galleryView.classList.add('active-view');
          }
          if (typeof window.loadGallery === 'function') window.loadGallery();
        }
      } else {
        alert('驗證失敗：' + result.message);
      }
    })
    .catch(err => {
      alert('後端驗證發生錯誤，請稍後再試。');
    })
    .finally(() => {
      if (submitAuthBtn) {
        submitAuthBtn.disabled = false;
        if (!isRegisterMode) submitAuthBtn.innerText = '安全登入';
      }
    });
  });
}

// 處理修改密碼送出 (優化：修改成功後不需要重新登入)
if (changePwdForm) {
  changePwdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const oldPwd = oldPwdInput.value.trim();
    const newPwd = newPwdInput.value.trim();
    const confirmPwd = confirmPwdInput.value.trim();

    if (!isValidPassword(newPwd)) {
      alert('⚠️ 新密碼格式錯誤！請輸入 4~20 碼，且僅能使用英文字母與數字。');
      return;
    }
    if (newPwd !== confirmPwd) {
      alert('⚠️ 兩次輸入的新密碼不一樣喔！請重新確認。');
      return;
    }

    submitChangePwdBtn.disabled = true;
    submitChangePwdBtn.innerText = '密碼更新中...';

    fetch(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'changePassword',
        username: currentUser.username,
        password: oldPwd,
        newPassword: newPwd,
        token: currentUser.token
      })
    })
    .then(res => res.json())
    .then(result => {
      if (result.status === 'success') {
        // 修改成功！跳出通知並直接關閉視窗，不強制登出
        alert('✅ 密碼修改成功！您可以繼續使用網站。');
        window.closeAuthModal();
      } else {
        alert('❌ ' + result.message);
      }
    })
    .catch(() => alert('網路連線錯誤，請稍後再試。'))
    .finally(() => {
      submitChangePwdBtn.disabled = false;
      submitChangePwdBtn.innerText = '確認修改';
    });
  });

  if (cancelChangePwdBtn) {
    cancelChangePwdBtn.addEventListener('click', window.closeAuthModal);
  }
}

// ✨ 定義一個通用的密碼顯示開關函數
function setupPasswordToggle(inputElement, toggleButtonElement) {
  if (inputElement && toggleButtonElement) {
    toggleButtonElement.addEventListener('click', () => {
      if (inputElement.type === 'password') {
        inputElement.type = 'text';
        toggleButtonElement.classList.replace('fa-eye-slash', 'fa-eye');
      } else {
        inputElement.type = 'password';
        toggleButtonElement.classList.replace('fa-eye', 'fa-eye-slash');
      }
    });
  }
}

// ✨ 綁定登入/註冊視窗的眼睛按鈕
setupPasswordToggle(passwordInput, togglePasswordBtn);

// ✨ 綁定修改密碼視窗的眼睛按鈕
setupPasswordToggle(oldPwdInput, toggleOldPasswordBtn);
setupPasswordToggle(newPwdInput, toggleNewPasswordBtn);
setupPasswordToggle(confirmPwdInput, toggleConfirmPasswordBtn);

if (loginNavBtn) {
  loginNavBtn.addEventListener('click', () => {
    openAuthModal();
    if (typeof window.closeDrawerFunc === 'function') window.closeDrawerFunc(); 
  });
}

if (logoutNavBtn) {
  logoutNavBtn.addEventListener('click', () => {
    if (confirm('確定要登出嗎？登出後就不能上傳酷東西了喔！')) {
      currentUser = { username: '訪客', role: 'guest' };
      localStorage.removeItem('67net_user');
      updateAuthUI();
      if (typeof window.closeDrawerFunc === 'function') window.closeDrawerFunc();
      document.querySelector('[data-target="galleryView"]')?.click();
      alert('已安全登出。');
    }
  });
}

if (switchAuthMode) switchAuthMode.addEventListener('click', () => switchMode(!isRegisterMode));
if (authOverlay) authOverlay.addEventListener('click', window.closeAuthModal);

if (uploadNavBtn) {
  uploadNavBtn.addEventListener('click', (e) => {
    if (isGuest()) {
      e.stopImmediatePropagation(); 
      alert('🛑 嗶嗶！您目前尚未登入！\n請先登入並等待管理員審核。');
      openAuthModal(); 
      if (typeof window.closeDrawerFunc === 'function') window.closeDrawerFunc();
    } else if (currentUser.role !== 'member' && currentUser.role !== 'admin') {
      // 如果有登入，但只是「有登入的人」，也予以攔截
      e.stopImmediatePropagation();
      alert('🛑 嗶嗶！您目前的身份是「有登入的人」，尚未獲得 VIP 上傳權限！\n請聯絡大總管幫您在後台放行喔！');
      if (typeof window.closeDrawerFunc === 'function') window.closeDrawerFunc();
    }
  });
}

updateAuthUI();
