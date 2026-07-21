// ===================== SYNC MANAGER - ربط الأجهزة (نسخة صغيرة جداً) =====================

// أبجدية قصيرة (64 حرف) - base64 معدل
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// توليد كود الجهاز: 8 أحرف فقط
function generateDeviceCode() {
    const existing = localStorage.getItem('device_code');
    if (existing) return existing;
    
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += B64.charAt(Math.floor(Math.random() * 64));
    }
    
    localStorage.setItem('device_code', code);
    return code;
}

function getDeviceCode() {
    return localStorage.getItem('device_code') || generateDeviceCode();
}

// ===================== ضغط صغير جداً =====================

// حول رقم لـ base64 قصير
function numToB64(n) {
    if (n === 0) return B64[0];
    let result = '';
    while (n > 0) {
        result = B64[n % 64] + result;
        n = Math.floor(n / 64);
    }
    return result;
}

// حول base64 لرقم
function b64ToNum(s) {
    let result = 0;
    for (let i = 0; i < s.length; i++) {
        result = result * 64 + B64.indexOf(s[i]);
    }
    return result;
}

// ضغط البيانات لأصغر حجم
function packData() {
    const c = JSON.parse(localStorage.getItem('sub_customers') || '[]');
    const s = JSON.parse(localStorage.getItem('sub_services') || '[]');
    const e = JSON.parse(localStorage.getItem('sub_expenses') || '[]');
    
    // فقط البيانات الضرورية (بدون أسماء طويلة للمفاتيح)
    const mini = {
        c: c.map(x => [x.id, x.name, x.price, x.serviceId, x.startDate, x.endDate, x.status]),
        s: s.map(x => [x.id, x.name, x.price, x.icon]),
        e: e.map(x => [x.id, x.serviceId, x.amount, x.date])
    };
    
    // JSON ثم base64 معدل
    const json = JSON.stringify(mini);
    const bytes = new TextEncoder().encode(json);
    
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
        result += B64[bytes[i] >> 2];
        result += B64[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4 || 0)];
        if (++i < bytes.length) {
            result += B64[((bytes[i] & 15) << 2) | (bytes[i + 1] >> 6 || 0)];
            if (++i < bytes.length) {
                result += B64[bytes[i] & 63];
            }
        }
    }
    
    return result;
}

// فك الضغط
function unpackData(packed) {
    const bytes = [];
    for (let i = 0; i < packed.length; i++) {
        const c1 = B64.indexOf(packed[i]);
        const c2 = B64.indexOf(packed[++i] || 'A');
        bytes.push((c1 << 2) | (c2 >> 4));
        if (i + 1 < packed.length) {
            const c3 = B64.indexOf(packed[++i] || 'A');
            bytes.push(((c2 & 15) << 4) | (c3 >> 2));
            if (i + 1 < packed.length) {
                const c4 = B64.indexOf(packed[++i] || 'A');
                bytes.push(((c3 & 3) << 6) | c4);
            }
        }
    }
    
    const json = new TextDecoder().decode(new Uint8Array(bytes));
    const mini = JSON.parse(json);
    
    // أعد البناء
    return {
        customers: (mini.c || []).map(x => ({
            id: x[0], name: x[1], price: x[2], serviceId: x[3],
            startDate: x[4], endDate: x[5], status: x[6] || 'active'
        })),
        services: (mini.s || []).map(x => ({
            id: x[0], name: x[1], price: x[2], icon: x[3], customers: 0
        })),
        expenses: (mini.e || []).map(x => ({
            id: x[0], serviceId: x[1], amount: x[2], date: x[3]
        }))
    };
}

// ===================== EXPORT/IMPORT =====================

function exportData() {
    const deviceCode = getDeviceCode();
    const packed = packData();
    
    // الكود = كود الجهاز + نقطتين + البيانات
    const exportCode = deviceCode + ':' + packed;
    
    document.getElementById('exportCode').value = exportCode;
    
    navigator.clipboard.writeText(exportCode).then(() => {
        showNotification('✅ تم النسخ! (' + exportCode.length + ' حرف)', 'success');
        playSound('success');
    }).catch(() => {
        showNotification('⚠️ انسخ يدوياً', 'warning');
    });
    
    console.log('📤 تصدير:', deviceCode, 'الطول:', exportCode.length);
}

function importData() {
    const code = document.getElementById('importCode').value.trim();
    if (!code) {
        showNotification('⚠️ الصق الكود!', 'warning');
        return;
    }
    
    try {
        const parts = code.split(':');
        if (parts.length !== 2) throw new Error('صيغة غير صحيحة');
        
        const fromDevice = parts[0];
        const packed = parts[1];
        
        const data = unpackData(packed);
        
        const stats = {
            c: data.customers.length,
            s: data.services.length,
            e: data.expenses.length
        };
        
        const merge = confirm(
            `📥 من: ${fromDevice}\n` +
            `عملاء: ${stats.c} | خدمات: ${stats.s} | مصروفات: ${stats.e}\n\n` +
            `OK = دمج | Cancel = استبدال`
        );
        
        if (merge) {
            const ec = new Set(customers.map(x => x.id));
            data.customers.forEach(x => { if (!ec.has(x.id)) customers.push(x); });
            
            const es = new Set(services.map(x => x.id));
            data.services.forEach(x => { if (!es.has(x.id)) services.push(x); });
            
            const ee = new Set(expenses.map(x => x.id));
            data.expenses.forEach(x => { if (!ee.has(x.id)) expenses.push(x); });
        } else {
            customers = data.customers;
            services = data.services;
            expenses = data.expenses;
        }
        
        saveData();
        saveExpenses();
        renderAll();
        updateServicesSelect();
        checkServicesEmpty();
        
        showNotification(`✅ تم الاستيراد! ${stats.c} عميل, ${stats.s} خدمة`, 'success');
        playSound('success');
        closeSyncModal();
        
    } catch (err) {
        console.error(err);
        showNotification('❌ كود غير صحيح!', 'danger');
    }
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

// ===================== INIT =====================

document.addEventListener('DOMContentLoaded', function() {
    generateDeviceCode();
    console.log('🔄 Sync جاهز:', getDeviceCode());
});