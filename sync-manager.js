// ===================== SYNC MANAGER - GitHub Gists =====================

const B64 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// ✅ التوكن من localStorage
function getToken() { return localStorage.getItem('github_token') || ''; }

// كود الجهاز: 8 أحرف
function generateDeviceCode() {
    const existing = localStorage.getItem('device_code');
    if (existing) return existing;
    let c = 'SM-';
    for (let i = 0; i < 5; i++) c += B64[Math.random() * 32 | 0];
    localStorage.setItem('device_code', c);
    return c;
}
function getDeviceCode() { return localStorage.getItem('device_code') || generateDeviceCode(); }

// ===================== TOKEN MODAL =====================

function saveToken() {
    const token = document.getElementById('githubTokenInput').value.trim();
    if (!token || !token.startsWith('ghp_')) {
        showNotification('⚠️ التوكن غير صحيح!', 'warning');
        return;
    }
    localStorage.setItem('github_token', token);
    closeTokenModal();
    showNotification('✅ تم الحفظ!', 'success');
}

function openTokenModal() {
    document.getElementById('tokenModal').classList.add('show');
    document.getElementById('githubTokenInput').value = getToken();
}
function closeTokenModal() { document.getElementById('tokenModal').classList.remove('show'); }

// ===================== CLOUD SYNC =====================

async function uploadToCloud() {
    const token = getToken();
    if (!token) { openTokenModal(); return false; }
    
    const code = getDeviceCode();
    const data = {
        c: JSON.parse(localStorage.getItem('sub_customers') || '[]'),
        s: JSON.parse(localStorage.getItem('sub_services') || '[]'),
        e: JSON.parse(localStorage.getItem('sub_expenses') || '[]')
    };
    
    try {
        const gistId = localStorage.getItem('sync_gist_id_' + code);
        const url = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';
        const method = gistId ? 'PATCH' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: `Stack Manager - ${code}`,
                public: false,
                files: { 'stack-manager-data.json': { content: JSON.stringify(data) } }
            })
        });
        
        if (!response.ok) throw new Error('فشل');
        
        const result = await response.json();
        if (!gistId) localStorage.setItem('sync_gist_id_' + code, result.id);
        
        console.log('✅ تم الرفع:', result.id);
        return true;
        
    } catch (err) {
        console.error('❌ فشل الرفع:', err);
        localStorage.setItem('sync_' + code, JSON.stringify(data));
        return true;
    }
}

async function downloadFromCloud(importCode) {
    const token = getToken();
    if (!token) { showNotification('⚠️ ادخل التوكن الأول!', 'warning'); openTokenModal(); return false; }
    
    const code = (importCode || '').trim().toUpperCase();
    if (!code || code.length !== 8) {
        showNotification('⚠️ الكود لازم يكون 8 أحرف!', 'warning');
        return false;
    }
    
    try {
        const gistId = localStorage.getItem('sync_gist_id_' + code);
        
        if (gistId) {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: { 'Authorization': `token ${token}` }
            });
            
            if (response.ok) {
                const result = await response.json();
                const data = JSON.parse(result.files['stack-manager-data.json'].content);
                return processData(data, code);
            }
        }
        
        const stored = localStorage.getItem('sync_' + code);
        if (stored) return processData(JSON.parse(stored), code);
        
        showNotification('⚠️ مفيش بيانات!', 'warning');
        return false;
        
    } catch (err) {
        showNotification('❌ فشل الاتصال!', 'danger');
        return false;
    }
}

function processData(data, code) {
    const mc = new Set(customers.map(x => x.id));
    const ms = new Set(services.map(x => x.id));
    const me = new Set(expenses.map(x => x.id));
    
    const merge = confirm(`📥 من: ${code}\nعملاء:${data.c.length} خدمات:${data.s.length}\nOK=دمج Cancel=استبدال`);
    
    if (merge) {
        data.c.forEach(x => { if (!mc.has(x.id)) customers.push(x); });
        data.s.forEach(x => { if (!ms.has(x.id)) services.push(x); });
        data.e.forEach(x => { if (!me.has(x.id)) expenses.push(x); });
    } else {
        customers = data.c; services = data.s; expenses = data.e;
    }
    
    saveData(); saveExpenses(); renderAll(); updateServicesSelect(); checkServicesEmpty();
    return true;
}

// ===================== EXPORT/IMPORT =====================

function exportData() {
    const code = getDeviceCode();
    uploadToCloud().then(success => {
        if (!success) return;
        document.getElementById('exportCode').value = code;
        navigator.clipboard.writeText(code).then(() => {
            showNotification('✅ تم النسخ: ' + code, 'success');
        });
    });
}

function importData(manualCode) {
    const code = (manualCode || document.getElementById('importCode').value || '').trim().toUpperCase();
    if (!code || code.length !== 8) {
        showNotification('⚠️ الكود لازم يكون 8 أحرف!', 'warning');
        return;
    }
    downloadFromCloud(code).then(success => {
        if (success) { showNotification('✅ تم الاستيراد!', 'success'); closeSyncModal(); }
    });
}

// ===================== QR CODE =====================

function generateQRCode() {
    const code = getDeviceCode();
    const container = document.getElementById('qrCodeDisplay');
    container.innerHTML = '';
    
    uploadToCloud().then(success => {
        if (!success) return;
        new QRCode(container, { text: code, width: 200, height: 200, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.H });
        showNotification('✅ QR Code جاهز!', 'success');
    });
}

function scanQRCode(input) {
    const file = input.files[0];
    if (!file) return;
    
    const resultDiv = document.getElementById('qrScanResult');
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            if (typeof jsQR === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
                script.onload = () => processQR(img, resultDiv);
                document.head.appendChild(script);
            } else {
                processQR(img, resultDiv);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processQR(img, resultDiv) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width; canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code) {
        resultDiv.innerHTML = `<span style="color:var(--success)">✅ تم القراءة: ${code.data}</span>`;
        document.getElementById('importCode').value = code.data;
        setTimeout(() => importData(code.data), 500);
    } else {
        resultDiv.innerHTML = `<span style="color:var(--danger)">❌ مقدرش أقرأ QR</span>`;
    }
}

// ===================== MISC =====================

function openSyncModal() {
    document.getElementById('syncModal').classList.add('show');
    document.getElementById('currentDeviceCode').textContent = getDeviceCode();
    document.getElementById('exportCode').value = '';
    document.getElementById('importCode').value = '';
    document.getElementById('qrCodeDisplay').innerHTML = '';
    document.getElementById('qrScanResult').innerHTML = '';
    document.getElementById('qrFileInput').value = '';
}

function closeSyncModal() { document.getElementById('syncModal').classList.remove('show'); }

function clearDeviceCode() {
    if (confirm('هل أنت متأكد؟')) {
        localStorage.removeItem('device_code');
        document.getElementById('currentDeviceCode').textContent = '---';
        showNotification('🔓 تم المسح', 'success');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    generateDeviceCode();
    console.log('🔄 Sync جاهز:', getDeviceCode());
});