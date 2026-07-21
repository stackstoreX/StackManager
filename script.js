
// ===================== ACTIVATION SYSTEM CONSTANTS =====================
const ACTIVATION_CODES_KEY = 'sub_activation_codes';
const TRIAL_START_KEY = 'sub_trial_start';
const ACTIVATED_KEY = 'sub_activated';
const ADMIN_DEVICES_KEY = 'sub_admin_devices';
const ALL_DEVICES_KEY = 'sub_all_devices';  // All devices that visited the site
const IS_ADMIN_KEY = 'sub_is_admin';
const ADMIN_SECRET_CODE_KEY = 'sub_admin_secret';
const DEVICE_ID_KEY = 'sub_device_id';

const TRIAL_HOURS = 24;
const MAX_ADMIN_DEVICES = 2;
const PRICE_EGP = 299;
const CODE_LENGTH = 6;

let countdownInterval = null;
let isAdminLoggedIn = false;

// ===================== DEVICE ID =====================
function getDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}

// ===================== ADMIN SECRET CODE =====================
function saveAdminSecretCode(code) {
    if (!code || code.length !== CODE_LENGTH) {
        showNotification('⚠️ الكود لازم يكون 6 أحرف/أرقام', 'warning');
        return false;
    }
    localStorage.setItem(ADMIN_SECRET_CODE_KEY, code.toUpperCase());
    showNotification('✅ تم حفظ كود الأدمن بنجاح!', 'success');
    playSound('success');
    return true;
}

function getAdminSecretCode() {
    return localStorage.getItem(ADMIN_SECRET_CODE_KEY) || 'STACK9';
}

function saveAdminSecretCodeFromSettings() {
    const input = document.getElementById('adminSecretCodeInput');
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (saveAdminSecretCode(code)) {
        input.value = '';
    }
}

function toggleAdminCodeVisibility() {
    const input = document.getElementById('adminSecretCodeInput');
    const eye = document.getElementById('adminCodeEye');
    if (!input || !eye) return;

    if (input.type === 'password') {
        input.type = 'text';
        eye.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        eye.className = 'fas fa-eye';
    }
}

// ===================== TRIAL MANAGEMENT =====================
function getTrialStart() {
    let start = localStorage.getItem(TRIAL_START_KEY);
    if (!start) {
        start = Date.now().toString();
        localStorage.setItem(TRIAL_START_KEY, start);
        console.log('🆕 Trial started at:', new Date(parseInt(start)).toLocaleString());
    }
    return parseInt(start);
}

function getTrialTimeLeft() {
    const start = getTrialStart();
    const now = Date.now();
    const trialEnd = start + (TRIAL_HOURS * 60 * 60 * 1000);
    const totalMs = trialEnd - now;

    if (totalMs <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true };
    }

    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, totalMs, expired: false };
}

function isActivated() {
    return localStorage.getItem(ACTIVATED_KEY) === 'true';
}

function isAdmin() {
    return localStorage.getItem(IS_ADMIN_KEY) === 'true';
}

function checkTrialStatus() {
    // Admin always has access
    if (isAdmin()) return true;
    // Activated users always have access
    if (isActivated()) return true;
    // Trial users: check if time remains
    const timeLeft = getTrialTimeLeft();
    if (!timeLeft.expired) return true;
    // Trial expired and not activated → lock
    return false;
}

// ===================== COUNTDOWN =====================
function startTrialCountdown() {
    updateLockScreenCountdown();

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        updateLockScreenCountdown();
    }, 1000);
}

function updateLockScreenCountdown() {
    const timeLeft = getTrialTimeLeft();
    const countdownEl = document.getElementById('trialCountdown');

    if (!countdownEl) return;

    if (timeLeft.expired) {
        countdownEl.innerHTML = '<span style="color: var(--danger);">00:00:00</span>';
        countdownEl.className = 'trial-countdown red';
        return;
    }

    const h = String(timeLeft.hours).padStart(2, '0');
    const m = String(timeLeft.minutes).padStart(2, '0');
    const s = String(timeLeft.seconds).padStart(2, '0');

    countdownEl.innerHTML = `${h}:${m}:${s}`;

    // Update color based on time left
    countdownEl.classList.remove('green', 'yellow', 'red');
    if (timeLeft.hours > 6) {
        countdownEl.classList.add('green');
    } else if (timeLeft.hours >= 1) {
        countdownEl.classList.add('yellow');
    } else {
        countdownEl.classList.add('red');
    }
}

// ===================== LOCK SCREEN =====================

// ===================== TRIAL WIDGET (Dashboard) =====================
function updateTrialWidget() {
    const widget = document.getElementById('trialWidget');
    const timerEl = document.getElementById('trialWidgetTimer');
    const statusEl = document.getElementById('trialWidgetStatus');
    const labelEl = document.getElementById('trialWidgetLabel');

    if (!widget || !timerEl || !statusEl) return;

    // Case 1: Admin - show admin badge, NO countdown
    if (isAdmin()) {
        widget.style.display = 'flex';
        if (labelEl) labelEl.textContent = 'حساب الأدمن';
        timerEl.textContent = '👑 أدمن';
        statusEl.textContent = 'مفعل';
        statusEl.className = 'trial-widget-status admin';
        widget.classList.remove('green', 'yellow', 'red');
        // Stop interval if running
        if (window.trialWidgetInterval) {
            clearInterval(window.trialWidgetInterval);
            window.trialWidgetInterval = null;
        }
        return;
    }

    // Case 2: Activated with code - show activated, NO countdown, hide widget
    if (isActivated()) {
        widget.style.display = 'none'; // HIDE completely for activated users
        if (window.trialWidgetInterval) {
            clearInterval(window.trialWidgetInterval);
            window.trialWidgetInterval = null;
        }
        return;
    }

    // Case 3: Trial active - show countdown
    const timeLeft = getTrialTimeLeft();

    if (timeLeft.expired) {
        widget.style.display = 'none';
        if (window.trialWidgetInterval) {
            clearInterval(window.trialWidgetInterval);
            window.trialWidgetInterval = null;
        }
        return;
    }

    widget.style.display = 'flex';
    if (labelEl) labelEl.textContent = 'الوقت المتبقي';
    statusEl.textContent = 'تجريبي';
    statusEl.className = 'trial-widget-status';

    const h = String(timeLeft.hours).padStart(2, '0');
    const m = String(timeLeft.minutes).padStart(2, '0');
    const s = String(timeLeft.seconds).padStart(2, '0');
    timerEl.textContent = `${h}:${m}:${s}`;

    // Color states
    widget.classList.remove('green', 'yellow', 'red');
    if (timeLeft.hours > 6) {
        widget.classList.add('green');
    } else if (timeLeft.hours >= 1) {
        widget.classList.add('yellow');
    } else {
        widget.classList.add('red');
    }
}

function startTrialWidget() {
    // Clear any existing interval first
    if (window.trialWidgetInterval) {
        clearInterval(window.trialWidgetInterval);
        window.trialWidgetInterval = null;
    }

    updateTrialWidget();

    // Only start interval for trial users (not admin, not activated)
    if (!isActivated() && !isAdmin() && !getTrialTimeLeft().expired) {
        window.trialWidgetInterval = setInterval(updateTrialWidget, 1000);
    }
}


function showLockScreen() {
    const lockScreen = document.getElementById('trialLockScreen');
    const mainContent = document.getElementById('mainContent');
    const sidebar = document.getElementById('mainSidebar');

    if (lockScreen) {
        lockScreen.style.display = 'flex';
        startTrialCountdown();
        initCodeInputs();

        // Update lock screen message based on status
        const timeLeft = getTrialTimeLeft();
        const titleEl = lockScreen.querySelector('.trial-lock-title');
        const textEl = lockScreen.querySelector('.trial-lock-text');

        if (timeLeft.expired) {
            // Trial fully expired
            if (titleEl) titleEl.textContent = 'انتهت الفترة التجريبية!';
            if (textEl) {
                textEl.innerHTML = 'لقد انتهت الفترة التجريبية المجانية (24 ساعة)<br>تواصل معنا على واتساب لتفعيل اشتراكك بـ 299 ج.م';
            }
        } else {
            // Still in trial but somehow on lock screen (shouldn't happen normally)
            if (titleEl) titleEl.textContent = 'الفترة التجريبية';
            if (textEl) {
                textEl.innerHTML = 'لديك فترة تجريبية 24 ساعة<br>استمتع باستخدام النظام';
            }
        }
    }

    if (mainContent) mainContent.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';

    // Hide mobile menu toggle
    const mobileToggle = document.getElementById('mobileMenuToggle');
    if (mobileToggle) mobileToggle.style.display = 'none';
}

function hideLockScreen() {
    const lockScreen = document.getElementById('trialLockScreen');
    const mainContent = document.getElementById('mainContent');
    const sidebar = document.getElementById('mainSidebar');

    if (lockScreen) lockScreen.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (sidebar) sidebar.style.display = 'block';

    // Show mobile menu toggle
    const mobileToggle = document.getElementById('mobileMenuToggle');
    if (mobileToggle) mobileToggle.style.display = 'flex';

    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

// ===================== CODE INPUTS =====================
function initCodeInputs() {
    const inputs = document.querySelectorAll('.code-digit:not(.admin-login-digit)');

    inputs.forEach((input, index) => {
        // Remove old listeners to avoid duplicates
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
    });

    const freshInputs = document.querySelectorAll('.code-digit:not(.admin-login-digit)');

    freshInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.length === 1) {
                e.target.classList.add('filled');
                if (index < freshInputs.length - 1) {
                    freshInputs[index + 1].focus();
                }
            } else if (val.length === 0) {
                e.target.classList.remove('filled');
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                freshInputs[index - 1].focus();
                freshInputs[index - 1].classList.remove('filled');
            }
            if (e.key === 'Enter') {
                activateWithCode();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').trim().toUpperCase();
            if (pasteData.length === CODE_LENGTH) {
                freshInputs.forEach((inp, i) => {
                    inp.value = pasteData[i] || '';
                    if (pasteData[i]) inp.classList.add('filled');
                });
                freshInputs[freshInputs.length - 1].focus();
            }
        });
    });
}

function getEnteredCode() {
    const inputs = document.querySelectorAll('.code-digit:not(.admin-login-digit)');
    let code = '';
    inputs.forEach(input => {
        code += input.value.toUpperCase();
    });
    return code;
}

function clearCodeInputs() {
    const inputs = document.querySelectorAll('.code-digit:not(.admin-login-digit)');
    inputs.forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });
}

// ===================== ACTIVATION =====================
function generateActivationCode() {
    // Pattern: 2 letters + 4 numbers (e.g., AB1234)
    // This creates a verifiable format without needing cross-browser storage
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    let code = '';

    // 2 random letters
    code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += letters.charAt(Math.floor(Math.random() * letters.length));

    // 4 random numbers
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));

    return code;
}

function isValidActivationCode(code) {
    // Validate pattern: 2 uppercase letters + 4 numbers
    const pattern = /^[A-Z]{2}[2-9]{4}$/;
    return pattern.test(code);
}

function saveActivationCode(code) {
    let codes = JSON.parse(localStorage.getItem(ACTIVATION_CODES_KEY) || '[]');
    if (!codes.includes(code)) {
        codes.push(code);
        localStorage.setItem(ACTIVATION_CODES_KEY, JSON.stringify(codes));
    }
    return code;
}

function getActivationCodes() {
    return JSON.parse(localStorage.getItem(ACTIVATION_CODES_KEY) || '[]');
}

function removeActivationCode(code) {
    let codes = getActivationCodes();
    codes = codes.filter(c => c !== code);
    localStorage.setItem(ACTIVATION_CODES_KEY, JSON.stringify(codes));
}

function activateWithCode() {
    const code = getEnteredCode();
    const errorEl = document.getElementById('activationError');

    if (code.length !== CODE_LENGTH) {
        if (errorEl) {
            errorEl.textContent = '⚠️ أكمل الـ 6 خانات';
            errorEl.style.display = 'block';
        }
        return;
    }

    // Validate code pattern: 2 letters + 4 numbers
    if (!isValidActivationCode(code)) {
        if (errorEl) {
            errorEl.textContent = '⚠️ الكود غير صالح. الصيغة: حرفين + 4 أرقام (مثال: AB1234)';
            errorEl.style.display = 'block';
        }
        playSound('alert');
        shakeCodeInputs();
        return;
    }

    // Activate the device
    localStorage.setItem(ACTIVATED_KEY, 'true');

    // Update device status in all devices list
    updateDeviceActivationStatus();

    if (errorEl) errorEl.style.display = 'none';
    clearCodeInputs();

    showNotification('✅ تم التفعيل بنجاح! مرحباً بيك في Stack Manager', 'success');
    playSound('success');

    hideLockScreen();
    renderAll();
}

function shakeCodeInputs() {
    const inputs = document.querySelectorAll('.code-digit:not(.admin-login-digit)');
    inputs.forEach(input => {
        input.style.borderColor = 'var(--danger)';
        setTimeout(() => {
            input.style.borderColor = '';
        }, 1000);
    });
}

function updateDeviceActivationStatus() {
    let devices = getAllDevices();
    const deviceId = getDeviceId();
    const device = devices.find(d => d.id === deviceId);
    if (device) {
        device.activated = true;
        localStorage.setItem(ALL_DEVICES_KEY, JSON.stringify(devices));
    }
}

// ===================== ADMIN LOGIN =====================
function showAdminLogin() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');

        // Init admin login digits
        const inputs = document.querySelectorAll('.admin-login-digit');
        inputs.forEach((input, index) => {
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
        });

        const freshInputs = document.querySelectorAll('.admin-login-digit');
        freshInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value;
                if (val.length === 1) {
                    e.target.classList.add('filled');
                    if (index < freshInputs.length - 1) {
                        freshInputs[index + 1].focus();
                    }
                } else if (val.length === 0) {
                    e.target.classList.remove('filled');
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    freshInputs[index - 1].focus();
                    freshInputs[index - 1].classList.remove('filled');
                }
                if (e.key === 'Enter') {
                    verifyAdminLogin();
                }
            });
        });

        setTimeout(() => freshInputs[0]?.focus(), 100);
    }
}

function closeAdminLogin() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    const errorEl = document.getElementById('adminLoginError');
    if (errorEl) errorEl.style.display = 'none';

    // Clear inputs
    const inputs = document.querySelectorAll('.admin-login-digit');
    inputs.forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });
}

function getAdminLoginCode() {
    const inputs = document.querySelectorAll('.admin-login-digit');
    let code = '';
    inputs.forEach(input => {
        code += input.value.toUpperCase();
    });
    return code;
}

function verifyAdminLogin() {
    const code = getAdminLoginCode();
    const errorEl = document.getElementById('adminLoginError');
    const secretCode = getAdminSecretCode();

    if (code === secretCode) {
        // Successful admin login
        isAdminLoggedIn = true;
        localStorage.setItem(IS_ADMIN_KEY, 'true');

        // Register device
        registerAdminDevice();

        if (errorEl) errorEl.style.display = 'none';
        closeAdminLogin();

        // If coming from lock screen, hide it
        if (!checkTrialStatus()) {
            hideLockScreen();
        }

        showAdminPanel();
        showNotification('👑 تم تسجيل دخول الأدمن بنجاح!', 'success');
        playSound('success');
    } else {
        if (errorEl) {
            errorEl.textContent = '⚠️ كود الأدمن غير صحيح';
            errorEl.style.display = 'block';
        }
        playSound('alert');
    }
}

// ===================== DEVICE REGISTRATION =====================
function registerDevice() {
    let devices = JSON.parse(localStorage.getItem(ALL_DEVICES_KEY) || '[]');
    const deviceId = getDeviceId();
    const now = new Date().toLocaleDateString('ar-EG');
    const currentTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // Check if device already registered
    const existingIndex = devices.findIndex(d => d.id === deviceId);
    if (existingIndex !== -1) {
        // Update last visit time
        devices[existingIndex].lastVisit = now + ' ' + currentTime;
        devices[existingIndex].visitCount = (devices[existingIndex].visitCount || 1) + 1;
    } else {
        const deviceName = getDeviceName();
        const isAdminDevice = isAdmin();
        devices.push({
            id: deviceId,
            name: deviceName,
            date: now,
            time: currentTime,
            lastVisit: now + ' ' + currentTime,
            visitCount: 1,
            isAdmin: isAdminDevice,
            activated: isActivated()
        });
    }

    localStorage.setItem(ALL_DEVICES_KEY, JSON.stringify(devices));
}

// Keep old function for backward compatibility
function registerAdminDevice() {
    registerDevice(); // Now registers ALL devices

    // Also keep admin devices list for the 2-device limit
    let adminDevices = JSON.parse(localStorage.getItem(ADMIN_DEVICES_KEY) || '[]');
    const deviceId = getDeviceId();
    const now = new Date().toLocaleDateString('ar-EG');

    if (!adminDevices.find(d => d.id === deviceId)) {
        if (adminDevices.length >= MAX_ADMIN_DEVICES) {
            adminDevices.shift();
        }
        adminDevices.push({
            id: deviceId,
            name: getDeviceName(),
            date: now
        });
        localStorage.setItem(ADMIN_DEVICES_KEY, JSON.stringify(adminDevices));
    }
}

function getDeviceName() {
    const ua = navigator.userAgent;
    if (/Android/.test(ua)) return '📱 Android';
    if (/iPhone|iPad|iPod/.test(ua)) return '🍎 iPhone/iPad';
    if (/Windows/.test(ua)) return '💻 Windows';
    if (/Mac/.test(ua)) return '🖥️ Mac';
    if (/Linux/.test(ua)) return '🐧 Linux';
    return '🌐 متصفح';
}

function getAllDevices() {
    return JSON.parse(localStorage.getItem(ALL_DEVICES_KEY) || '[]');
}

function getAdminDevices() {
    return JSON.parse(localStorage.getItem(ADMIN_DEVICES_KEY) || '[]');
}

function deleteDevice(deviceId) {
    if (!confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return;

    let devices = getAllDevices();
    devices = devices.filter(d => d.id !== deviceId);
    localStorage.setItem(ALL_DEVICES_KEY, JSON.stringify(devices));

    // Also remove from admin devices if exists
    let adminDevices = getAdminDevices();
    adminDevices = adminDevices.filter(d => d.id !== deviceId);
    localStorage.setItem(ADMIN_DEVICES_KEY, JSON.stringify(adminDevices));

    renderAdminDevices();
    showNotification('🗑️ تم حذف الجهاز', 'success');
    playSound('success');
}

// ===================== ADMIN PANEL =====================
function showAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        renderAdminDevices();
    }
}

function closeAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }

    // Hide generated code
    const codeBox = document.getElementById('generatedCodeBox');
    if (codeBox) codeBox.style.display = 'none';
}

function generateAndShowCode() {
    const code = generateActivationCode();

    // Store in a simple list for this session (not for cross-browser validation)
    // This is just for the admin to see what codes they've generated recently
    let recentCodes = JSON.parse(sessionStorage.getItem('sub_recent_codes') || '[]');
    recentCodes.unshift({ code: code, created: new Date().toLocaleString('ar-EG') });
    if (recentCodes.length > 10) recentCodes.pop(); // Keep last 10
    sessionStorage.setItem('sub_recent_codes', JSON.stringify(recentCodes));

    const codeBox = document.getElementById('generatedCodeBox');
    const codeValue = document.getElementById('generatedCodeValue');

    if (codeValue) codeValue.textContent = code;
    if (codeBox) {
        codeBox.style.display = 'block';
        codeBox.style.animation = 'none';
        codeBox.offsetHeight; // Trigger reflow
        codeBox.style.animation = 'fadeIn 0.4s ease';
    }

    showNotification('✅ تم توليد كود جديد: ' + code, 'success');
    playSound('success');
}

function copyGeneratedCode() {
    const codeValue = document.getElementById('generatedCodeValue');
    if (!codeValue) return;

    const code = codeValue.textContent;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
            showNotification('📋 تم نسخ الكود!', 'success');
        });
    } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('📋 تم نسخ الكود!', 'success');
    }
}

function renderAdminDevices() {
    const container = document.getElementById('adminDevicesList');
    if (!container) return;

    const devices = getAllDevices();

    if (devices.length === 0) {
        container.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">لا توجد أجهزة مسجلة</p>';
        return;
    }

    container.innerHTML = devices.map(d => {
        const statusBadge = d.isAdmin 
            ? '<span class="device-badge admin">👑 أدمن</span>' 
            : d.activated 
                ? '<span class="device-badge activated">✅ مفعل</span>'
                : '<span class="device-badge trial">⏳ تجريبي</span>';

        const visitInfo = d.visitCount > 1 
            ? `<span style="color: var(--gray); font-size: 11px;">(${d.visitCount} زيارة)</span>` 
            : '';

        return `
        <div class="admin-device-item">
            <div class="admin-device-icon">${d.name.split(' ')[0]}</div>
            <div class="admin-device-info">
                <div class="admin-device-name">
                    ${d.name}
                    ${statusBadge}
                </div>
                <div class="admin-device-date">
                    <i class="far fa-clock" style="font-size: 10px;"></i> ${d.lastVisit || d.date + ' ' + d.time}
                    ${visitInfo}
                </div>
            </div>
            <button class="device-delete-btn" onclick="deleteDevice('${d.id}')" title="حذف الجهاز">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `}).join('');
}

function clearAllActivations() {
    if (!confirm('⚠️ هل أنت متأكد؟ هيتمسح كل التفعيلات والأكواد!')) return;

    localStorage.removeItem(ACTIVATED_KEY);
    localStorage.removeItem(ACTIVATION_CODES_KEY);
    localStorage.removeItem(IS_ADMIN_KEY);
    localStorage.removeItem(ADMIN_DEVICES_KEY);
    localStorage.removeItem(TRIAL_START_KEY);

    isAdminLoggedIn = false;

    showNotification('🗑️ تم مسح كل التفعيلات', 'success');
    closeAdminPanel();

    // Restart trial
    setTimeout(() => {
        location.reload();
    }, 1500);
}

// ===================== SETTINGS CODE GENERATION =====================
function handleGenerateCodeClick() {
    if (isAdminLoggedIn || isAdmin()) {
        // Already admin, show panel directly
        showAdminPanel();
    } else {
        // Need to login first
        showAdminLogin();
    }
}

// ===================== INIT ACTIVATION SYSTEM =====================
function initActivationSystem() {
    console.log('🔐 Initializing activation system...');

    // Check if admin is logged in
    if (localStorage.getItem(IS_ADMIN_KEY) === 'true') {
        isAdminLoggedIn = true;
    }

    // Register this device (ALL visitors get registered)
    registerDevice();

    const timeLeft = getTrialTimeLeft();

    // Case 1: Admin → always open, show admin badge
    if (isAdmin()) {
        console.log('👑 Admin detected - full access');
        hideLockScreen();
        startTrialWidget();
        return;
    }

    // Case 2: Activated with code → always open, hide widget
    if (isActivated()) {
        console.log('✅ User activated - full access');
        hideLockScreen();
        startTrialWidget();
        return;
    }

    // Case 3: Trial active → open with countdown
    if (!timeLeft.expired) {
        console.log('⏳ Trial active - ' + timeLeft.hours + 'h ' + timeLeft.minutes + 'm remaining');
        hideLockScreen();
        startTrialCountdown();
        startTrialWidget();
        return;
    }

    // Case 4: Trial expired → show lock screen
    console.log('🔒 Trial expired - showing lock screen');
    showLockScreen();
}

// ===================== OVERRIDE showSection TO CHECK ACTIVATION =====================
const originalShowSection = showSection;
showSection = function(sectionId) {
    // Admin always has access
    if (isAdmin()) {
        originalShowSection(sectionId);
        return;
    }
    // Activated users always have access
    if (isActivated()) {
        originalShowSection(sectionId);
        return;
    }
    // Trial users: check if still valid
    if (!checkTrialStatus()) {
        showLockScreen();
        return;
    }
    originalShowSection(sectionId);
};

// ===================== OVERRIDE openSettingsModal TO CHECK ACTIVATION =====================
const originalOpenSettingsModal = openSettingsModal;
openSettingsModal = function() {
    // Admin always has access
    if (isAdmin()) {
        originalOpenSettingsModal();
        return;
    }
    // Activated users always have access
    if (isActivated()) {
        originalOpenSettingsModal();
        return;
    }
    // Trial users: check if still valid
    if (!checkTrialStatus()) {
        showLockScreen();
        return;
    }
    originalOpenSettingsModal();
};


// ===================== DATA STORE =====================
// ✅ دالة مساعدة لتحميل البيانات بأمان
function loadData() {
    try {
        const c = localStorage.getItem('sub_customers');
        const s = localStorage.getItem('sub_services');
        const e = localStorage.getItem('sub_expenses');
        
        window.customers = c ? JSON.parse(c) : [];
        window.services = s ? JSON.parse(s) : [];
        window.expenses = e ? JSON.parse(e) : [];
    } catch (err) {
        console.error('❌ خطأ في تحميل البيانات:', err);
        window.customers = [];
        window.services = [];
        window.expenses = [];
    }
}

// حمل البيانات فوراً
loadData(); // ← حمل هنا فوراً

let soundEnabled = localStorage.getItem('sub_sound') !== 'false';
let currentStartDate = new Date();
let currentEndDate = new Date();
let selectedStartDate = null;
let selectedEndDate = null;
let calendarOpen = { start: false, end: false };

// ===================== PUSH NOTIFICATION CONFIG =====================
let pushEnabled = localStorage.getItem('sub_push_enabled') === 'true';

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', function() {
    updateServicesSelect();
    checkServicesEmpty();
    renderAll();
    initCalendars();
    initExpenseCalendar();
    initPushNotifications();
    
    setTimeout(() => checkExpiringSubscriptions(), 2000);
    setInterval(() => checkExpiringSubscriptions(), 60000);
    
    scheduleDailyCheck();
    
    updateSoundIcon();
    updatePushIcon();
});

function checkServicesEmpty() {
    const msg = document.getElementById('noServicesMsg');
    if (!msg) return;
    
    if (services.length === 0) {
        msg.style.display = 'block';
    } else {
        msg.style.display = 'none';
    }
}
// ===================== PUSH NOTIFICATIONS =====================
function initPushNotifications() {
    if (!('Notification' in window)) {
        console.log('⚠️ المتصفح لا يدعم الإشعارات');
        return;
    }
    autoEnablePush();
}

// دالة جديدة: تفعيل تلقائي للإشعارات
async function autoEnablePush() {
    // لو مفعلة قبل كده، حدث الايقونة بس
    if (Notification.permission === 'granted') {
        pushEnabled = true;
        localStorage.setItem('sub_push_enabled', 'true');
        updatePushIcon();
        return;
    }

    // لو مرفوضة قبل كده، متسألش تاني (احترام للمستخدم)
    if (Notification.permission === 'denied') {
        console.log('🔕 الإشعارات مرفوضة من قبل');
        updatePushIcon();
        return;
    }

    // لو لسه ما اتسألناش (default)، نطلب الإذن بعد أول تفاعل
    if (Notification.permission === 'default') {
        console.log('🔔 الإشعارات لسه ما اتسألناش - هنستنى المستخدم يضغط الجرس');
        updatePushIcon();
    }
}

async function requestPushPermission() {
    console.log('🔔 requestPushPermission اتنادت');
    
    if (!('Notification' in window)) {
        showNotification('⚠️ متصفحك لا يدعم الإشعارات', 'warning');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        console.log('📋 نتيجة الإذن:', permission);
        
        if (permission === 'granted') {
            pushEnabled = true;
            localStorage.setItem('sub_push_enabled', 'true');
            updatePushIcon();
            showNotification('✅ تم تفعيل الإشعارات بنجاح!', 'success');
            playSound('success');
            
            // إشعار ترحيبي
            setTimeout(() => {
                sendLocalNotification(
                    '🔔 الإشعارات مفعلة!',
                    'هتجيلك تنبيهات لما يجي معاد تجديد أي اشتراك.'
                );
            }, 1000);
            
            return true;
        } else {
            pushEnabled = false;
            localStorage.setItem('sub_push_enabled', 'false');
            updatePushIcon();
            showNotification('⚠️ تم رفض الإشعارات', 'warning');
            return false;
        }
    } catch (err) {
        console.error('❌ خطأ في طلب الإذن:', err);
        showNotification('⚠️ حصل خطأ في طلب الإذن', 'warning');
        return false;
    }
}

function togglePushNotifications() {
    console.log('🔔 togglePushNotifications اتنادت');
    
    if (!('Notification' in window)) {
        showNotification('⚠️ متصفحك لا يدعم الإشعارات', 'warning');
        return;
    }

    // لو الإشعارات مفعلة، إيقافها
    if (pushEnabled && Notification.permission === 'granted') {
        pushEnabled = false;
        localStorage.setItem('sub_push_enabled', 'false');
        updatePushIcon();
        showNotification('🔕 تم إيقاف الإشعارات', 'success');
        return;
    }

    // لو مش مفعلة، فعلها (اطلب الإذن)
    requestPushPermission();
}

function updatePushIcon() {
    const btn = document.getElementById('pushToggle');
    const icon = document.getElementById('pushIcon');
    
    if (!btn || !icon) {
        console.log('❌ pushToggle أو pushIcon مش موجودين في DOM');
        return;
    }
    
    console.log('🎨 updatePushIcon:', 'pushEnabled=' + pushEnabled, 'permission=' + Notification.permission);
    
    if (pushEnabled && Notification.permission === 'granted') {
        icon.className = 'fas fa-bell';
        btn.classList.remove('muted');
        btn.title = 'الإشعارات مفعلة - اضغط لإيقافها';
        btn.style.background = 'linear-gradient(135deg, var(--success), #059669)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--success)';
    } else {
        icon.className = 'fas fa-bell-slash';
        btn.classList.add('muted');
        btn.title = 'تفعيل الإشعارات';
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    }
}

function sendLocalNotification(title, body, options = {}) {
    console.log('📨 sendLocalNotification:', title);
    
    if (!pushEnabled || Notification.permission !== 'granted') {
        console.log('🔕 الإشعارات غير مفعلة - مش هنبعت');
        return;
    }

    const defaultOptions = {
        body: body,
        tag: options.tag || 'subscription-alert',
        requireInteraction: true,
        dir: 'rtl',
        lang: 'ar',
        vibrate: [200, 100, 200],
        ...options
    };

    try {
        new Notification(title, defaultOptions);
        console.log('✅ إشعار اتبعت');
    } catch (err) {
        console.error('❌ فشل إرسال الإشعار:', err);
    }
}

function testPushNotificationNow() {
    console.log('🧪 testPushNotificationNow اتنادت');
    
    // Test the new notification system with a sample
    showNotification(
        '🔔 ده إشعار تجريبي! اضغط ✅ أو اسحب للمسح',
        'success',
        { id: 'test_' + Date.now() }
    );
    
    // Also send a second one to test stacking
    setTimeout(() => {
        showNotification(
            '⏰ تنبيه: اشتراك أحمد ينتهي غداً! (تجريبي)',
            'warning',
            { id: 'test_expiring_' + Date.now(), repeat: true, customerId: 0 }
        );
    }, 500);
    
    playSound('success');
}

function scheduleDailyCheck() {
    const now = new Date();
    const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
    
    if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const msUntilTarget = targetTime - now;
    
    setTimeout(() => {
        checkExpiringSubscriptions();
        setInterval(() => checkExpiringSubscriptions(), 24 * 60 * 60 * 1000);
    }, msUntilTarget);
}

// ===================== NAVIGATION =====================
function showSection(sectionId) {
    // ✅ أقفل الموبايل مينو
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    
    // ✅ أخفي كل الأقسام
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // ✅ أظهر القسم المطلوب
    const targetSection = document.getElementById(sectionId + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // ✅ فعل الـ nav-item المناسب
    document.querySelectorAll('.nav-item').forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes("'" + sectionId + "'")) {
            item.classList.add('active');
        }
    });
    
    // ✅ حدث البيانات حسب القسم
    if (sectionId === 'dashboard') renderDashboard();
    if (sectionId === 'customers') renderCustomers();
    if (sectionId === 'services') {
        console.log('🔄 تحديث قسم الخدمات...');
        renderServices(); // ← حدث فوراً
    }
    if (sectionId === 'expiring') renderExpiring();
    if (sectionId === 'finance') renderFinance();
    
    // ✅ حدث العدادات
    updateBadges();
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

// ===================== CALENDAR =====================
function initCalendars() {
    renderCalendar('start', currentStartDate);
    renderCalendar('end', currentEndDate);
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.date-picker-container')) {
            closeAllCalendars();
        }
    });
}

function renderCalendar(type, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const monthNames = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    document.getElementById(type + 'CalendarTitle').textContent = monthNames[month] + ' ' + year;
    
    const grid = document.getElementById(type + 'CalendarGrid');
    grid.innerHTML = '';
    
    // ✅ عرض أيام الأسبوع
    const dayHeaders = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    dayHeaders.forEach(d => {
        const el = document.createElement('div');
        el.className = 'calendar-day-header';
        el.textContent = d;
        grid.appendChild(el);
    });
    
    // ✅ أيام الشهر السابق (فاضية)
    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day other-month';
        el.textContent = daysInPrevMonth - firstDay + i + 1;
        grid.appendChild(el);
    }
    
    // ✅ أيام الشهر الحالي
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day';
        el.textContent = i;
        
        const thisDate = new Date(year, month, i);
        
        if (thisDate.toDateString() === today.toDateString()) {
            el.classList.add('today');
        }
        
        const selected = type === 'start' ? selectedStartDate : selectedEndDate;
        if (selected && thisDate.toDateString() === selected.toDateString()) {
            el.classList.add('selected');
        }
        
        el.onclick = () => selectDate(type, thisDate);
        grid.appendChild(el);
    }
    
    // ✅ أيام الشهر الجاي (فاضية)
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day other-month';
        el.textContent = i;
        grid.appendChild(el);
    }
}

function changeMonth(type, delta) {
    if (type === 'start') {
        currentStartDate.setMonth(currentStartDate.getMonth() + delta);
        renderCalendar('start', currentStartDate);
    } else {
        currentEndDate.setMonth(currentEndDate.getMonth() + delta);
        renderCalendar('end', currentEndDate);
    }
}

function toggleCalendar(type) {
    const other = type === 'start' ? 'end' : 'start';
    document.getElementById(other + 'Calendar').classList.remove('show');
    calendarOpen[other] = false;
    
    const cal = document.getElementById(type + 'Calendar');
    calendarOpen[type] = !calendarOpen[type];
    cal.classList.toggle('show', calendarOpen[type]);
}

function closeAllCalendars() {
    document.getElementById('startCalendar').classList.remove('show');
    document.getElementById('endCalendar').classList.remove('show');
    calendarOpen.start = false;
    calendarOpen.end = false;
}

function selectDate(type, date) {
    if (type === 'start') {
        selectedStartDate = date;
        document.getElementById('startDate').value = formatDate(date);
        document.getElementById('startDateText').textContent = formatDateArabic(date);
    } else {
        selectedEndDate = date;
        document.getElementById('endDate').value = formatDate(date);
        document.getElementById('endDateText').textContent = formatDateArabic(date);
    }
    renderCalendar(type, type === 'start' ? currentStartDate : currentEndDate);
    closeAllCalendars();
}

function formatDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function formatDateArabic(date) {
    const months = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 
                   'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
}

// ===================== CUSTOMERS =====================
function addCustomer(e) {
    e.preventDefault();
    
    const name = document.getElementById('customerName').value.trim();
    const source = document.getElementById('customerSource').value;
    const serviceId = parseInt(document.getElementById('customerService').value);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const notes = document.getElementById('customerNotes').value.trim();
    
    if (services.length === 0) {
        showNotification('⚠️ مفيش خدمات! ضيف خدمة الأول من قسم الخدمات', 'warning');
        return;
    }
    
    if (!name || !source || !serviceId || !startDate || !endDate) {
        showNotification('⚠️ يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    const service = services.find(s => s.id === serviceId);
    const customer = {
        id: Date.now(),
        name,
        source,
        serviceId,
        serviceName: service.name,
        serviceIcon: service.icon,
        price: service.price,
        startDate,
        endDate,
        notes,
        status: 'active',
        addedAt: new Date().toISOString()
    };
    
    customers.push(customer);
    saveData();
    
    showNotification('✅ تم إضافة العميل ' + name + ' بنجاح!', 'success');
    playSound('success');
    
    resetForm();
    renderAll();
}

function resetForm() {
    document.getElementById('customerForm').reset();
    selectedStartDate = null;
    selectedEndDate = null;
    document.getElementById('startDateText').textContent = 'اختر التاريخ';
    document.getElementById('endDateText').textContent = 'اختر التاريخ';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('customerPrice').value = '';
    currentStartDate = new Date();
    currentEndDate = new Date();
    renderCalendar('start', currentStartDate);
    renderCalendar('end', currentEndDate);
}

function updatePrice() {
    const serviceId = parseInt(document.getElementById('customerService').value);
    const service = services.find(s => s.id === serviceId);
    if (service) {
        document.getElementById('customerPrice').value = service.price + ' ج.م';
    }
}

function deleteCustomer(id) {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
        customers = customers.filter(c => c.id !== id);
        saveData();
        renderAll();
        showNotification('🗑️ تم حذف العميل', 'success');
    }
}

function renewCustomer(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    
    customer.startDate = formatDate(start);
    customer.endDate = formatDate(end);
    customer.status = 'active';
    customer.renewedAt = new Date().toISOString();
    customer.renewCount = (customer.renewCount || 0) + 1;
    
    saveData();
    renderAll();
    showNotification('🔄 تم تجديد اشتراك ' + customer.name + ' (' + customer.renewCount + ' مرة)', 'success');
    playSound('success');
}

function getStatus(customer) {
    const end = new Date(customer.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (customer.status === 'completed') return { status: 'completed', text: 'مكتمل', class: 'status-completed' };
    if (diffDays < 0) return { status: 'expired', text: 'منتهي', class: 'status-expired' };
    if (diffDays === 0) return { status: 'expiring', text: 'ينتهي اليوم', class: 'status-expiring' };
    if (diffDays === 1) return { status: 'expiring', text: 'ينتهي غداً', class: 'status-expiring' };
    return { status: 'active', text: 'نشط (' + diffDays + ' يوم)', class: 'status-active' };
}

function getSourceIcon(source) {
    const icons = {
        whatsapp: '<i class="fab fa-whatsapp" style="color: #25d366;"></i>',
        messenger: '<i class="fab fa-facebook-messenger" style="color: #0084ff;"></i>',
        telegram: '<i class="fab fa-telegram" style="color: #0088cc;"></i>',
        instagram: '<i class="fab fa-instagram" style="color: #e4405f;"></i>',
        facebook: '<i class="fab fa-facebook" style="color: #1877f2;"></i>',
        direct: '<i class="fas fa-handshake" style="color: var(--success);"></i>',
        other: '<i class="fas fa-ellipsis-h" style="color: var(--gray);"></i>'
    };
    return icons[source] || icons.other;
}

function getSourceName(source) {
    const names = {
        whatsapp: 'واتساب',
        messenger: 'مسنجر',
        telegram: 'تيليجرام',
        instagram: 'انستجرام',
        facebook: 'فيسبوك',
        direct: 'مباشر',
        other: 'أخرى'
    };
    return names[source] || source;
}

// ===================== SERVICES =====================
function openServiceModal() {
    document.getElementById('serviceModal').classList.add('show');
}

function closeServiceModal() {
    document.getElementById('serviceModal').classList.remove('show');
    document.getElementById('serviceName').value = '';
    document.getElementById('servicePrice').value = '';
}

function addService(e) {
    e.preventDefault();
    
    const name = document.getElementById('serviceName').value.trim();
    const price = parseFloat(document.getElementById('servicePrice').value);
    const icon = document.getElementById('serviceIcon').value;
    
    if (!name || !price) {
        showNotification('⚠️ أدخل اسم الخدمة والسعر', 'warning');
        return;
    }
    
    const service = {
        id: Date.now(),
        name: name,
        price: price,
        icon: icon,
        customers: 0
    };
    
    // ✅ أضف للمصفوفة
    services.push(service);
    
    // ✅ احفظ في localStorage
    saveData();
    
    // ✅ حدث dropdown في نموذج العميل
    updateServicesSelect();
    
    // ✅ شيك لو مفيش خدمات (نخفي الرسالة)
    checkServicesEmpty();
    
    // ✅ حدث صفحة الخدمات فوراً
    renderServices();
    
    // ✅ حدث كل الصفحات التانية
    renderAll();
    
    // ✅ أقفل المودال
    closeServiceModal();
    
    // ✅ إشعار نجاح
    showNotification('✅ تم إضافة الخدمة ' + name + ' بنجاح!', 'success');
    playSound('success');
    
    console.log('✅ خدمة جديدة:', service, 'الإجمالي:', services.length);
}

function deleteService(id) {
    if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
        services = services.filter(s => s.id !== id);
        saveData();
        
        // ✅ حدث dropdown في نموذج العميل
        updateServicesSelect();
        
        // ✅ شيك لو مفيش خدمات
        checkServicesEmpty();
        
        // ✅ حدث صفحة الخدمات فوراً
        renderServices();
        
        // ✅ حدث كل الصفحات
        renderAll();
        
        showNotification('🗑️ تم حذف الخدمة', 'success');
        
        console.log('🗑️ خدمة محذوفة. المتبقي:', services.length);
    }
}

function updateServicesSelect() {
    const select = document.getElementById('customerService');
    select.innerHTML = '';
    
    if (services.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '⚠️ مفيش خدمات - ضيف خدمة الأول من قسم الخدمات';
        select.appendChild(opt);
        return;
    }
    
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'اختر الخدمة';
    select.appendChild(defaultOpt);
    
    services.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.icon + ' ' + s.name + ' - ' + s.price + ' ج.م';
        select.appendChild(opt);
    });
}

// ===================== RENDERING =====================
function renderAll() {
    renderDashboard();
    renderCustomers();
    renderServices();
    renderExpiring();
    renderFinance();      // ← أضف دي لو مش موجودة
    updateBadges();
    updateServicesSelect(); // ← حدث dropdown
    checkServicesEmpty();   // ← شيك رسالة "مفيش خدمات"
}

function renderDashboard() {
    startTrialWidget();
    document.getElementById('totalCustomers').textContent = customers.length;
    
    const active = customers.filter(c => getStatus(c).status === 'active').length;
    document.getElementById('activeSubscriptions').textContent = active;
    
    const expiring = customers.filter(c => getStatus(c).status === 'expiring').length;
    document.getElementById('expiringSoon').textContent = expiring;
    
    const revenue = customers.reduce((sum, c) => sum + (c.price || 0), 0);
    document.getElementById('totalRevenue').textContent = revenue.toLocaleString() + ' ج.م';
    
    const sortedCustomers = [...customers].sort((a, b) => {
        const statusA = getStatus(a).status;
        const statusB = getStatus(b).status;
        const priority = { active: 0, expiring: 1, expired: 2, completed: 3 };
        const diff = (priority[statusA] || 0) - (priority[statusB] || 0);
        if (diff !== 0) return diff;
        return new Date(a.endDate) - new Date(b.endDate);
    });
    
    const container = document.getElementById('recentCustomers');
    
    if (sortedCustomers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-title">لا يوجد عملاء بعد</div>
                <div class="empty-state-text">ابدأ بإضافة عميل جديد</div>
                <button class="btn btn-primary" onclick="showSection('add-customer')">
                    <i class="fas fa-plus"></i> إضافة عميل
                </button>
            </div>`;
        return;
    }
    
    // ===== DESKTOP TABLE =====
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>العميل</th>
                    <th>الخدمة</th>
                    <th>تاريخ الانتهاء</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${sortedCustomers.map(c => {
                    const st = getStatus(c);
                    const end = new Date(c.endDate);
                    end.setHours(0,0,0,0);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const daysLeft = Math.round((end - today) / (1000*60*60*24));
                    const isRenewed = c.renewedAt && c.addedAt && new Date(c.renewedAt) > new Date(c.addedAt);
                    
                    return `
                    <tr style="${st.status === 'completed' || st.status === 'expired' ? 'opacity: 0.6; background: rgba(239,68,68,0.05);' : ''}">
                        <td>
                            <div class="customer-info">
                                <div class="customer-avatar" style="${isRenewed ? 'background: linear-gradient(135deg, var(--success), #059669);' : ''}">
                                    ${isRenewed ? '<i class="fas fa-sync-alt"></i>' : c.name.charAt(0)}
                                </div>
                                <div>
                                    <div class="customer-name">
                                        ${c.name} 
                                        ${isRenewed ? '<span style="color: var(--success); font-size: 11px; margin-right: 5px;"><i class="fas fa-redo"></i> تم التجديد</span>' : ''}
                                    </div>
                                    <div class="customer-source">${getSourceIcon(c.source)} ${getSourceName(c.source)}</div>
                                </div>
                            </div>
                        </td>
                        <td><span class="service-tag">${c.serviceIcon} ${c.serviceName}</span></td>
                        <td>
                            ${formatDateArabic(new Date(c.endDate))}
                            ${daysLeft > 0 && st.status !== 'completed' ? '<br><span style="color: var(--gray); font-size: 12px;">(' + daysLeft + ' ' + (daysLeft === 1 ? 'يوم متبقي' : 'أيام متبقية') + ')</span>' : ''}
                            ${daysLeft === 0 && st.status !== 'completed' ? '<br><span style="color: var(--warning); font-size: 12px;">(ينتهي اليوم)</span>' : ''}
                            ${daysLeft < 0 ? '<br><span style="color: var(--danger); font-size: 12px;">(انتهى من ' + Math.abs(daysLeft) + ' ' + (Math.abs(daysLeft) === 1 ? 'يوم' : 'أيام') + ')</span>' : ''}
                        </td>
                        <td><span class="status-badge ${st.class}">${st.text}</span></td>
                        <td>
                            <div class="action-btns">
                                ${st.status !== 'completed' && st.status !== 'expired' ? `<button class="action-btn renew" onclick="renewCustomer(${c.id})" title="تجديد الاشتراك"><i class="fas fa-sync-alt"></i></button>` : `<button class="action-btn renew" onclick="renewCustomer(${c.id})" title="تجديد من جديد" style="background: rgba(16,185,129,0.3);"><i class="fas fa-redo"></i></button>`}
                                <button class="action-btn delete" onclick="deleteCustomer(${c.id})" title="حذف العميل"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    
    // ===== MOBILE COLLAPSIBLE CARDS =====
    const cardsHTML = `
        <div class="customers-mobile-cards">
            ${sortedCustomers.slice(0, 10).map(c => {
                const st = getStatus(c);
                const end = new Date(c.endDate);
                end.setHours(0,0,0,0);
                const today = new Date();
                today.setHours(0,0,0,0);
                const daysLeft = Math.round((end - today) / (1000*60*60*24));
                const isRenewed = c.renewedAt && c.addedAt && new Date(c.renewedAt) > new Date(c.addedAt);
                
                let daysClass = 'active';
                let daysText = '';
                if (daysLeft > 0) {
                    daysText = daysLeft + ' ' + (daysLeft === 1 ? 'يوم متبقي' : 'أيام متبقية');
                    daysClass = 'active';
                } else if (daysLeft === 0) {
                    daysText = 'ينتهي اليوم!';
                    daysClass = 'expiring';
                } else {
                    daysText = 'انتهى من ' + Math.abs(daysLeft) + ' ' + (Math.abs(daysLeft) === 1 ? 'يوم' : 'أيام');
                    daysClass = 'expired';
                }
                
                return `
                <div class="customer-mobile-card status-${st.status}" onclick="toggleCard(this, event)" data-customer-id="${c.id}">
                    
                    <!-- COLLAPSED HEADER -->
                    <div class="customer-card-header">
                        <div class="customer-card-avatar ${isRenewed ? 'renewed' : ''}">
                            ${isRenewed ? '<i class="fas fa-redo"></i>' : c.name.charAt(0)}
                        </div>
                        <div class="customer-card-info">
                            <div class="customer-card-name">
                                ${c.name}
                                ${isRenewed ? '<span class="renew-badge"><i class="fas fa-redo"></i> تم التجديد</span>' : ''}
                            </div>
                            <div class="customer-card-service">
                                <span class="service-icon">${c.serviceIcon}</span>
                                ${c.serviceName}
                            </div>
                        </div>
                        <div class="customer-card-meta">
                            <div class="customer-card-price">${c.price || 0} ج.م</div>
                            <div class="customer-card-status-compact status-${st.status}">
                                <i class="fas fa-circle" style="font-size: 6px;"></i>
                                ${st.text.split(' ')[0]}
                            </div>
                        </div>
                    </div>
                    
                    <div class="customer-card-expand">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    
                    <!-- EXPANDABLE BODY -->
                    <div class="customer-card-body" onclick="event.stopPropagation()">
                        <div class="customer-card-field">
                            <div class="customer-card-label">الحالة</div>
                            <div class="customer-card-value days-left ${daysClass}">${daysText}</div>
                        </div>
                        
                        <div class="customer-card-field">
                            <div class="customer-card-label">المصدر</div>
                            <div class="customer-card-value">
                                <span class="customer-card-source-icon">${getSourceIcon(c.source)}</span>
                                ${getSourceName(c.source)}
                            </div>
                        </div>
                        
                        <div class="customer-card-field">
                            <div class="customer-card-label">تاريخ البداية</div>
                            <div class="customer-card-value">${formatDateArabic(new Date(c.startDate))}</div>
                        </div>
                        
                        <div class="customer-card-field">
                            <div class="customer-card-label">تاريخ الانتهاء</div>
                            <div class="customer-card-value">${formatDateArabic(new Date(c.endDate))}</div>
                        </div>
                        
                        ${c.notes ? `
                        <div class="customer-card-field full-width">
                            <div class="customer-card-label">ملاحظات</div>
                            <div class="customer-card-value" style="color: var(--gray); font-size: 13px;">${c.notes}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- EXPANDABLE FOOTER -->
                    <div class="customer-card-footer" onclick="event.stopPropagation()">
                        <span class="customer-card-status status-${st.status}">
                            <i class="fas fa-circle" style="font-size: 8px;"></i>
                            ${st.text}
                        </span>
                        <div class="customer-card-actions">
                            <button class="action-btn renew" onclick="renewCustomer(${c.id})" title="تجديد الاشتراك">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="action-btn delete" onclick="deleteCustomer(${c.id})" title="حذف العميل">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    
    container.innerHTML = tableHTML + cardsHTML;
}

function renderCustomers() {
    const container = document.getElementById('customersTableContainer');
    const search = document.getElementById('customerSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    
    let filtered = customers;
    if (search) {
        filtered = filtered.filter(c => c.name.toLowerCase().includes(search) || c.serviceName.toLowerCase().includes(search));
    }
    if (statusFilter !== 'all') {
        filtered = filtered.filter(c => getStatus(c).status === statusFilter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">لا يوجد عملاء</div>
                <div class="empty-state-text">أضف عميلك الأول الآن</div>
            </div>`;
        return;
    }
    
    // ===== DESKTOP TABLE =====
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>العميل</th>
                    <th>الخدمة</th>
                    <th>تاريخ البداية</th>
                    <th>تاريخ الانتهاء</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(c => {
                    const st = getStatus(c);
                    const end = new Date(c.endDate);
                    end.setHours(0,0,0,0);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const daysLeft = Math.round((end - today) / (1000*60*60*24));
                    
                    return `
                    <tr>
                        <td>
                            <div class="customer-info">
                                <div class="customer-avatar">${c.name.charAt(0)}</div>
                                <div>
                                    <div class="customer-name">${c.name}</div>
                                    <div class="customer-source">${getSourceIcon(c.source)} ${getSourceName(c.source)}</div>
                                </div>
                            </div>
                        </td>
                        <td><span class="service-tag">${c.serviceIcon} ${c.serviceName}</span></td>
                        <td>${formatDateArabic(new Date(c.startDate))}</td>
                        <td>${formatDateArabic(new Date(c.endDate))} ${daysLeft > 0 ? '<span style="color: var(--gray); font-size: 12px;">(' + daysLeft + ' ' + (daysLeft === 1 ? 'يوم' : 'أيام') + ')</span>' : daysLeft === 0 ? '<span style="color: var(--warning); font-size: 12px;">(ينتهي اليوم)</span>' : '<span style="color: var(--danger); font-size: 12px;">(انتهى)</span>'}</td>
                        <td><span class="status-badge ${st.class}">${st.text}</span></td>
                        <td>
                            <div class="action-btns">
                                <button class="action-btn renew" onclick="renewCustomer(${c.id})" title="تجديد"><i class="fas fa-sync-alt"></i></button>
                                <button class="action-btn delete" onclick="deleteCustomer(${c.id})" title="حذف"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    
    // ===== MOBILE COLLAPSIBLE CARDS =====
    const cardsHTML = `
        <div class="customers-mobile-cards">
            ${filtered.map(c => {
                const st = getStatus(c);
                const end = new Date(c.endDate);
                end.setHours(0,0,0,0);
                const today = new Date();
                today.setHours(0,0,0,0);
                const daysLeft = Math.round((end - today) / (1000*60*60*24));
                const isRenewed = c.renewedAt && c.addedAt && new Date(c.renewedAt) > new Date(c.addedAt);
                
                let daysClass = 'active';
                let daysText = '';
                if (daysLeft > 0) {
                    daysText = daysLeft + ' ' + (daysLeft === 1 ? 'يوم متبقي' : 'أيام متبقية');
                    daysClass = 'active';
                } else if (daysLeft === 0) {
                    daysText = 'ينتهي اليوم!';
                    daysClass = 'expiring';
                } else {
                    daysText = 'انتهى من ' + Math.abs(daysLeft) + ' ' + (Math.abs(daysLeft) === 1 ? 'يوم' : 'أيام');
                    daysClass = 'expired';
                }
                
                return `
                <div class="customer-mobile-card status-${st.status}" onclick="toggleCard(this, event)" data-customer-id="${c.id}">
                    
                    <!-- COLLAPSED HEADER (always visible) -->
                    <div class="customer-card-header">
                        <div class="customer-card-avatar ${isRenewed ? 'renewed' : ''}">
                            ${isRenewed ? '<i class="fas fa-redo"></i>' : c.name.charAt(0)}
                        </div>
                        <div class="customer-card-info">
                            <div class="customer-card-name">
                                ${c.name}
                                ${isRenewed ? '<span class="renew-badge"><i class="fas fa-redo"></i> تم التجديد</span>' : ''}
                            </div>
                            <div class="customer-card-service">
                                <span class="service-icon">${c.serviceIcon}</span>
                                ${c.serviceName}
                            </div>
                        </div>
                        <div class="customer-card-meta">
                            <div class="customer-card-price">${c.price || 0} ج.م</div>
                            <div class="customer-card-status-compact status-${st.status}">
                                <i class="fas fa-circle" style="font-size: 6px;"></i>
                                ${st.text.split(' ')[0]}
                            </div>
                        </div>
                    </div>
                    
                    <div class="customer-card-expand">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    
                    <!-- EXPANDABLE BODY -->
                    <div class="customer-card-body" onclick="event.stopPropagation()">
                        <div class="customer-card-field">
                            <div class="customer-card-label">الحالة</div>
                            <div class="customer-card-value days-left ${daysClass}">${daysText}</div>
                        </div>
                        
                        <div class="customer-card-field">
                            <div class="customer-card-label">المصدر</div>
                            <div class="customer-card-value">
                                <span class="customer-card-source-icon">${getSourceIcon(c.source)}</span>
                                ${getSourceName(c.source)}
                            </div>
                        </div>
                        
                        <div class="customer-card-field">
                            <div class="customer-card-label">تاريخ البداية</div>
                            <div class="customer-card-value">${formatDateArabic(new Date(c.startDate))}</div>
                        </div>
                        
                        <div class="customer-card-field">
                            <div class="customer-card-label">تاريخ الانتهاء</div>
                            <div class="customer-card-value">${formatDateArabic(new Date(c.endDate))}</div>
                        </div>
                        
                        ${c.notes ? `
                        <div class="customer-card-field full-width">
                            <div class="customer-card-label">ملاحظات</div>
                            <div class="customer-card-value" style="color: var(--gray); font-size: 13px;">${c.notes}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- EXPANDABLE FOOTER -->
                    <div class="customer-card-footer" onclick="event.stopPropagation()">
                        <span class="customer-card-status status-${st.status}">
                            <i class="fas fa-circle" style="font-size: 8px;"></i>
                            ${st.text}
                        </span>
                        <div class="customer-card-actions">
                            <button class="action-btn renew" onclick="renewCustomer(${c.id})" title="تجديد الاشتراك">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="action-btn delete" onclick="deleteCustomer(${c.id})" title="حذف العميل">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    
    container.innerHTML = tableHTML + cardsHTML;
}

function renderServices() {
    const grid = document.getElementById('servicesGrid');
    
    if (!grid) {
        console.error('❌ servicesGrid مش موجود في DOM!');
        return;
    }
    
    // ✅ تأكد إن services مصفوفة
    if (!Array.isArray(services)) {
        console.error('❌ services مش مصفوفة!', services);
        services = [];
    }
    
    if (services.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-title">لا توجد خدمات</div>
                <div class="empty-state-text">أضف خدمتك الأولى لتبدأ</div>
                <button class="btn btn-primary" onclick="openServiceModal()">
                    <i class="fas fa-plus"></i> إضافة خدمة جديدة
                </button>
            </div>`;
        return;
    }
    
    // ✅ حدث عدد العملاء لكل خدمة
    services.forEach(s => {
        s.customers = customers.filter(c => c.serviceId === s.id).length;
    });
    
    // ✅ بني HTML
    const html = services.map(s => `
        <div class="service-card" data-service-id="${s.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="service-icon">${s.icon}</div>
                <button class="action-btn delete" onclick="deleteService(${s.id})" title="حذف الخدمة">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="service-name">${s.name}</div>
            <div class="service-price">${s.price} ج.م</div>
            <div class="service-stats">
                <div class="service-stat">
                    <strong>${s.customers}</strong>
                    عميل
                </div>
                <div class="service-stat">
                    <strong>${s.customers * s.price} ج.م</strong>
                    إيرادات
                </div>
            </div>
        </div>
    `).join('');
    
    grid.innerHTML = html;
    
    console.log('✅ renderServices:', services.length, 'خدمة');
}

function renderExpiring() {
    const container = document.getElementById('expiringContainer');
    const expiring = customers.filter(c => {
        const st = getStatus(c);
        return st.status === 'expiring' || st.status === 'expired';
    });
    
    if (expiring.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-title">لا توجد اشتراكات منتهية</div>
                <div class="empty-state-text">كل الاشتراكات نشطة حالياً</div>
            </div>`;
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>العميل</th>
                    <th>الخدمة</th>
                    <th>تاريخ الانتهاء</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${expiring.map(c => {
                    const st = getStatus(c);
                    return `
                    <tr>
                        <td>
                            <div class="customer-info">
                                <div class="customer-avatar">${c.name.charAt(0)}</div>
                                <div>
                                    <div class="customer-name">${c.name}</div>
                                    <div class="customer-source">${getSourceIcon(c.source)} ${getSourceName(c.source)}</div>
                                </div>
                            </div>
                        </td>
                        <td><span class="service-tag">${c.serviceIcon} ${c.serviceName}</span></td>
                        <td>${formatDateArabic(new Date(c.endDate))}</td>
                        <td><span class="status-badge ${st.class}">${st.text}</span></td>
                        <td>
                            <div class="action-btns">
                                <button class="action-btn renew" onclick="renewCustomer(${c.id})" title="تجديد"><i class="fas fa-sync-alt"></i></button>
                                <button class="action-btn delete" onclick="deleteCustomer(${c.id})" title="حذف"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

function updateBadges() {
    document.getElementById('customerCountBadge').textContent = customers.length;
    
    const expiringCount = customers.filter(c => getStatus(c).status === 'expiring').length;
    const expiringBadge = document.getElementById('expiringBadge');
    if (expiringCount > 0) {
        expiringBadge.textContent = expiringCount;
        expiringBadge.style.display = 'inline-block';
    } else {
        expiringBadge.style.display = 'none';
    }
}

// ===================== NOTIFICATION QUEUE SYSTEM =====================
let notificationQueue = [];
let dismissedNotificationIds = JSON.parse(localStorage.getItem('sub_dismissed_notifications') || '[]');
let playedSoundIds = JSON.parse(localStorage.getItem('sub_played_sounds') || '[]');
const NOTIFICATION_REPEAT_INTERVAL = 60000; // 1 minute repeat for non-dismissed
const NOTIFICATION_AUTO_DISMISS = 8000; // 8 seconds auto-dismiss
let notificationRepeatTimer = null;
let autoDismissTimers = {};

function showNotification(message, type = 'success', options = {}) {
    const notifId = options.id || ('notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
    
    // If this notification was already dismissed, don't show it again
    if (dismissedNotificationIds.includes(notifId)) {
        return;
    }
    
    const notifData = {
        id: notifId,
        message: message,
        type: type,
        timestamp: Date.now(),
        options: options,
        soundPlayed: playedSoundIds.includes(notifId) // Check if sound already played
    };
    
    // Add to queue
    notificationQueue.push(notifData);
    
    // If this is an expiring subscription alert, add it to repeat queue
    if (options.repeat && options.customerId) {
        scheduleRepeatNotification(notifData);
    }
    
    renderNotificationStack();
    
    // Play sound ONLY if not already played for this notification
    if (!notifData.soundPlayed) {
        playSound(type === 'danger' ? 'alert' : 'success');
        playedSoundIds.push(notifId);
        localStorage.setItem('sub_played_sounds', JSON.stringify(playedSoundIds));
    }
}

function renderNotificationStack() {
    const panel = document.getElementById('notificationPanel');
    const stack = document.getElementById('notificationStack');
    const stackBody = document.getElementById('stackBody');
    const stackCount = document.getElementById('stackCount');
    
    if (!stack || !stackBody || !stackCount) return;
    
    // Filter out dismissed notifications
    const visibleQueue = notificationQueue.filter(n => !dismissedNotificationIds.includes(n.id));
    
    if (visibleQueue.length === 0) {
        stack.style.display = 'none';
        return;
    }
    
    stack.style.display = 'block';
    stackCount.textContent = visibleQueue.length;
    
    // Show only the first notification in the stack body
    const current = visibleQueue[0];
    
    const icons = {
        success: '✅',
        warning: '⚠️',
        danger: '🚨'
    };
    
    const titles = {
        success: 'تم بنجاح',
        warning: 'تنبيه',
        danger: 'تنبيه مهم'
    };
    
    stackBody.innerHTML = `
        <div class="notification ${current.type}" data-notif-id="${current.id}" id="activeNotif_${current.id}">
            <button class="notification-dismiss" onclick="dismissNotification('${current.id}')" title="شفتها ✅">
                <i class="fas fa-check"></i>
            </button>
            <div class="notification-icon">${icons[current.type] || 'ℹ️'}</div>
            <div class="notification-content">
                <h4>${titles[current.type] || 'تنبيه'}</h4>
                <p>${current.message}</p>
            </div>
        </div>
    `;
    
    // Add swipe support to the active notification
    setTimeout(() => {
        const notifEl = document.getElementById('activeNotif_' + current.id);
        if (notifEl) {
            initSwipeDismiss(notifEl, current.id);
        }
    }, 50);
}

function dismissNotification(id) {
    if (!dismissedNotificationIds.includes(id)) {
        dismissedNotificationIds.push(id);
        localStorage.setItem('sub_dismissed_notifications', JSON.stringify(dismissedNotificationIds));
    }
    
    // Remove from queue
    notificationQueue = notificationQueue.filter(n => n.id !== id);
    
    // Stop repeating this notification
    stopRepeatNotification(id);
    
    renderNotificationStack();
    
    // Play a small success sound when dismissing
    playSound('success');
}

function dismissAllNotifications() {
    notificationQueue.forEach(n => {
        if (!dismissedNotificationIds.includes(n.id)) {
            dismissedNotificationIds.push(n.id);
        }
        stopRepeatNotification(n.id);
    });
    
    localStorage.setItem('sub_dismissed_notifications', JSON.stringify(dismissedNotificationIds));
    notificationQueue = [];
    renderNotificationStack();
    playSound('success');
}

// ===================== SWIPE TO DISMISS =====================
function initSwipeDismiss(element, notifId) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    const threshold = 100; // pixels to dismiss
    
    const startDrag = (e) => {
        isDragging = true;
        startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        element.classList.add('swiping');
    };
    
    const moveDrag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const diff = currentX - startX;
        
        // Only allow swipe left (negative diff)
        if (diff < 0) {
            element.style.transform = `translateX(${diff}px)`;
            if (Math.abs(diff) > threshold / 2) {
                element.classList.add('swipe-left');
            } else {
                element.classList.remove('swipe-left');
            }
        }
    };
    
    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        element.classList.remove('swiping');
        const diff = currentX - startX;
        
        if (Math.abs(diff) > threshold) {
            // Dismiss
            element.classList.add('dismissed');
            setTimeout(() => dismissNotification(notifId), 300);
        } else {
            // Snap back
            element.style.transform = '';
            element.classList.remove('swipe-left');
        }
    };
    
    // Touch events
    element.addEventListener('touchstart', startDrag, { passive: true });
    element.addEventListener('touchmove', moveDrag, { passive: false });
    element.addEventListener('touchend', endDrag);
    
    // Mouse events (for desktop)
    element.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);
}

// ===================== REPEAT NOTIFICATIONS =====================
let repeatTimers = {};

function scheduleRepeatNotification(notifData) {
    // Clear existing timer for this notification
    stopRepeatNotification(notifData.id);
    
    // Set up repeating notification
    repeatTimers[notifData.id] = setInterval(() => {
        // Check if still not dismissed
        if (!dismissedNotificationIds.includes(notifData.id)) {
            // Re-add to queue if not already there
            const exists = notificationQueue.some(n => n.id === notifData.id);
            if (!exists) {
                // Mark sound as already played so it doesn't repeat
                const repeatedNotif = {
                    ...notifData,
                    soundPlayed: true // Sound already played, don't play again
                };
                notificationQueue.push(repeatedNotif);
            }
            renderNotificationStack();
            // NO playSound here! Sound only plays once on first appearance
        } else {
            stopRepeatNotification(notifData.id);
        }
    }, NOTIFICATION_REPEAT_INTERVAL);
}

function stopRepeatNotification(id) {
    if (repeatTimers[id]) {
        clearInterval(repeatTimers[id]);
        delete repeatTimers[id];
    }
}

// ===================== CLEAR OLD DISMISSED NOTIFICATIONS =====================
function clearOldDismissedNotifications() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Clean dismissed IDs
    dismissedNotificationIds = dismissedNotificationIds.filter(id => {
        try {
            const timestamp = parseInt(id.split('_')[1]);
            return timestamp > oneWeekAgo;
        } catch {
            return true;
        }
    });
    localStorage.setItem('sub_dismissed_notifications', JSON.stringify(dismissedNotificationIds));
    
    // Clean played sound IDs (same logic)
    playedSoundIds = playedSoundIds.filter(id => {
        try {
            const timestamp = parseInt(id.split('_')[1]);
            return timestamp > oneWeekAgo;
        } catch {
            return true;
        }
    });
    localStorage.setItem('sub_played_sounds', JSON.stringify(playedSoundIds));
}

// Run cleanup on startup
clearOldDismissedNotifications();

// Run cleanup on startup
clearOldDismissedNotifications();

function playSound(type) {
    if (!soundEnabled) return;
    
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'success') {
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
    } else if (type === 'alert') {
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime + 0.4);
    }
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('sub_sound', soundEnabled);
    updateSoundIcon();
    showNotification(soundEnabled ? '🔊 تم تشغيل الصوت' : '🔇 تم إيقاف الصوت', 'success');
}

function updateSoundIcon() {
    const icon = document.getElementById('soundIcon');
    const btn = document.getElementById('soundToggle');
    if (soundEnabled) {
        icon.className = 'fas fa-volume-up';
        btn.classList.remove('muted');
    } else {
        icon.className = 'fas fa-volume-mute';
        btn.classList.add('muted');
    }
}

// ===================== EXPIRING CHECKER =====================
function checkExpiringSubscriptions() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiringTomorrow = [];
    const expiringToday = [];
    const expiredToday = [];
    
    customers.forEach(customer => {
        const endDate = new Date(customer.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.round((endDate - today) / (1000 * 60 * 60 * 24));
        
        const notifId = `expiring_${customer.id}_${formatDate(today)}`;
        
        // ينتهي بكرة
        if (diffDays === 1 && customer.status !== 'completed') {
            showNotification(
                `⏰ اشتراك ${customer.name} ينتهي غداً! (${customer.serviceName})`,
                'warning',
                { id: notifId, repeat: true, customerId: customer.id }
            );
            expiringTomorrow.push(customer);
        }
        
        // ينتهي اليوم
        if (diffDays === 0 && customer.status !== 'completed') {
            showNotification(
                `⚠️ اشتراك ${customer.name} ينتهي اليوم! (${customer.serviceName})`,
                'warning',
                { id: notifId, repeat: true, customerId: customer.id }
            );
            expiringToday.push(customer);
        }
        
        // انتهى
        if (diffDays < 0 && customer.status !== 'completed') {
            showNotification(
                `🚨 اشتراك ${customer.name} انتهى! (${customer.serviceName})`,
                'danger',
                { id: notifId, repeat: true, customerId: customer.id }
            );
            expiredToday.push(customer);
            customer.status = 'completed';
            saveData();
            renderAll();
        }
    });
    
    // إرسال Push Notifications
    if (pushEnabled && Notification.permission === 'granted') {
        const lastPushDate = localStorage.getItem('sub_last_push_date');
        const todayStr = formatDate(today);
        
        if (lastPushDate !== todayStr) {
            if (expiringTomorrow.length > 0) {
                sendLocalNotification(
                    `⏰ ${expiringTomorrow.length} اشتراك ينتهي غداً!`,
                    `العملاء: ${expiringTomorrow.map(c => c.name).join('، ')}`,
                    { tag: 'expiring-tomorrow', requireInteraction: true }
                );
            }
            
            if (expiringToday.length > 0) {
                sendLocalNotification(
                    `⚠️ ${expiringToday.length} اشتراك ينتهي اليوم!`,
                    `العملاء: ${expiringToday.map(c => c.name).join('، ')}`,
                    { tag: 'expiring-today', requireInteraction: true }
                );
            }
            
            localStorage.setItem('sub_last_push_date', todayStr);
        }
    }
}

// ===================== COLLAPSIBLE CARD TOGGLE =====================
function toggleCard(card, event) {
    // Don't toggle if clicking on a button inside the card
    if (event.target.closest('button') || event.target.closest('.customer-card-body') || event.target.closest('.customer-card-footer')) {
        return;
    }
    
    // Close all other cards first (accordion style - optional, remove if you want multiple open)
    document.querySelectorAll('.customer-mobile-card.expanded').forEach(c => {
        if (c !== card) c.classList.remove('expanded');
    });
    
    // Toggle current card
    card.classList.toggle('expanded');
    
    // Add a subtle animation
    if (card.classList.contains('expanded')) {
        card.style.transform = 'scale(1.02)';
        setTimeout(() => {
            card.style.transform = '';
        }, 200);
    }
}

// ===================== EXPENSE CARD TOGGLE =====================
function toggleExpenseCard(card, event) {
    // Don't toggle if clicking on a button inside the card
    if (event.target.closest('button') || event.target.closest('.expense-card-body') || event.target.closest('.expense-card-footer')) {
        return;
    }
    
    // Close all other expense cards first
    document.querySelectorAll('.expense-mobile-card.expanded').forEach(c => {
        if (c !== card) c.classList.remove('expanded');
    });
    
    // Toggle current card
    card.classList.toggle('expanded');
    
    // Add a subtle animation
    if (card.classList.contains('expanded')) {
        card.style.transform = 'scale(1.02)';
        setTimeout(() => {
            card.style.transform = '';
        }, 200);
    }
}

// ===================== FILTER =====================
function filterCustomers() {
    renderCustomers();
}

// ===================== SAVE =====================
function saveData() {
    try {
        localStorage.setItem('sub_customers', JSON.stringify(customers));
        localStorage.setItem('sub_services', JSON.stringify(services));
        localStorage.setItem('sub_expenses', JSON.stringify(expenses));
        
        console.log('💾 تم الحفظ:', {
            customers: customers.length,
            services: services.length,
            expenses: expenses.length
        });
    } catch (err) {
        console.error('❌ خطأ في الحفظ:', err);
        showNotification('⚠️ خطأ في حفظ البيانات', 'warning');
    }
}

// ===================== SETTINGS =====================
let settings = JSON.parse(localStorage.getItem('sub_settings')) || {
    merchantName: '',
    merchantEmail: '',
    autoNotify: true
};

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('show');
    
    const nameInput = document.getElementById('merchantName');
    if (nameInput) nameInput.value = settings.merchantName || '';
    
    const autoNotifyInput = document.getElementById('autoNotify');
    if (autoNotifyInput) autoNotifyInput.checked = settings.autoNotify !== false;
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('show');
}

function saveSettings(e) {
    e.preventDefault();
    
    const name = document.getElementById('merchantName').value.trim();
    const autoNotify = document.getElementById('autoNotify').checked;
    
    settings = { merchantName: name, autoNotify: autoNotify };
    localStorage.setItem('sub_settings', JSON.stringify(settings));
    closeSettingsModal();
    showNotification('✅ تم الحفظ!', 'success');
    playSound('success');
    
    if (autoNotify && !pushEnabled) {
        setTimeout(() => requestPushPermission(), 500);
    }
}

function getSettings() {
    return JSON.parse(localStorage.getItem('sub_settings')) || {
        merchantName: '',
        merchantEmail: '',
        autoNotify: true
    };
}

// ===================== EXPENSE CALENDAR =====================
let currentExpenseDate = new Date();
let selectedExpenseDate = null;
let expenseCalendarOpen = false;

function initExpenseCalendar() {
    renderExpenseCalendar(currentExpenseDate);
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#expenseDateDisplay') && !e.target.closest('#expenseCalendar')) {
            closeExpenseCalendar();
        }
    });
}

function renderExpenseCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const monthNames = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    document.getElementById('expenseCalendarTitle').textContent = monthNames[month] + ' ' + year;
    
    const grid = document.getElementById('expenseCalendarGrid');
    grid.innerHTML = '';
    
    const dayHeaders = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    dayHeaders.forEach(d => {
        const el = document.createElement('div');
        el.className = 'calendar-day-header';
        el.textContent = d;
        grid.appendChild(el);
    });
    
    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day other-month';
        el.textContent = daysInPrevMonth - firstDay + i + 1;
        grid.appendChild(el);
    }
    
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day';
        el.textContent = i;
        
        const thisDate = new Date(year, month, i);
        
        if (thisDate.toDateString() === today.toDateString()) {
            el.classList.add('today');
        }
        
        if (selectedExpenseDate && thisDate.toDateString() === selectedExpenseDate.toDateString()) {
            el.classList.add('selected');
        }
        
        el.onclick = () => selectExpenseDate(thisDate);
        grid.appendChild(el);
    }
    
    const remaining = (7 - ((firstDay + daysInMonth) % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day other-month';
        el.textContent = i;
        grid.appendChild(el);
    }
}

function changeExpenseMonth(delta) {
    currentExpenseDate.setMonth(currentExpenseDate.getMonth() + delta);
    renderExpenseCalendar(currentExpenseDate);
}

function toggleExpenseCalendar() {
    const cal = document.getElementById('expenseCalendar');
    expenseCalendarOpen = !expenseCalendarOpen;
    cal.classList.toggle('show', expenseCalendarOpen);
}

function closeExpenseCalendar() {
    document.getElementById('expenseCalendar').classList.remove('show');
    expenseCalendarOpen = false;
}

function selectExpenseDate(date) {
    selectedExpenseDate = date;
    document.getElementById('expenseDate').value = formatDate(date);
    document.getElementById('expenseDateText').textContent = formatDateArabic(date);
    renderExpenseCalendar(currentExpenseDate);
    closeExpenseCalendar();
}

// ===================== EXPENSES =====================
function openExpenseModal() {
    document.getElementById('expenseModal').classList.add('show');
    selectExpenseDate(new Date());
    updateExpenseServicesSelect();
}

function closeExpenseModal() {
    document.getElementById('expenseModal').classList.remove('show');
    document.getElementById('expenseService').value = '';
    document.getElementById('expenseDesc').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseNotes').value = '';
    selectedExpenseDate = null;
    document.getElementById('expenseDateText').textContent = 'اختر التاريخ';
    document.getElementById('expenseDate').value = '';
    currentExpenseDate = new Date();
    renderExpenseCalendar(currentExpenseDate);
    closeExpenseCalendar();
}

function updateExpenseServicesSelect() {
    const select = document.getElementById('expenseService');
    select.innerHTML = '<option value="">اختر الخدمة</option>';
    services.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.icon + ' ' + s.name;
        select.appendChild(opt);
    });
}

function updateExpenseServiceName() {
    const serviceId = parseInt(document.getElementById('expenseService').value);
    const service = services.find(s => s.id === serviceId);
    if (service) {
        const descInput = document.getElementById('expenseDesc');
        if (!descInput.value.trim()) {
            descInput.value = service.name;
        }
    }
}

function addExpense(e) {
    e.preventDefault();
    const serviceId = parseInt(document.getElementById('expenseService').value);
    const desc = document.getElementById('expenseDesc').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value;
    const notes = document.getElementById('expenseNotes').value.trim();
    
    if (!serviceId || !amount) {
        showNotification('⚠️ يرجى اختيار الخدمة وإدخال المبلغ', 'warning');
        return;
    }
    
    const service = services.find(s => s.id === serviceId);
    const expense = {
        id: Date.now(),
        serviceId,
        serviceName: service.name,
        serviceIcon: service.icon,
        desc: desc || service.name,
        amount,
        date: date || formatDate(new Date()),
        notes
    };
    
    expenses.push(expense);
    saveExpenses();
    renderFinance();
    closeExpenseModal();
    showNotification('💸 تم إضافة مصروف: ' + (desc || service.name) + ' (' + amount + ' ج.م)', 'success');
}

function deleteExpense(id) {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
        expenses = expenses.filter(e => e.id !== id);
        saveExpenses();
        renderFinance();
        showNotification('🗑️ تم حذف المصروف', 'success');
    }
}

function saveExpenses() {
    localStorage.setItem('sub_expenses', JSON.stringify(expenses));
}

// ===================== FINANCE RENDERING =====================
function renderFinance() {
    const totalRevenue = customers.reduce((sum, c) => sum + (c.price || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitPercentage = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    
    document.getElementById('totalRevenueFinance').textContent = totalRevenue.toLocaleString() + ' ج.م';
    document.getElementById('totalExpenses').textContent = totalExpenses.toLocaleString() + ' ج.م';
    document.getElementById('netProfit').textContent = netProfit.toLocaleString() + ' ج.م';
    document.getElementById('profitPercentage').textContent = profitPercentage + '%';
    
    const netProfitEl = document.getElementById('netProfit');
    if (netProfit >= 0) {
        netProfitEl.style.color = 'var(--success)';
    } else {
        netProfitEl.style.color = 'var(--danger)';
    }
    
    const container = document.getElementById('expensesContainer');
    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <div class="empty-state-title">لا توجد مصروفات</div>
                <div class="empty-state-text">أضف مصروفاتك لحساب صافي الربح</div>
                <button class="btn btn-primary" onclick="openExpenseModal()">
                    <i class="fas fa-plus"></i> إضافة مصروف
                </button>
            </div>`;
    } else {
        // ===== DESKTOP TABLE =====
        const tableHTML = `
            <table class="expense-table">
                <thead>
                    <tr>
                        <th>الخدمة</th>
                        <th>الوصف</th>
                        <th>المبلغ</th>
                        <th>التاريخ</th>
                        <th>إجراء</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.slice().reverse().map(e => `
                        <tr>
                            <td><span class="service-tag">${e.serviceIcon || '📦'} ${e.serviceName || e.desc}</span></td>
                            <td style="color: var(--gray); font-size: 13px;">${e.desc !== e.serviceName ? e.desc : '-'} ${e.notes ? '<br><span style="font-size: 11px; opacity: 0.7;">' + e.notes + '</span>' : ''}</td>
                            <td class="expense-amount">-${e.amount.toLocaleString()} ج.م</td>
                            <td>${formatDateArabic(new Date(e.date))}</td>
                            <td>
                                <button class="action-btn delete" onclick="deleteExpense(${e.id})" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
        
        // ===== MOBILE COLLAPSIBLE CARDS =====
        const cardsHTML = `
            <div class="expenses-mobile-cards">
                ${expenses.slice().reverse().map(e => `
                    <div class="expense-mobile-card" onclick="toggleExpenseCard(this, event)" data-expense-id="${e.id}">
                        
                        <!-- COLLAPSED HEADER -->
                        <div class="expense-card-header">
                            <div class="expense-card-icon">
                                ${e.serviceIcon || '📦'}
                            </div>
                            <div class="expense-card-info">
                                <div class="expense-card-name">
                                    ${e.desc || e.serviceName || 'مصروف'}
                                </div>
                                <div class="expense-card-service">
                                    <span class="service-icon">${e.serviceIcon || '📦'}</span>
                                    ${e.serviceName || 'خدمة'}
                                </div>
                            </div>
                            <div class="expense-card-meta">
                                <div class="expense-card-amount">-${e.amount.toLocaleString()} ج.م</div>
                                <div class="expense-card-date-compact">${formatDateArabic(new Date(e.date))}</div>
                            </div>
                        </div>
                        
                        <div class="expense-card-expand">
                            <i class="fas fa-chevron-down"></i>
                        </div>
                        
                        <!-- EXPANDABLE BODY -->
                        <div class="expense-card-body" onclick="event.stopPropagation()">
                            <div class="expense-card-field">
                                <div class="expense-card-label">الخدمة</div>
                                <div class="expense-card-value">
                                    <span class="service-icon">${e.serviceIcon || '📦'}</span>
                                    ${e.serviceName || '-'}
                                </div>
                            </div>
                            
                            <div class="expense-card-field">
                                <div class="expense-card-label">المبلغ</div>
                                <div class="expense-card-value amount">-${e.amount.toLocaleString()} ج.م</div>
                            </div>
                            
                            <div class="expense-card-field">
                                <div class="expense-card-label">التاريخ</div>
                                <div class="expense-card-value">${formatDateArabic(new Date(e.date))}</div>
                            </div>
                            
                            <div class="expense-card-field">
                                <div class="expense-card-label">الوصف</div>
                                <div class="expense-card-value">${e.desc !== e.serviceName ? e.desc : '-'}</div>
                            </div>
                            
                            ${e.notes ? `
                            <div class="expense-card-field full-width">
                                <div class="expense-card-label">ملاحظات</div>
                                <div class="expense-card-value" style="color: var(--gray); font-size: 13px;">${e.notes}</div>
                            </div>
                            ` : ''}
                        </div>
                        
                        <!-- EXPANDABLE FOOTER -->
                        <div class="expense-card-footer" onclick="event.stopPropagation()">
                            <div class="expense-card-total">
                                المبلغ: <strong>-${e.amount.toLocaleString()} ج.م</strong>
                            </div>
                            <div class="expense-card-actions">
                                <button class="action-btn delete" onclick="deleteExpense(${e.id})" title="حذف المصروف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
        
        container.innerHTML = tableHTML + cardsHTML;
    }
    
    const maxVal = Math.max(totalRevenue, totalExpenses, Math.abs(netProfit));
    const breakdown = document.getElementById('profitBreakdown');
    breakdown.innerHTML = `
        <div class="finance-chart">
            <div class="finance-chart-bar">
                <div class="finance-bar-item">
                    <div class="finance-bar-label">
                        <span>💰 الإيرادات</span>
                        <span style="color: var(--success);">${totalRevenue.toLocaleString()} ج.م</span>
                    </div>
                    <div class="finance-bar-track">
                        <div class="finance-bar-fill revenue" style="width: ${maxVal > 0 ? (totalRevenue / maxVal * 100) : 0}%"></div>
                    </div>
                </div>
                <div class="finance-bar-item">
                    <div class="finance-bar-label">
                        <span>💸 المصروفات</span>
                        <span style="color: var(--danger);">${totalExpenses.toLocaleString()} ج.م</span>
                    </div>
                    <div class="finance-bar-track">
                        <div class="finance-bar-fill expense" style="width: ${maxVal > 0 ? (totalExpenses / maxVal * 100) : 0}%"></div>
                    </div>
                </div>
                <div class="finance-bar-item">
                    <div class="finance-bar-label">
                        <span>📊 صافي الربح</span>
                        <span style="color: ${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">${netProfit.toLocaleString()} ج.م</span>
                    </div>
                    <div class="finance-bar-track">
                        <div class="finance-bar-fill profit" style="width: ${maxVal > 0 ? (Math.abs(netProfit) / maxVal * 100) : 0}%"></div>
                    </div>
                </div>
            </div>
            <div class="finance-summary">
                <div class="finance-summary-item">
                    <div class="finance-summary-value ${netProfit >= 0 ? 'positive' : 'negative'}">${netProfit.toLocaleString()}</div>
                    <div class="finance-summary-label">صافي الربح (ج.م)</div>
                </div>
                <div class="finance-summary-item">
                    <div class="finance-summary-value" style="color: var(--warning);">${profitPercentage}%</div>
                    <div class="finance-summary-label">نسبة الربح</div>
                </div>
                <div class="finance-summary-item">
                    <div class="finance-summary-value" style="color: var(--primary);">${expenses.length}</div>
                    <div class="finance-summary-label">عدد المصروفات</div>
                </div>
            </div>
        </div>
    `;
}