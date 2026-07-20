// ===================== SYNC MANAGER - ربط الأجهزة =====================

// توليد كود فريد للجهاز
function generateDeviceCode() {
    const existing = localStorage.getItem('device_code');
    if (existing) return existing;
    
    const code = 'SM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('device_code', code);
    return code;
}

// احصل على كود الجهاز الحالي
function getDeviceCode() {
    return localStorage.getItem('device_code') || generateDeviceCode();
}

// افتح مودال الربط
function openSyncModal() {
    document.getElementById('syncModal').classList.add('show');
    document.getElementById('currentDeviceCode').textContent = getDeviceCode();
    document.getElementById('exportCode').value = '';
    document.getElementById('importCode').value = '';
}

// اقفل مودال الربط
function closeSyncModal() {
    document.getElementById('syncModal').classList.remove('show');
}

// تصدير البيانات (نسخ كود)
function exportData() {
    const data = {
        customers: JSON.parse(localStorage.getItem('sub_customers') || '[]'),
        services: JSON.parse(localStorage.getItem('sub_services') || '[]'),
        expenses: JSON.parse(localStorage.getItem('sub_expenses') || '[]'),
        settings: JSON.parse(localStorage.getItem('sub_settings') || '{}'),
        version: '2.1.0',
        exportedAt: new Date().toISOString(),
        fromDevice: getDeviceCode()
    };
    
    // ضغط البيانات
    const jsonStr = JSON.stringify(data);
    const compressed = btoa(unescape(encodeURIComponent(jsonStr)));
    
    // اعرض الكود
    document.getElementById('exportCode').value = compressed;
    
    // انسخ للكليب بورد
    navigator.clipboard.writeText(compressed).then(() => {
        showNotification('✅ تم نسخ كود النقل! الصقه في الجهاز التاني', 'success');
        playSound('success');
    }).catch(() => {
        showNotification('⚠️ انسخ الكود يدوياً من المربع فوق', 'warning');
    });
}

// استيراد البيانات
function importData() {
    const code = document.getElementById('importCode').value.trim();
    
    if (!code) {
        showNotification('⚠️ الصق الكود الأول!', 'warning');
        return;
    }
    
    try {
        // فك الضغط
        const jsonStr = decodeURIComponent(escape(atob(code)));
        const data = JSON.parse(jsonStr);
        
        // تحقق من البيانات
        if (!data.customers || !data.services) {
            throw new Error('كود غير صحيح');
        }
        
        // دمج البيانات (أو استبدال)
        const merge = confirm(
            `📥 بيانات جهاز: ${data.fromDevice || 'unknown'}\n` +
            `• عملاء: ${data.customers.length}\n` +
            `• خدمات: ${data.services.length}\n` +
            `• مصروفات: ${(data.expenses || []).length}\n\n` +
            `اضغط OK عشان تدمج مع بياناتك الحالية\n` +
            `Cancel عشان تستبدل كل البيانات`
        );
        
        if (merge) {
            // دمج: تجنب التكرار بالـ ID
            const existingIds = new Set(customers.map(c => c.id));
            data.customers.forEach(c => {
                if (!existingIds.has(c.id)) customers.push(c);
            });
            
            const existingServiceIds = new Set(services.map(s => s.id));
            data.services.forEach(s => {
                if (!existingServiceIds.has(s.id)) services.push(s);
            });
            
            const existingExpenseIds = new Set(expenses.map(e => e.id));
            (data.expenses || []).forEach(e => {
                if (!existingExpenseIds.has(e.id)) expenses.push(e);
            });
        } else {
            // استبدال
            customers = data.customers;
            services = data.services;
            expenses = data.expenses || [];
        }
        
        // حفظ
        saveData();
        saveExpenses();
        
        // تحديث UI
        renderAll();
        updateServicesSelect();
        checkServicesEmpty();
        
        showNotification(
            `✅ تم الاستيراد! العملاء: ${customers.length} | الخدمات: ${services.length}`,
            'success'
        );
        playSound('success');
        
        closeSyncModal();
        
    } catch (err) {
        console.error('❌ خطأ في الاستيراد:', err);
        showNotification('❌ كود غير صحيح أو تالف!', 'danger');
    }
}

// فك ربط الجهاز (مسح الكود)
function clearDeviceCode() {
    if (confirm('هل أنت متأكد؟ هيتم مسح كود الجهاز بس، البيانات هتفضل موجودة.')) {
        localStorage.removeItem('device_code');
        document.getElementById('currentDeviceCode').textContent = '---';
        showNotification('🔓 تم فك ربط الجهاز', 'success');
    }
}

// ===================== BACKUP AUTO (نسخ احتياطي تلقائي) =====================

// حفظ نسخة احتياطية
function createBackup() {
    const backup = {
        customers: JSON.parse(localStorage.getItem('sub_customers') || '[]'),
        services: JSON.parse(localStorage.getItem('sub_services') || '[]'),
        expenses: JSON.parse(localStorage.getItem('sub_expenses') || '[]'),
        settings: JSON.parse(localStorage.getItem('sub_settings') || '{}'),
        timestamp: new Date().toISOString()
    };
    
    const backups = JSON.parse(localStorage.getItem('sub_backups') || '[]');
    backups.push(backup);
    
    // احتفظ بآخر 10 نسخ فقط
    if (backups.length > 10) backups.shift();
    
    localStorage.setItem('sub_backups', JSON.stringify(backups));
}

// استرجاع نسخة احتياطية
function restoreBackup(index) {
    const backups = JSON.parse(localStorage.getItem('sub_backups') || '[]');
    if (!backups[index]) return false;
    
    const backup = backups[index];
    customers = backup.customers;
    services = backup.services;
    expenses = backup.expenses || [];
    
    saveData();
    saveExpenses();
    renderAll();
    
    return true;
}

// نسخ احتياطي تلقائي كل يوم
function scheduleAutoBackup() {
    const lastBackup = localStorage.getItem('sub_last_backup');
    const today = new Date().toDateString();
    
    if (lastBackup !== today) {
        createBackup();
        localStorage.setItem('sub_last_backup', today);
        console.log('💾 نسخة احتياطية تلقائية تم إنشاؤها');
    }
}

// ===================== EXPORT/IMPORT JSON =====================

// تصدير ملف JSON
function exportJSONFile() {
    const data = {
        customers,
        services,
        expenses,
        settings: JSON.parse(localStorage.getItem('sub_settings') || '{}'),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `stack-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('✅ تم تحميل ملف النسخ الاحتياطي', 'success');
}

// استيراد ملف JSON
function importJSONFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('استيراد الملف هيدمج البيانات مع الموجودة. متأكد؟')) {
                // دمج البيانات
                const existingCustomerIds = new Set(customers.map(c => c.id));
                data.customers?.forEach(c => {
                    if (!existingCustomerIds.has(c.id)) customers.push(c);
                });
                
                const existingServiceIds = new Set(services.map(s => s.id));
                data.services?.forEach(s => {
                    if (!existingServiceIds.has(s.id)) services.push(s);
                });
                
                const existingExpenseIds = new Set(expenses.map(e => e.id));
                data.expenses?.forEach(e => {
                    if (!existingExpenseIds.has(e.id)) expenses.push(e);
                });
                
                saveData();
                saveExpenses();
                renderAll();
                
                showNotification('✅ تم استيراد الملف بنجاح!', 'success');
            }
        } catch (err) {
            showNotification('❌ ملف غير صالح!', 'danger');
        }
    };
    
    reader.readAsText(file);
}

// ===================== INIT =====================

document.addEventListener('DOMContentLoaded', function() {
    // تأكد إن كود الجهاز موجود
    generateDeviceCode();
    
    // نسخ احتياطي تلقائي
    scheduleAutoBackup();
    
    console.log('🔄 Sync Manager جاهز - كود الجهاز:', getDeviceCode());
});