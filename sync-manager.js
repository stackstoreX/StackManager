// ===================== SYNC MANAGER - كود 8 أحرف =====================

const B64 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// كود الجهاز: 8 أحرف بالظبط (SM- + 5 حروف)
function generateDeviceCode() {
    const existing = localStorage.getItem('device_code');
    if (existing) return existing;
    let c = 'SM-';
    for (let i = 0; i < 5; i++) c += B64[Math.random() * 32 | 0];
    localStorage.setItem('device_code', c);
    return c;
}

function getDeviceCode() {
    return localStorage.getItem('device_code') || generateDeviceCode();
}

// ===================== QR CODE =====================

// توليد QR Code
function generateQRCode() {
    const code = getDeviceCode();
    const container = document.getElementById('qrCodeDisplay');
    
    // امسح القديم
    container.innerHTML = '';
    
    // ارفع البيانات الأول
    uploadToCloud().then(success => {
        if (!success) {
            showNotification('❌ فشل رفع البيانات', 'danger');
            return;
        }
        
        // توليد QR Code
        new QRCode(container, {
            text: code,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        showNotification('✅ تم توليد QR Code!', 'success');
    });
}

// مسح QR Code من صورة
function scanQRCode(input) {
    const file = input.files[0];
    if (!file) return;
    
    const resultDiv = document.getElementById('qrScanResult');
    resultDiv.innerHTML = '<div class="qr-scan-overlay"><i class="fas fa-spinner fa-spin" style="color: var(--success); font-size: 30px;"></i></div>';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            readQRWithJsQR(img, resultDiv);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// قراءة QR باستخدام jsQR
function readQRWithJsQR(img, resultDiv) {
    if (typeof jsQR === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
        script.onload = () => processQRImage(img, resultDiv);
        document.head.appendChild(script);
    } else {
        processQRImage(img, resultDiv);
    }
}

function processQRImage(img, resultDiv) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code) {
        resultDiv.innerHTML = `<div style="color: var(--success);"><i class="fas fa-check-circle"></i> تم القراءة: ${code.data}</div>`;
        
        // حط الكود في حقل الاستيراد
        document.getElementById('importCode').value = code.data;
        
        // استورد تلقائياً
        setTimeout(() => importData(code.data), 500);
    } else {
        resultDiv.innerHTML = `<div style="color: var(--danger);"><i class="fas fa-times-circle"></i> مقدرش أقرأ QR Code، جرب كود يدوي</div>`;
    }
}

// ===================== CLOUD SYNC =====================

async function uploadToCloud() {
    const code = getDeviceCode();
    const data = {
        c: JSON.parse(localStorage.getItem('sub_customers') || '[]'),
        s: JSON.parse(localStorage.getItem('sub_services') || '[]'),
        e: JSON.parse(localStorage.getItem('sub_expenses') || '[]'),
        t: Date.now()
    };
    
    try {
        localStorage.setItem('sync_' + code, JSON.stringify(data));
        return true;
    } catch (err) {
        console.error('❌ فشل الرفع:', err);
        return false;
    }
}

async function downloadFromCloud(importCode) {
    // ✅ التحقق من الكود: لازم يكون 8 أحرف (مثال: SM-34U9PV)
    if (!importCode || importCode.length !== 8) {
        showNotification('⚠️ الكود لازم يكون 8 أحرف!', 'warning');
        return false;
    }
    
    try {
        const stored = localStorage.getItem('sync_' + importCode);
        if (!stored) {
            showNotification('⚠️ مفيش بيانات لهذا الكود!', 'warning');
            return false;
        }
        
        const data = JSON.parse(stored);
        
        const mc = new Set(customers.map(x => x.id));
        const ms = new Set(services.map(x => x.id));
        const me = new Set(expenses.map(x => x.id));
        
        const merge = confirm(
            `📥 من: ${importCode}\n` +
            `• عملاء: ${data.c.length}\n` +
            `• خدمات: ${data.s.length}\n` +
            `• مصروفات: ${data.e.length}\n\n` +
            `OK = دمج | Cancel = استبدال`
        );
        
        if (merge) {
            data.c.forEach(x => { if (!mc.has(x.id)) customers.push(x); });
            data.s.forEach(x => { if (!ms.has(x.id)) services.push(x); });
            data.e.forEach(x => { if (!me.has(x.id)) expenses.push(x); });
        } else {
            customers = data.c;
            services = data.s;
            expenses = data.e;
        }
        
        saveData();
        saveExpenses();
        renderAll();
        updateServicesSelect();
        checkServicesEmpty();
        
        return true;
        
    } catch (err) {
        console.error('❌ خطأ:', err);
        return false;
    }
}

// ===================== EXPORT/IMPORT =====================

function exportData() {
    const code = getDeviceCode();
    
    uploadToCloud().then(success => {
        if (!success) {
            showNotification('❌ فشل رفع البيانات', 'danger');
            return;
        }
        
        document.getElementById('exportCode').value = code;
        
        navigator.clipboard.writeText(code).then(() => {
            showNotification('✅ تم النسخ: ' + code, 'success');
            playSound('success');
        }).catch(() => {
            showNotification('⚠️ انسخ يدوياً', 'warning');
        });
    });
}

function importData(manualCode) {
    // ✅ نظف الكود: شيل المسافات وحول لـ uppercase
    let code = (manualCode || document.getElementById('importCode').value || '').trim().toUpperCase();
    
    console.log('📥 استيراد الكود:', code, 'الطول:', code.length);
    
    // ✅ التحقق: لازم يكون 8 أحرف بالظبط
    if (!code) {
        showNotification('⚠️ أدخل الكود الأول!', 'warning');
        return;
    }
    
    if (code.length !== 8) {
        showNotification('⚠️ الكود لازم يكون 8 أحرف! (الكود الحالي: ' + code.length + ' حرف)', 'warning');
        console.log('❌ طول الكود غير صحيح:', code.length, 'الكود:', code);
        return;
    }
    
    // ✅ تحقق إن الكود بيبدأ بـ SM-
    if (!code.startsWith('SM-')) {
        showNotification('⚠️ كود غير صحيح! لازم يبدأ بـ SM-', 'warning');
        return;
    }
    
 async function downloadFromCloud(importCode) {
    // ✅ نظف الكود
    const code = (importCode || '').trim().toUpperCase();
    
    console.log('☁️ تحميل من السحابة:', code);
    
    if (!code) {
        showNotification('⚠️ أدخل الكود!', 'warning');
        return false;
    }
    
    if (code.length !== 8) {
        showNotification('⚠️ الكود لازم يكون 8 أحرف!', 'warning');
        return false;
    }
    
    try {
        const stored = localStorage.getItem('sync_' + code);
        if (!stored) {
            showNotification('⚠️ مفيش بيانات لهذا الكود: ' + code, 'warning');
            return false;
        }
        
        const data = JSON.parse(stored);
        
        const mc = new Set(customers.map(x => x.id));
        const ms = new Set(services.map(x => x.id));
        const me = new Set(expenses.map(x => x.id));
        
        const merge = confirm(
            `📥 من: ${code}\n` +
            `• عملاء: ${data.c.length}\n` +
            `• خدمات: ${data.s.length}\n` +
            `• مصروفات: ${data.e.length}\n\n` +
            `OK = دمج | Cancel = استبدال`
        );
        
        if (merge) {
            data.c.forEach(x => { if (!mc.has(x.id)) customers.push(x); });
            data.s.forEach(x => { if (!ms.has(x.id)) services.push(x); });
            data.e.forEach(x => { if (!me.has(x.id)) expenses.push(x); });
        } else {
            customers = data.c;
            services = data.s;
            expenses = data.e;
        }
        
        saveData();
        saveExpenses();
        renderAll();
        updateServicesSelect();
        checkServicesEmpty();
        
        return true;
        
    } catch (err) {
        console.error('❌ خطأ:', err);
        showNotification('❌ كود غير صحيح أو تالف!', 'danger');
        return false;
    }
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

function closeSyncModal() {
    document.getElementById('syncModal').classList.remove('show');
}

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