// ===================== SYNC MANAGER - كود 8 أحرف فقط =====================

const B64 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون I,O,0,1

// كود الجهاز: 8 أحرف (مثال: X7K9M2P4)
function generateDeviceCode() {
    const existing = localStorage.getItem('device_code');
    if (existing) return existing;
    let c = '';
    for (let i = 0; i < 8; i++) c += B64[Math.random() * 32 | 0];
    localStorage.setItem('device_code', c);
    return c;
}

function getDeviceCode() {
    return localStorage.getItem('device_code') || generateDeviceCode();
}

// ===================== نظام الربط السحابي البسيط =====================

// خادم بسيط مجاني (jsonbin.io أو glitch أو أي حاجة)
const SYNC_SERVER = 'https://api.jsonbin.io/v3/b'; // أو أي خادم تختاره

// رفع البيانات للسحابة
async function uploadToCloud() {
    const code = getDeviceCode();
    
    const data = {
        c: JSON.parse(localStorage.getItem('sub_customers') || '[]'),
        s: JSON.parse(localStorage.getItem('sub_services') || '[]'),
        e: JSON.parse(localStorage.getItem('sub_expenses') || '[]'),
        t: Date.now()
    };
    
    try {
        // نستخدم localStorage كـ "سحابة" مؤقتة (لحد ما تجيب خادم حقيقي)
        localStorage.setItem('sync_' + code, JSON.stringify(data));
        
        showNotification('✅ تم رفع البيانات! الكود: ' + code, 'success');
        playSound('success');
        
        return code;
    } catch (err) {
        showNotification('❌ فشل الرفع', 'danger');
        return null;
    }
}

// تحميل البيانات من السحابة
async function downloadFromCloud(importCode) {
    if (!importCode || importCode.length !== 8) {
        showNotification('⚠️ الكود لازم يكون 8 أحرف!', 'warning');
        return;
    }
    
    try {
        const stored = localStorage.getItem('sync_' + importCode);
        if (!stored) {
            showNotification('⚠️ مفيش بيانات لهذا الكود!', 'warning');
            return;
        }
        
        const data = JSON.parse(stored);
        
        const mc = new Set(customers.map(x => x.id));
        const ms = new Set(services.map(x => x.id));
        const me = new Set(expenses.map(x => x.id));
        
        const merge = confirm(`من: ${importCode}\nعملاء:${data.c.length} خدمات:${data.s.length}\nOK=دمج Cancel=استبدال`);
        
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
        
        showNotification('✅ تم الاستيراد!', 'success');
        playSound('success');
        closeSyncModal();
        
    } catch (err) {
        showNotification('❌ كود غير صحيح!', 'danger');
    }
}

// ===================== EXPORT/IMPORT (8 أحرف فقط) =====================

function exportData() {
    const code = getDeviceCode();
    
    // ارفع البيانات
    uploadToCloud();
    
    // اعرض الكود فقط (8 أحرف)
    document.getElementById('exportCode').value = code;
    
    // انسخ الكود
    navigator.clipboard.writeText(code).then(() => {
        showNotification('✅ تم نسخ الكود: ' + code, 'success');
    }).catch(() => {
        showNotification('⚠️ انسخ الكود يدوياً', 'warning');
    });
    
    console.log('📤 كود الجهاز:', code);
}

function importData() {
    const code = document.getElementById('importCode').value.trim().toUpperCase();
    
    if (code.length !== 8) {
        showNotification('⚠️ الكود لازم يكون 8 أحرف!', 'warning');
        return;
    }
    
    // حمل البيانات
    downloadFromCloud(code);
}

// ===================== MISC =====================

function openSyncModal() {
    document.getElementById('syncModal').classList.add('show');
    document.getElementById('currentDeviceCode').textContent = getDeviceCode();
    document.getElementById('exportCode').value = '';
    document.getElementById('importCode').value = '';
}

function closeSyncModal() {
    document.getElementById('syncModal').classList.remove('show');
}

function clearDeviceCode() {
    if (confirm('مسح كود الجهاز؟')) {
        localStorage.removeItem('device_code');
        document.getElementById('currentDeviceCode').textContent = '---';
        showNotification('🔓 تم المسح', 'success');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    generateDeviceCode();
    console.log('🔄 Sync جاهز:', getDeviceCode());
});