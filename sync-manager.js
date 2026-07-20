// ===================== SYNC MANAGER - ربط الأجهزة =====================

const SYNC_KEY = 'sub_sync_code';
const SYNC_DATA = 'sub_sync_data';

function generateDeviceCode() {
    return 'SS-' + Math.random().toString(36).substring(2, 8).toUpperCase() + 
           '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getDeviceCode() {
    let code = localStorage.getItem(SYNC_KEY);
    if (!code) {
        code = generateDeviceCode();
        localStorage.setItem(SYNC_KEY, code);
    }
    return code;
}

function openSyncModal() {
    try {
        const modal = document.getElementById('syncModal');
        const currentDeviceCode = document.getElementById('currentDeviceCode');
        
        if (modal) modal.classList.add('show');
        if (currentDeviceCode) currentDeviceCode.textContent = getDeviceCode();
    } catch (err) {
        console.error('خطأ في openSyncModal:', err);
    }
}

function closeSyncModal() {
    try {
        const modal = document.getElementById('syncModal');
        if (modal) modal.classList.remove('show');
    } catch (err) {
        console.error('خطأ في closeSyncModal:', err);
    }
}

function exportData() {
    try {
        const data = {
            customers: typeof customers !== 'undefined' ? customers : [],
            services: typeof services !== 'undefined' ? services : [],
            expenses: typeof expenses !== 'undefined' ? expenses : [],
            settings: typeof settings !== 'undefined' ? settings : {},
            deviceCode: getDeviceCode(),
            exportedAt: new Date().toISOString()
        };
        
        const json = JSON.stringify(data);
        // ✅ دعم النص العربي في Base64
        let encoded;
        try {
            encoded = btoa(unescape(encodeURIComponent(json)));
        } catch (e) {
            encoded = btoa(json);
        }
        
        const exportCode = document.getElementById('exportCode');
        if (exportCode) {
            exportCode.value = encoded;
            exportCode.select();
        }
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(encoded).then(() => {
                if (typeof showNotification === 'function') {
                    showNotification('✅ الكود اتنسخ! الصقه في الجهاز التاني', 'success');
                } else {
                    alert('✅ الكود اتنسخ!');
                }
            }).catch(() => {
                if (typeof showNotification === 'function') {
                    showNotification('⚠️ انسخ الكود يدوياً', 'warning');
                }
            });
        }
        
        return encoded;
    } catch (err) {
        console.error('خطأ في exportData:', err);
        if (typeof showNotification === 'function') {
            showNotification('❌ حصل خطأ في تصدير البيانات', 'danger');
        }
    }
}

function importData() {
    try {
        const importCodeEl = document.getElementById('importCode');
        if (!importCodeEl) return;
        
        const code = importCodeEl.value.trim();
        
        if (!code) {
            if (typeof showNotification === 'function') {
                showNotification('⚠️ الصق الكود الأول', 'warning');
            }
            return;
        }
        
        let decoded;
        try {
            // ✅ فك تشفير النص العربي
            decoded = decodeURIComponent(escape(atob(code)));
        } catch (e) {
            decoded = atob(code);
        }
        
        const data = JSON.parse(decoded);
        
        if (!data.customers || !data.services) {
            if (typeof showNotification === 'function') {
                showNotification('❌ الكود غير صحيح', 'danger');
            }
            return;
        }
        
        if (typeof customers !== 'undefined') customers = data.customers;
        if (typeof services !== 'undefined') services = data.services;
        if (typeof expenses !== 'undefined') expenses = data.expenses || [];
        if (typeof settings !== 'undefined') settings = data.settings || {};
        
        if (typeof saveData === 'function') saveData();
        if (typeof saveExpenses === 'function') saveExpenses();
        localStorage.setItem('sub_settings', JSON.stringify(settings || {}));
        
        if (typeof renderAll === 'function') renderAll();
        if (typeof updateServicesSelect === 'function') updateServicesSelect();
        
        if (typeof showNotification === 'function') {
            showNotification('✅ البيانات اتنقلت بنجاح!', 'success');
        }
        if (typeof playSound === 'function') playSound('success');
        
        importCodeEl.value = '';
        closeSyncModal();
        
    } catch (err) {
        console.error('خطأ في importData:', err);
        if (typeof showNotification === 'function') {
            showNotification('❌ الكود غلط أو تالف', 'danger');
        }
    }
}

function clearDeviceCode() {
    try {
        if (confirm('هل أنت متأكد؟ هتفقد الوصول من الجهاز ده')) {
            localStorage.removeItem(SYNC_KEY);
            if (typeof showNotification === 'function') {
                showNotification('🗑️ تم مسح ربط الجهاز', 'success');
            }
            closeSyncModal();
        }
    } catch (err) {
        console.error('خطأ في clearDeviceCode:', err);
    }
}