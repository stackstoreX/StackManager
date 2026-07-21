// ===================== SYNC MANAGER - QR Code فقط =====================

const B64 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// ===================== ضغط/فك البيانات =====================

function packData() {
    const data = {
        c: JSON.parse(localStorage.getItem('sub_customers') || '[]'),
        s: JSON.parse(localStorage.getItem('sub_services') || '[]'),
        e: JSON.parse(localStorage.getItem('sub_expenses') || '[]')
    };
    const json = JSON.stringify(data);
    let result = '';
    const bytes = new TextEncoder().encode(json);
    for (let i = 0; i < bytes.length; i += 3) {
        const b1 = bytes[i], b2 = bytes[i+1] || 0, b3 = bytes[i+2] || 0;
        result += B64[b1 >> 2];
        result += B64[((b1 & 3) << 4) | (b2 >> 4)];
        result += B64[((b2 & 15) << 2) | (b3 >> 6)];
        result += B64[b3 & 63];
    }
    const pad = (3 - bytes.length % 3) % 3;
    return result.slice(0, result.length - pad);
}

function unpackData(str) {
    const pad = (4 - str.length % 4) % 4;
    str += 'A'.repeat(pad);
    
    const bytes = [];
    for (let i = 0; i < str.length; i += 4) {
        const c1 = B64.indexOf(str[i]), c2 = B64.indexOf(str[i+1]);
        const c3 = B64.indexOf(str[i+2] || 'A'), c4 = B64.indexOf(str[i+3] || 'A');
        bytes.push((c1 << 2) | (c2 >> 4));
        if (str[i+2] !== 'A') bytes.push(((c2 & 15) << 4) | (c3 >> 2));
        if (str[i+3] !== 'A') bytes.push(((c3 & 3) << 6) | c4);
    }
    
    const cleanBytes = bytes.slice(0, bytes.length - pad);
    const json = new TextDecoder().decode(new Uint8Array(cleanBytes));
    return JSON.parse(json);
}

// ===================== QR Code (يحتوي على البيانات!) =====================

function generateQRCode() {
    const container = document.getElementById('qrCodeDisplay');
    container.innerHTML = '';
    
    const packed = packData();
    
    new QRCode(container, {
        text: packed,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
    });
    
    showNotification('✅ QR Code جاهز! امسحه من الجهاز التاني', 'success');
    console.log('📦 حجم البيانات:', packed.length, 'حرف');
}

// ===================== مسح QR Code =====================

function scanQRCode(input) {
    const file = input.files[0];
    if (!file) return;
    
    const resultDiv = document.getElementById('qrScanResult');
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المسح...';
    
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
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code) {
        resultDiv.innerHTML = `<span style="color:var(--success)">✅ تم القراءة!</span>`;
        
        try {
            const data = unpackData(code.data.trim());
            processData(data, 'QR Code');
        } catch (err) {
            resultDiv.innerHTML = `<span style="color:var(--danger)">❌ QR Code قديم أو تالف</span>`;
        }
    } else {
        resultDiv.innerHTML = `<span style="color:var(--danger)">❌ مقدرش أقرأ QR Code</span>`;
    }
}

// ===================== نسخ/لصق يدوي (احتياطي) =====================

function exportData() {
    const packed = packData();
    document.getElementById('exportCode').value = packed;
    
    navigator.clipboard.writeText(packed).then(() => {
        showNotification('✅ تم نسخ البيانات! (' + packed.length + ' حرف)', 'success');
    }).catch(() => {
        showNotification('⚠️ انسخ يدوياً', 'warning');
    });
}

function importData() {
    const packed = document.getElementById('importCode').value.trim();
    
    if (!packed) {
        showNotification('⚠️ الصق البيانات الأول!', 'warning');
        return;
    }
    
    try {
        const data = unpackData(packed);
        processData(data, 'كود يدوي');
    } catch (err) {
        showNotification('❌ الكود غير صحيح أو تالف!', 'danger');
    }
}

// ===================== معالجة البيانات =====================

function processData(data, source) {
    const mc = new Set(customers.map(x => x.id));
    const ms = new Set(services.map(x => x.id));
    const me = new Set(expenses.map(x => x.id));
    
    const merge = confirm(
        `📥 من: ${source}\n` +
        `• عملاء: ${data.c.length}\n` +
        `• خدمات: ${data.s.length}\n` +
        `• مصروفات: ${data.e.length}\n\n` +
        `OK = دمج مع بياناتك | Cancel = استبدال الكل`
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
    
    showNotification('✅ تم الاستيراد بنجاح!', 'success');
    closeSyncModal();
}

// ===================== MISC =====================

function openSyncModal() {
    document.getElementById('syncModal').classList.add('show');
    document.getElementById('exportCode').value = '';
    document.getElementById('importCode').value = '';
    document.getElementById('qrCodeDisplay').innerHTML = '';
    document.getElementById('qrScanResult').innerHTML = '';
    document.getElementById('qrFileInput').value = '';
}

function closeSyncModal() { 
    document.getElementById('syncModal').classList.remove('show'); 
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Sync Manager جاهز');
});