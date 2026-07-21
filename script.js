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
let swRegistration = null;
let pushEnabled = localStorage.getItem('sub_push_enabled') === 'true';

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', function() {
    updateServicesSelect();
    checkServicesEmpty();
    renderAll();
    initCalendars();
    initExpenseCalendar();
    initPushNotifications();  // <-- ضيف السطر ده
    
    setTimeout(() => checkExpiringSubscriptions(), 2000);
    setInterval(() => checkExpiringSubscriptions(), 60000);
    
    scheduleDailyCheck();  // <-- ضيف السطر ده
    
    updateSoundIcon();
    updatePushIcon();  // <-- ضيف السطر ده
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
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('⚠️ المتصفح لا يدعم الإشعارات');
        return;
    }

    navigator.serviceWorker.register('service-worker.js')
        .then((registration) => {
            swRegistration = registration;
            console.log('✅ Service Worker مسجل');
            
            // 🔴 فعل الإشعارات تلقائي أول ما يدخل
            autoEnablePush();
        })
        .catch((err) => {
            console.error('❌ فشل تسجيل Service Worker:', err);
        });

    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NAVIGATE') {
            showSection('expiring');
        }
    });
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
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'subscription-alert',
        requireInteraction: true,
        dir: 'rtl',
        lang: 'ar',
        vibrate: [200, 100, 200],
        actions: [
            { action: 'open-expiring', title: 'عرض الاشتراكات' },
            { action: 'dismiss', title: 'لاحقاً' }
        ],
        data: { url: '/#expiring' },
        ...options
    };

    try {
        if (swRegistration) {
            swRegistration.showNotification(title, defaultOptions);
            console.log('✅ إشعار اتبعت عبر Service Worker');
        } else {
            new Notification(title, defaultOptions);
            console.log('✅ إشعار اتبعت عبر Notification API');
        }
    } catch (err) {
        console.error('❌ فشل إرسال الإشعار:', err);
    }
}

function testPushNotificationNow() {
    console.log('🧪 testPushNotificationNow اتنادت');
    
    if (!pushEnabled || Notification.permission !== 'granted') {
        showNotification('⚠️ فعل الإشعارات الأول من الزرار اللي فوق', 'warning');
        return;
    }

    // إشعار تجريبي
    sendLocalNotification(
        '🔔 إشعار تجريبي!',
        'الإشعارات شغالة! ده شكل الإشعار اللي هيجيلك لما يجي معاد التجديد.',
        { tag: 'test-notification', requireInteraction: true }
    );

    showNotification('✅ إشعار تجريبي اتبعت! شوف شريط الإشعارات', 'success');
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
    
    container.innerHTML = `
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

// ===================== NOTIFICATIONS & SOUND =====================
function showNotification(message, type = 'success') {
    const panel = document.getElementById('notificationPanel');
    const notif = document.createElement('div');
    notif.className = 'notification ' + type;
    
    const icons = {
        success: '✅',
        warning: '⚠️',
        danger: '🚨'
    };
    
    notif.innerHTML = `
        <div class="notification-icon">${icons[type] || 'ℹ️'}</div>
        <div class="notification-content">
            <h4>${type === 'success' ? 'تم بنجاح' : type === 'warning' ? 'تنبيه' : 'تنبيه مهم'}</h4>
            <p>${message}</p>
        </div>
    `;
    
    panel.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideInLeft 0.4s ease reverse';
        setTimeout(() => notif.remove(), 400);
    }, 5000);
}

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
    
    customers.forEach(customer => {
        const endDate = new Date(customer.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.round((endDate - today) / (1000 * 60 * 60 * 24));
        
        // ينتهي بكرة
        if (diffDays === 1 && customer.status !== 'completed') {
            showNotification(`⏰ اشتراك ${customer.name} ينتهي غداً!`, 'warning');
            playSound('alert');
            expiringTomorrow.push(customer);
        }
        
        // ينتهي اليوم
        if (diffDays === 0 && customer.status !== 'completed') {
            showNotification(`⚠️ اشتراك ${customer.name} ينتهي اليوم!`, 'warning');
            playSound('alert');
            expiringToday.push(customer);
        }
        
        // انتهى
        if (diffDays < 0 && customer.status !== 'completed') {
            showNotification(`🚨 اشتراك ${customer.name} انتهى!`, 'danger');
            playSound('alert');
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
    
    // تحقق من كل عنصر قبل ما تستخدمه
    const nameInput = document.getElementById('merchantName');
    if (nameInput) nameInput.value = settings.merchantName || '';
    
    const emailInput = document.getElementById('merchantEmail');
    if (emailInput) emailInput.value = settings.merchantEmail || '';
    
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
        container.innerHTML = `
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