// events.js - Olay Dinleyicileri ve Uygulama Başlatma (Düzeltilmiş)

// data.js'den importlar
import { loadComplaints, getComplaints, addComplaint, updateComplaint, deleteComplaint, approveComplaint, rejectComplaint, addCommentToComplaint, likeComplaint, dislikeComplaint } from './data.js';
// ui.js'den importlar
import { displaySiteStats, displayLatestComplaints, displayPopularBrands, displayPricingPlans, updateComplaintList, displayComplaintDetail, clearComplaintForm, previewImage, updateAdminTable, displayBrandStats } from './ui.js';
// utils.js'den importlar
import { showToast, autoResizeTextarea, sanitizeHTML, formatDate, capitalizeFirstLetter } from './utils.js';

// DOM elemanları için konteyner (başlangıçta boş)
let DOMEvents = {};

// State yönetimi (Global scope'da)
const stateEvents = {
    complaintImageBase64: null,
    isInitialized: false,
    activeComplaintId: null, // Admin işlemleri veya detay modalı için
    currentUserId: localStorage.getItem('currentUser') || (() => {
        const newId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('currentUser', newId);
        return newId;
    })(),
    activeStep: 1, // Adım adım formda aktif adım
};

// --- YARDIMCI FONKSİYONLAR ---

/** DOM elementlerini güvenli bir şekilde al */
function getElements() {
    console.log("DOM elementleri alınıyor...");
    try {
        DOMEvents = {
            // Listeler ve Konteynerlar
            latestComplaintListContainer: document.getElementById('latestComplaintList'),
            searchResultsList: document.getElementById('searchResultsList'),
            adminTableBody: document.getElementById('adminComplaintTableBody'),
            popularBrandsListExplore: document.getElementById('popularBrandsListExplore'),

            // Modallar
            createComplaintModalEl: document.getElementById('createComplaintModal'),
            previewComplaintModalEl: document.getElementById('previewComplaintModal'),
            complaintDetailModalEl: document.getElementById('complaintDetailModal'),
            adminModalEl: document.getElementById('adminModal'),
            editComplaintModalEl: document.getElementById('editComplaintModal'),
            adminCommentModalEl: document.getElementById('adminCommentModal'),
            deleteConfirmModalEl: document.getElementById('deleteConfirmModal'),

            // Formlar ve Butonlar
            complaintForm: document.getElementById('complaintForm'),
            submitComplaintBtn: document.getElementById('submitComplaint'),
            complaintImageInput: document.getElementById('complaintImage'),
            previewComplaintBtn: document.getElementById('previewComplaintBtn'),
            adminPanelBtn: document.getElementById('adminPanelBtn'),
            searchInputExplore: document.getElementById('searchInputExplore'),
            searchButtonExplore: document.getElementById('searchButtonExplore'),
            categorySelectExplore: document.getElementById('categorySelectExplore'),
            adminSearchInput: document.getElementById('adminSearchInput'),
            adminStatusFilter: document.getElementById('adminStatusFilter'),
            adminApplyFiltersBtn: document.getElementById('adminApplyFilters'),
            saveEditedComplaintBtn: document.getElementById('saveEditedComplaint'),
            submitAdminCommentBtn: document.getElementById('submitAdminComment'),
            confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
            adminCommentTextarea: document.getElementById('adminCommentText'),
            editComplaintForm: document.getElementById('editComplaintForm'),

            // Adım adım modal için yeni referanslar
            nextStepBtns: document.querySelectorAll('.next-step'),
            prevStepBtns: document.querySelectorAll('.prev-step'),
            stepItems: document.querySelectorAll('.step-item'),
            complaintSteps: document.querySelectorAll('.complaint-step'),

            // Diğer
            descriptionTextarea: document.getElementById('complaintDescription'),
            editDescriptionTextarea: document.getElementById('editComplaintDescription'),
            themeToggleBtn: document.getElementById('themeToggle'),
            navbar: document.querySelector('.navbar.fixed-top'),
            billingToggleContainer: document.querySelector('.billing-toggle-container'),
        };
        
        // Modal elementlerinin kontrol edilmesi
        const modalIds = ['createComplaintModal', 'previewComplaintModal', 'complaintDetailModal', 'adminModal', 'editComplaintModal', 'adminCommentModal', 'deleteConfirmModal'];
        
        for (const id of modalIds) {
            const element = document.getElementById(id);
            const elementKey = `${id}El`;
            
            if (!element) {
                console.warn(`Modal element #${id} bulunamadı!`);
                // DOMEvents[elementKey] = null;
            }
        }
        
        console.log("DOM elementleri başarıyla alındı.");
        return true;
    } catch (error) {
        console.error("DOM elementleri alınırken hata:", error);
        return false;
    }
}

/** Modal kapatma yardımcı fonksiyonu - DÜZELTILDI */
const closeModal = (modalElement) => {
    if (!modalElement) {
        console.warn("closeModal: Modal elementi bulunamadı");
        return;
    }
    
    try {
        // Önce instance'ı almayı dene, yoksa null döner. Hide sadece instance varsa çağrılır.
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            console.warn(`Modal instance bulunamadı: ${modalElement.id}`);
        }
    } catch (error) {
        console.error(`Modal kapatılırken hata: ${error.message}`);
    }
};

/**
 * Temayı uygula ve localStorage'a kaydet
 * @param {string} theme 'dark' veya 'light'
 */
const applyTheme = (theme) => {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.documentElement.dataset.theme = 'dark'; // HTML root elementine data-theme ekle
        if(DOMEvents.themeToggleBtn) DOMEvents.themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.dataset.theme = 'light'; // HTML root elementine data-theme ekle
        if(DOMEvents.themeToggleBtn) DOMEvents.themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'light');
    }
    
    // Grafik temasını güncelle (ui.js'deki global fonksiyon)
    if (typeof window.updateChartsTheme === 'function') {
        window.updateChartsTheme(theme);
    }
    
    console.log(`Tema '${theme}' olarak ayarlandı`);
};

/** Navbar'ın scroll durumunu yönet */
const handleNavbarScroll = () => {
    const navbar = DOMEvents.navbar;
    if (!navbar) return;
    const heroSectionHeight = document.getElementById('hero-advanced')?.offsetHeight || 50;
    const scrollThreshold = Math.min(50, heroSectionHeight / 3);

    if (window.scrollY > scrollThreshold) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
};

/** Fiyatlandırma Toggle İşlemi */
const handleBillingToggle = (event) => {
    const target = event.target.closest('.btn, .billing-option');
    if (!target || !DOMEvents.billingToggleContainer) return;

    const billingType = target.dataset.billing;
    if (!billingType) return;

    const monthlyBtn = DOMEvents.billingToggleContainer.querySelector('.btn[data-billing="monthly"]');
    const yearlyOption = DOMEvents.billingToggleContainer.querySelector('.billing-option[data-billing="yearly"]');
    const priceElements = document.querySelectorAll('#pricingPlans .price');

    // Aktif sınıfı ayarla
    if (billingType === 'monthly') {
        monthlyBtn?.classList.add('active');
        yearlyOption?.classList.remove('active', 'fw-bold', 'text-primary');
        yearlyOption?.classList.add('text-muted');
    } else {
        monthlyBtn?.classList.remove('active');
        yearlyOption?.classList.add('active', 'fw-bold', 'text-primary');
        yearlyOption?.classList.remove('text-muted');
    }

    // Fiyatları güncelle
    priceElements.forEach(priceEl => {
        const monthlyPrice = priceEl.dataset.monthly;
        const yearlyPrice = priceEl.dataset.yearly;
        const priceSuffix = billingType === 'monthly' ? '/ay' : '/yıl';
        priceEl.innerHTML = `${billingType === 'monthly' ? monthlyPrice : yearlyPrice}<span class="small text-muted">${priceSuffix}</span>`;
    });
};


// --- ADIM ADIM FORM YÖNETİM FONKSİYONLARI ---

/**
 * Adımlar arası geçişi yönetir - TANIM BURADA
 * @param {number} currentStep Mevcut adım numarası
 * @param {number} targetStep Hedef adım numarası
 */
function switchStep(currentStep, targetStep) {
    // Tüm adımları gizle
    DOMEvents.complaintSteps.forEach(step => {
        step.style.display = 'none';
    });

    // Hedef adımı göster
    const targetStepElement = document.getElementById(`complaintStep${targetStep}`);
    if (targetStepElement) {
        targetStepElement.style.display = 'block';
    } else {
        console.error(`Hedef adım elementi bulunamadı: complaintStep${targetStep}`);
        // Hata durumunda ilk adıma dön
        const firstStepElement = document.getElementById('complaintStep1');
        if (firstStepElement) firstStepElement.style.display = 'block';
        updateProgressBar(1);
        stateEvents.activeStep = 1;
        showToast('Adım geçişinde hata oluştu.', 'Hata', 'error');
        return;
    }

    // İlerleme çubuğunu güncelle
    updateProgressBar(targetStep);

    // Aktif adımı güncelle
    stateEvents.activeStep = targetStep;

    // Textarea otomatik yüksekliği (eğer 2. adıma geçiliyorsa)
    if (targetStep === 2) {
        const textarea = DOMEvents.descriptionTextarea;
        if (textarea) {
            setTimeout(() => autoResizeTextarea(textarea), 50); // Kısa gecikme
        }
    }
}

/**
 * İlerleme çubuğunu günceller
 * @param {number} activeStep Aktif adım numarası
 */
function updateProgressBar(activeStep) {
    DOMEvents.stepItems.forEach(item => {
        const stepNum = parseInt(item.dataset.step);
        item.classList.remove('active', 'completed');
        if (stepNum === activeStep) {
            item.classList.add('active');
        } else if (stepNum < activeStep) {
            item.classList.add('completed');
        }
    });
}

/**
 * Kutucukların UI'ını (renklerini) ve kapsayıcı sınıfını güncelle
 * @param {HTMLElement} ratingBoxesElement Kapsayıcı .rating-boxes div'i
 * @param {NodeListOf<Element>} boxesNodeList İçindeki .rating-box elementleri
 * @param {number} rating Seçilen puan (1-5)
 */
function updateBoxesUI(ratingBoxesElement, boxesNodeList, rating) {
    // Önceki rating sınıflarını temizle
    ratingBoxesElement.className = ratingBoxesElement.className.replace(/current-rating-\d/g, '').trim();

    // Yeni rating sınıfını ekle (eğer rating > 0 ise)
    if (rating > 0) {
        ratingBoxesElement.classList.add(`current-rating-${rating}`);
    }

    // Kutuların 'selected' sınıfını ayarla (Fill-up etkisi)
    boxesNodeList.forEach(box => {
        const boxRating = parseInt(box.dataset.rating);
        box.classList.toggle('selected', boxRating <= rating); // `.active` YERİNE `.selected`
        // box.classList.remove('hover'); // Hover sınıfını temizle (opsiyonel)
    });
}

// Hover için kutuları vurgulama (Opsiyonel) - CSS hover'ı yeterli olabilir
function highlightBoxesUpTo(boxesNodeList, rating) {
    boxesNodeList.forEach(box => {
         const boxRating = parseInt(box.dataset.rating);
         // '.hover' sınıfını CSS'de tanımlayıp burada ekle/kaldır VEYA CSS'deki :hover'ı kullan
         // box.classList.toggle('hover', boxRating <= rating);
    });
}

/**
 * Kutucuk tabanlı puanlama sistemini başlatır ve olay dinleyicilerini ekler.
 */
function initRatingBoxes() {
    const ratingBoxesElements = document.querySelectorAll('.rating-boxes');

    ratingBoxesElements.forEach(ratingBoxes => {
        const container = ratingBoxes.querySelector('.rating-boxes-container');
        const inputElement = ratingBoxes.querySelector('.rating-input');
        if (!container || !inputElement) return;

        const boxes = container.querySelectorAll('.rating-box');

        // Mevcut değeri yükle
        const currentValue = parseInt(inputElement.value) || 0;
        if (currentValue > 0) {
            updateBoxesUI(ratingBoxes, boxes, currentValue);
        }

        // Her kutuya tıklama olayı ekle
        boxes.forEach(box => {
            box.addEventListener('click', () => {
                const rating = parseInt(box.dataset.rating);
                inputElement.value = rating; // Hidden input'u güncelle
                updateBoxesUI(ratingBoxes, boxes, rating); // Görseli güncelle

                // Validasyon geri bildirimini yönet
                const feedbackEl = ratingBoxes.querySelector('.invalid-feedback');
                if (feedbackEl) feedbackEl.style.display = 'none';
                ratingBoxes.classList.remove('is-invalid');
                inputElement.setCustomValidity('');
            });

             // Hover efekti (isteğe bağlı)
             box.addEventListener('mouseenter', () => highlightBoxesUpTo(boxes, parseInt(box.dataset.rating)));
             box.addEventListener('mouseleave', () => {
                 const currentRating = parseInt(inputElement.value) || 0;
                 highlightBoxesUpTo(boxes, currentRating); // Seçili olana geri dön
             });
        });

        // Başlangıç validasyonu
        if (inputElement.required && parseInt(inputElement.value) < 1) {
             inputElement.setCustomValidity('Lütfen bir puan seçin');
        }
    });
}

/**
 * Belirli bir adımın validasyonunu yapar
 * @param {number} stepNumber Kontrol edilecek adım numarası
 * @returns {boolean} Adım geçerli mi?
 */
function validateStep(stepNumber) {
    const form = DOMEvents.complaintForm;
    if (!form) return false;

    let isValid = true;
    form.classList.add('was-validated'); // Bootstrap validasyonunu tetikle (opsiyonel)

    switch(stepNumber) {
        case 1:
            const title = form.querySelector('#complaintTitle');
            const category = form.querySelector('#complaintCategory');
            const brand = form.querySelector('#complaintBrand');
            if (!title.checkValidity()) { title.classList.add('is-invalid'); isValid = false; } else { title.classList.remove('is-invalid'); }
            if (!category.checkValidity()) { category.classList.add('is-invalid'); isValid = false; } else { category.classList.remove('is-invalid'); }
            if (!brand.checkValidity()) { brand.classList.add('is-invalid'); isValid = false; } else { brand.classList.remove('is-invalid'); }
            if (!isValid) showToast('Lütfen Temel Bilgilerdeki zorunlu alanları doldurun.', 'Uyarı', 'warning');
            break;

        case 2:
            const description = form.querySelector('#complaintDescription');
            if (!description.checkValidity()) {
                description.classList.add('is-invalid');
                isValid = false;
                showToast('Lütfen şikayet açıklamasını girin.', 'Uyarı', 'warning');
            } else {
                description.classList.remove('is-invalid');
            }
            break;

        case 3:
            const ratingBoxesElements = form.querySelectorAll('#detailedRatings .rating-boxes');
            const termsCheck = form.querySelector('#termsCheck');
            let ratingValid = true;

            ratingBoxesElements.forEach(ratingBoxEl => {
                const input = ratingBoxEl.querySelector('.rating-input');
                const feedbackEl = ratingBoxEl.querySelector('.invalid-feedback');

                if (input && input.required && parseInt(input.value) < 1) {
                    ratingValid = false;
                    input.setCustomValidity('Lütfen bir puan seçin'); // Bootstrap için
                    ratingBoxEl.classList.add('is-invalid'); // Görsel işaretleme
                    if(feedbackEl) feedbackEl.style.display = 'block'; // Geri bildirimi göster
                } else if (input) {
                    input.setCustomValidity('');
                    ratingBoxEl.classList.remove('is-invalid');
                    if(feedbackEl) feedbackEl.style.display = 'none';
                }
            });

            if (!ratingValid) {
                 isValid = false; // Genel validasyonu da false yap
                 showToast('Lütfen tüm değerlendirme kategorilerini puanlayın.', 'Uyarı', 'warning');
            }

            if (!termsCheck.checkValidity()) {
                 isValid = false;
                 termsCheck.classList.add('is-invalid');
                 const termsFeedback = termsCheck.closest('.form-check')?.querySelector('.invalid-feedback');
                 if (termsFeedback) termsFeedback.style.display = 'block';
                 showToast('Şikayetinizi göndermek için kullanım koşullarını kabul etmelisiniz.', 'Uyarı', 'warning');
             } else {
                 termsCheck.classList.remove('is-invalid');
                 const termsFeedback = termsCheck.closest('.form-check')?.querySelector('.invalid-feedback');
                 if (termsFeedback) termsFeedback.style.display = 'none';
             }
            break;
    }

    if (!isValid) {
         form.classList.add('was-validated'); // Genel form için de ekle
    } else {
         // Adım geçerliyse was-validated kaldırılabilir veya bırakılabilir
         // form.classList.remove('was-validated');
    }

    return isValid;
}


/**
 * Adım adım şikayet formunu başlatır (listener ekler)
 */
function initStepForm() {
    // Next butonlarına olay dinleyicisi ekle
    DOMEvents.nextStepBtns?.forEach(button => {
        button.addEventListener('click', function() {
            const currentStep = parseInt(this.dataset.step);
            if (validateStep(currentStep)) { // Önce validasyon
                switchStep(currentStep, currentStep + 1); // Sonra geçiş
            }
        });
    });

    // Geri butonlarına olay dinleyicisi ekle
    DOMEvents.prevStepBtns?.forEach(button => {
        button.addEventListener('click', function() {
            const currentStep = parseInt(this.dataset.step);
            switchStep(currentStep, currentStep - 1); // Geri giderken validasyon yok
        });
    });

    // Puanlama sistemini başlat
    initRatingBoxes();
}

// --- ANA İŞLEMLER VE OLAY YÖNETİCİLERİ ---

/**
 * Şikayet gönderme işlemini yönetir
 */
function handleComplaintSubmission() {
    const form = DOMEvents.complaintForm;
    if (!form) return;

    // Son adımı ve genel formu kontrol et
    if (!validateStep(3)) { // Son adımın validasyonu önemli
        showToast('Lütfen formdaki eksik veya hatalı alanları düzeltin.', 'Form Hatası', 'warning');
        return;
    }

    // Form verilerini topla
    const formData = {
        title: form.querySelector('#complaintTitle')?.value.trim() ?? '',
        category: form.querySelector('#complaintCategory')?.value ?? '',
        brand: form.querySelector('#complaintBrand')?.value.trim() ?? '',
        description: form.querySelector('#complaintDescription')?.value.trim() ?? '',
        ratings: {}
    };
    form.querySelectorAll('#detailedRatings .rating-input').forEach(input => {
        const key = input.dataset.ratingKey;
        const value = parseInt(input.value);
        if (key && !isNaN(value) && value >= 1 && value <= 5) {
            formData.ratings[key] = value;
        }
    });

    // data.js'den addComplaint fonksiyonunu çağır
    const newComplaint = addComplaint(
        formData.title, formData.category, formData.description, formData.brand,
        stateEvents.complaintImageBase64, stateEvents.currentUserId, formData.ratings
    );

    if (newComplaint) {
        showToast('Şikayetiniz başarıyla alındı ve admin onayına gönderildi.', 'Başarılı', 'success');
        clearComplaintForm(); // ui.js fonksiyonu
        stateEvents.complaintImageBase64 = null;
        closeModal(DOMEvents.createComplaintModalEl);

        // UI'ı güncelle
        updateAdminTable(getComplaints()); // Admin tablosunu yenile
        displayLatestComplaints(5); // Slider'ı yenile
        displaySiteStats(); // İstatistikleri yenile
        displayPopularBrands(5); // Popüler markaları yenile

    } else {
        showToast('Şikayet gönderilirken bir hata oluştu.', 'Hata', 'danger');
    }
}

/**
 * Şikayet önizleme modalını gösterir - DÜZELTILDI
 */
function showComplaintPreview() {
    const form = DOMEvents.complaintForm;
    const previewBody = document.getElementById('previewComplaintBody');
    const previewModalEl = DOMEvents.previewComplaintModalEl;
    
    if (!form || !previewBody || !previewModalEl) {
        showToast('Önizleme gösterilemiyor (Eksik elementler).', 'Hata', 'error');
        console.error("Önizleme için gerekli elementler bulunamadı:", {
            form: !!form,
            previewBody: !!previewBody,
            previewModalEl: !!previewModalEl
        });
        return;
    }

    const formData = {
        title: form.querySelector('#complaintTitle')?.value.trim() ?? '',
        category: form.querySelector('#complaintCategory')?.value ?? '',
        brand: form.querySelector('#complaintBrand')?.value.trim() ?? '',
        description: form.querySelector('#complaintDescription')?.value.trim() ?? '',
        ratings: {}
    };
    form.querySelectorAll('#detailedRatings .rating-input').forEach(input => {
        const key = input.dataset.ratingKey;
        const value = parseInt(input.value);
        if (key && !isNaN(value) && value >= 1 && value <= 5) formData.ratings[key] = value;
    });

    if (!formData.title || !formData.category || !formData.brand || !formData.description) {
        return showToast('Önizleme için lütfen zorunlu alanları doldurun.', 'Eksik Bilgi', 'warning');
    }

    // Puanlama HTML'ini oluştur (ui.js'deki benzer mantık kullanılabilir)
    const ratingsHtml = Object.entries(formData.ratings)
        .map(([category, rating]) => {
            const percentage = (rating / 5) * 100;
            const progressBarColor = percentage >= 80 ? 'bg-success' : percentage >= 50 ? 'bg-warning' : 'bg-danger';
            return `
                <div class="mb-2 rating-detail-row">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small fw-500">${sanitizeHTML(category)}</span>
                        <span class="small text-muted">${rating}/5</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar ${progressBarColor}" role="progressbar" style="width: ${percentage}%;" aria-valuenow="${rating}" aria-valuemin="0" aria-valuemax="5"></div>
                    </div>
                </div>`;
        }).join('');

    previewBody.innerHTML = `
        <h4 class="mb-2">${sanitizeHTML(formData.title)}</h4>
        <p class="mb-1"><strong>Marka:</strong> ${sanitizeHTML(formData.brand)}</p>
        <p class="mb-2"><strong>Kategori:</strong> <span class="badge bg-secondary">${sanitizeHTML(formData.category)}</span></p>
        <h6>Açıklama</h6>
        <p class="border p-2 rounded bg-light mb-3" style="white-space: pre-wrap;">${sanitizeHTML(formData.description)}</p>
        <h6>Değerlendirmeler</h6>
        <div class="mb-3 p-2 border rounded bg-light">${ratingsHtml || '<p class="text-muted small mb-0">Puanlama yapılmamış.</p>'}</div>
        <hr>
        <h6>Görsel</h6>
        ${stateEvents.complaintImageBase64
            ? `<img src="${stateEvents.complaintImageBase64}" alt="Şikayet Görseli Önizlemesi" class="img-fluid img-thumbnail" style="max-height: 250px;">`
            : '<p class="text-muted small">Görsel eklenmemiş.</p>'}
    `;

    // Modal Gösterme - DÜZELTILDI
    try {
        let previewModal = bootstrap.Modal.getInstance(previewModalEl);
        if (!previewModal) {
            previewModal = new bootstrap.Modal(previewModalEl);
        }
        previewModal.show();
        console.log("Önizleme modalı başarıyla gösterildi.");
    } catch (error) {
        console.error("Önizleme modalı gösterilirken hata:", error.message);
        showToast('Önizleme modalı açılamadı: ' + error.message, 'Hata', 'error');
    }
}

/** Admin tablosu aksiyonları - DÜZELTILDI */
const handleAdminTableActions = (e) => {
    const targetButton = e.target.closest('button[data-id]');
    if (!targetButton) return;

    const complaintId = parseInt(targetButton.dataset.id);
    if (isNaN(complaintId)) {
        console.error("Geçersiz şikayet ID'si:", targetButton.dataset.id);
        return;
    }

    const complaint = getComplaints().find(c => c.id === complaintId);
    if (!complaint) {
        showToast('Şikayet bulunamadı!', 'Hata', 'error');
        return;
    }

    stateEvents.activeComplaintId = complaintId; // Aktif ID'yi sakla

    // Güvenli Modal Gösterme Yöntemi - DÜZELTILDI
    const showSafeModal = (modalElement) => {
        if(!modalElement) {
            console.error(`Modal elementi bulunamadı!`);
            return null;
        }
        
        try {
            console.log(`Modal açılıyor: ${modalElement.id}`);
            let modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (!modalInstance) {
                console.log(`${modalElement.id} için yeni modal instance oluşturuluyor...`);
                modalInstance = new bootstrap.Modal(modalElement, {
                    backdrop: 'static', // İsteğe bağlı, dışarı tıklanınca kapanmaması için
                    keyboard: true // ESC tuşu ile kapanabilir
                });
            }
            modalInstance.show();
            console.log(`${modalElement.id} modalı başarıyla gösterildi.`);
            return modalInstance;
        } catch (error) {
            console.error(`Modal gösterilirken hata: ${error.message}`);
            showToast(`Modal açılamadı: ${error.message}`, 'Hata', 'error');
            return null;
        }
    };

    if (targetButton.classList.contains('view-btn')) {
        displayComplaintDetail(complaint, 'admin', stateEvents.currentUserId);
        showSafeModal(DOMEvents.complaintDetailModalEl);

    } else if (targetButton.classList.contains('approve-btn')) {
        if (approveComplaint(complaintId)) {
            showToast('Şikayet onaylandı.', 'Başarılı', 'success');
            updateAdminTable(getComplaints());
            displayLatestComplaints(5);
            displaySiteStats();
        } else { showToast('Onaylama başarısız.', 'Hata', 'warning'); }

    } else if (targetButton.classList.contains('reject-btn')) {
        if (confirm(`"${complaint.title || complaintId}" başlıklı ONAY BEKLEYEN şikayeti reddedip SİLMEK istediğinizden emin misiniz?`)) {
            if (rejectComplaint(complaintId)) {
                showToast('Şikayet reddedildi ve silindi.', 'Başarılı', 'success');
                updateAdminTable(getComplaints());
                displaySiteStats();
            } else { showToast('Reddetme başarısız.', 'Hata', 'error'); }
        }

    } else if (targetButton.classList.contains('edit-btn')) {
        const form = DOMEvents.editComplaintForm;
        const modalElement = DOMEvents.editComplaintModalEl;
        
        if (!form || !modalElement) {
            showToast('Düzenleme formu veya modalı bulunamadı.', 'Hata', 'error');
            return;
        }
        
        form.querySelector('#editComplaintId').value = complaint.id;
        form.querySelector('#editComplaintTitle').value = complaint.title || '';
        form.querySelector('#editComplaintCategory').value = complaint.category || '';
        form.querySelector('#editComplaintBrand').value = complaint.brand || '';
        form.querySelector('#editComplaintDescription').value = complaint.description || '';
        const statusSelect = form.querySelector('#editComplaintStatus');
        if (statusSelect) {
            statusSelect.value = complaint.status || 'Açık';
            statusSelect.disabled = !!complaint.pendingApproval; // Onay bekleyeni düzenleme
        }
        form.classList.remove('was-validated'); // Önceki validasyonu temizle
        showSafeModal(modalElement);

    } else if (targetButton.classList.contains('delete-btn')) {
        const modalElement = DOMEvents.deleteConfirmModalEl;
        if(!modalElement) {
            showToast('Silme onay modalı bulunamadı.', 'Hata', 'error');
            return;
        }
        modalElement.querySelector('#deleteComplaintId').value = complaint.id;
        modalElement.querySelector('#deleteComplaintIdDisplay').textContent = complaint.id;
        modalElement.querySelector('#deleteComplaintTitleDisplay').textContent = complaint.title || 'Başlıksız';
        showSafeModal(modalElement);

    } else if (targetButton.classList.contains('comment-btn')) {
         const modalElement = DOMEvents.adminCommentModalEl;
         if(!modalElement) {
            showToast('Yorum modalı bulunamadı.', 'Hata', 'error');
            return;
         }
         const textarea = modalElement.querySelector('#adminCommentText');
         if (textarea) textarea.value = '';
         showSafeModal(modalElement);
    }
};

/** Admin paneli filtreleme işlemi */
const applyAdminFilters = () => {
    const searchTerm = DOMEvents.adminSearchInput?.value || '';
    const statusFilter = DOMEvents.adminStatusFilter?.value || '';
    updateAdminTable(getComplaints(), searchTerm, statusFilter); // ui.js fonksiyonu
};


// --- ANA BAŞLATMA VE OLAY DİNLEYİCİLERİ ---

/** Uygulama başlatma fonksiyonu - DÜZELTILDI */
function init() {
    if (stateEvents.isInitialized) return;
    console.log("Uygulama başlatılıyor...");

    // DOM elementlerini al (DOMContentLoaded içinde çağrıldığından emin ol)
    if (!getElements()) {
        console.error("DOM elementleri alınamadı! Uygulama başlatılamıyor.");
        return;
    }

    // Initialize bootstrap components and modals if needed
    console.log("Bootstrap modalları başlatılıyor...");
    const modalElements = [
        'createComplaintModal', 'previewComplaintModal', 'complaintDetailModal', 
        'adminModal', 'editComplaintModal', 'adminCommentModal', 'deleteConfirmModal'
    ];
    
    modalElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            try {
                // Just initialize the modal
                new bootstrap.Modal(element);
                console.log(`${id} modalı başarıyla başlatıldı.`);
            } catch (error) {
                console.warn(`${id} modalı başlatılırken hata: ${error.message}`);
            }
        } else {
            console.warn(`${id} modal elementi bulunamadı.`);
        }
    });

    loadComplaints();
    displaySiteStats();
    displayLatestComplaints(5);
    displayPopularBrands(5);
    // displayPricingPlans(); // Bu ui.js'de kalabilir veya burada çağrılabilir
    initEventListeners();
    initStepForm(); // Adım adım formu başlat (listener'ları ekler)

    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);
    handleNavbarScroll();
    window.addEventListener('scroll', handleNavbarScroll);

    stateEvents.isInitialized = true;
    console.log("Uygulama başarıyla başlatıldı.");
}

/** Tüm olay dinleyicilerini bağlama fonksiyonu - DÜZELTILDI */
function initEventListeners() {
    console.log("Olay dinleyicileri bağlanıyor...");

    // Şikayet Ekleme
    if (DOMEvents.submitComplaintBtn) {
        DOMEvents.submitComplaintBtn.addEventListener('click', handleComplaintSubmission);
        console.log("Şikayet gönderme butonu olayı bağlandı.");
    }
    
    if (DOMEvents.complaintImageInput) {
        DOMEvents.complaintImageInput.addEventListener('change', (e) => {
            previewImage(e, (base64) => { stateEvents.complaintImageBase64 = base64; });
        });
        console.log("Resim yükleme olayı bağlandı.");
    }
    
    if (DOMEvents.previewComplaintBtn) {
        DOMEvents.previewComplaintBtn.addEventListener('click', () => {
            console.log("Önizleme butonu tıklandı.");
            showComplaintPreview();
        });
        console.log("Önizleme butonu olayı bağlandı.");
    }
    
    if (DOMEvents.descriptionTextarea) {
        DOMEvents.descriptionTextarea.addEventListener('input', () => autoResizeTextarea(DOMEvents.descriptionTextarea));
        console.log("Açıklama alanı auto-resize olayı bağlandı.");
    }

    // Explore Arama/Filtre
    if (DOMEvents.searchButtonExplore) {
        DOMEvents.searchButtonExplore.addEventListener('click', () => {
            console.log("Arama butonu tıklandı.");
            updateComplaintList(getComplaints(), DOMEvents.searchInputExplore?.value, DOMEvents.categorySelectExplore?.value, stateEvents.currentUserId);
        });
        console.log("Arama butonu olayı bağlandı.");
    }
    
    if (DOMEvents.searchInputExplore) {
        DOMEvents.searchInputExplore.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                updateComplaintList(getComplaints(), DOMEvents.searchInputExplore.value, DOMEvents.categorySelectExplore?.value, stateEvents.currentUserId);
            }
        });
        console.log("Arama input olayı bağlandı.");
    }
    
    if (DOMEvents.categorySelectExplore) {
        DOMEvents.categorySelectExplore.addEventListener('change', () => {
             updateComplaintList(getComplaints(), DOMEvents.searchInputExplore?.value, DOMEvents.categorySelectExplore.value, stateEvents.currentUserId);
        });
        console.log("Kategori filtresi olayı bağlandı.");
    }

    // Admin Paneli
    if (DOMEvents.adminModalEl) {
        DOMEvents.adminModalEl.addEventListener('show.bs.modal', () => {
            console.log("Admin modalı açılıyor, filtreler uygulanıyor.");
            applyAdminFilters();
        });
        console.log("Admin modal show olayı bağlandı.");
    }
    
    if (DOMEvents.adminTableBody) {
        DOMEvents.adminTableBody.addEventListener('click', (e) => {
            handleAdminTableActions(e);
        });
        console.log("Admin tablo click olayı bağlandı.");
    }
    
    if (DOMEvents.adminApplyFiltersBtn) {
        DOMEvents.adminApplyFiltersBtn.addEventListener('click', () => {
            applyAdminFilters();
        });
        console.log("Admin filtre butonu olayı bağlandı.");
    }
    
    if (DOMEvents.adminSearchInput) {
        DOMEvents.adminSearchInput.addEventListener('keypress', (e) => { 
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                applyAdminFilters(); 
            } 
        });
        console.log("Admin arama input olayı bağlandı.");
    }
    
    if (DOMEvents.adminStatusFilter) {
        DOMEvents.adminStatusFilter.addEventListener('change', () => {
            applyAdminFilters();
        });
        console.log("Admin durum filtresi olayı bağlandı.");
    }

    // Düzenleme Modalı
    if (DOMEvents.saveEditedComplaintBtn) {
        DOMEvents.saveEditedComplaintBtn.addEventListener('click', () => {
            console.log("Düzenleme kaydet butonu tıklandı.");
            const form = DOMEvents.editComplaintForm;
            const complaintId = parseInt(form?.querySelector('#editComplaintId')?.value);
            if (!form || isNaN(complaintId)) return;
            form.classList.add('was-validated'); // Validasyonu göster
            if (!form.checkValidity()) {
                return showToast('Lütfen düzenleme formundaki zorunlu alanları doldurun.', 'Eksik Bilgi', 'warning');
            }

            const updatedData = {
                title: form.querySelector('#editComplaintTitle')?.value.trim(),
                category: form.querySelector('#editComplaintCategory')?.value,
                brand: form.querySelector('#editComplaintBrand')?.value.trim(),
                description: form.querySelector('#editComplaintDescription')?.value.trim(),
                status: form.querySelector('#editComplaintStatus')?.value
            };

            if (updateComplaint(complaintId, updatedData)) {
                showToast('Şikayet başarıyla güncellendi.', 'Başarılı', 'success');
                closeModal(DOMEvents.editComplaintModalEl);
                updateAdminTable(getComplaints());
                // Açık olan detay modalını da güncelle
                if (DOMEvents.complaintDetailModalEl && 
                    bootstrap.Modal.getInstance(DOMEvents.complaintDetailModalEl) && 
                    DOMEvents.complaintDetailModalEl?.classList.contains('show') && 
                    stateEvents.activeComplaintId === complaintId) {
                     const updatedComplaint = getComplaints().find(c => c.id === complaintId);
                     if(updatedComplaint) displayComplaintDetail(updatedComplaint, 'admin', stateEvents.currentUserId);
                }
            } else {
                showToast('Güncelleme başarısız oldu.', 'Hata', 'error');
            }
        });
        console.log("Düzenleme kaydet butonu olayı bağlandı.");
    }
    
    if (DOMEvents.editDescriptionTextarea) {
        DOMEvents.editDescriptionTextarea.addEventListener('input', () => autoResizeTextarea(DOMEvents.editDescriptionTextarea));
        console.log("Düzenleme açıklama alanı auto-resize olayı bağlandı.");
    }

    // Admin Yorum Modalı
    if (DOMEvents.submitAdminCommentBtn) {
        DOMEvents.submitAdminCommentBtn.addEventListener('click', () => {
            console.log("Admin yorum gönder butonu tıklandı.");
            const commentText = DOMEvents.adminCommentTextarea?.value.trim();
            const complaintId = stateEvents.activeComplaintId;
            if (!commentText) return showToast('Lütfen bir yorum/not yazın.', 'Uyarı', 'warning');
            if (!complaintId) return showToast('Yorum yapılacak şikayet ID bulunamadı.', 'Hata', 'error');

            if (addCommentToComplaint(complaintId, commentText, 'admin')) {
                showToast('Admin yorumu/notu eklendi.', 'Başarılı', 'success');
                closeModal(DOMEvents.adminCommentModalEl);
                // Açık olan detay modalını da güncelle
                if (DOMEvents.complaintDetailModalEl && 
                    bootstrap.Modal.getInstance(DOMEvents.complaintDetailModalEl) && 
                    DOMEvents.complaintDetailModalEl?.classList.contains('show') && 
                    stateEvents.activeComplaintId === complaintId) {
                     const updatedComplaint = getComplaints().find(c => c.id === complaintId);
                     if(updatedComplaint) displayComplaintDetail(updatedComplaint, 'admin', stateEvents.currentUserId);
                }
            } else { showToast('Yorum eklenemedi.', 'Hata', 'error'); }
        });
        console.log("Admin yorum gönder butonu olayı bağlandı.");
    }

    // Silme Onay Modalı
    if (DOMEvents.confirmDeleteBtn) {
        DOMEvents.confirmDeleteBtn.addEventListener('click', () => {
            console.log("Sil onay butonu tıklandı.");
            const complaintId = parseInt(document.getElementById('deleteComplaintId')?.value);
            if (isNaN(complaintId)) return showToast('Silinecek şikayet ID bulunamadı.', 'Hata', 'error');

            if (deleteComplaint(complaintId)) {
                showToast('Şikayet başarıyla silindi.', 'Başarılı', 'success');
                closeModal(DOMEvents.deleteConfirmModalEl);
                updateAdminTable(getComplaints());
                displayLatestComplaints(5);
                displaySiteStats();
                // Arama sonuçlarını da güncelle (opsiyonel)
                if (DOMEvents.searchInputExplore?.value) {
                    updateComplaintList(getComplaints(), DOMEvents.searchInputExplore.value, DOMEvents.categorySelectExplore?.value || '', stateEvents.currentUserId);
                }
            } else { showToast('Silme işlemi başarısız oldu.', 'Hata', 'error'); }
        });
        console.log("Silme onay butonu olayı bağlandı.");
    }

    // Tema Değiştirme
    if (DOMEvents.themeToggleBtn) {
        DOMEvents.themeToggleBtn.addEventListener('click', () => {
            const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
            applyTheme(newTheme);
        });
        console.log("Tema değiştirme butonu olayı bağlandı.");
    }

    // Fiyatlandırma Toggle
    if (DOMEvents.billingToggleContainer) {
        DOMEvents.billingToggleContainer.addEventListener('click', (e) => handleBillingToggle(e));
        console.log("Fiyatlandırma toggle olayı bağlandı.");
    }

    // Smooth Scroll
    document.querySelectorAll('a.nav-link[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.length > 1 && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    const navbarHeight = DOMEvents.navbar?.offsetHeight || 70;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
                    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                    if (targetId === 'explore') {
                        setTimeout(() => DOMEvents.searchInputExplore?.focus({ preventScroll: true }), 300);
                    }
                }
            }
        });
    });
    console.log("Smooth scroll olayları bağlandı.");

    // Şikayet Ekleme Modalı Kapanınca Sıfırla
    if (DOMEvents.createComplaintModalEl) {
        DOMEvents.createComplaintModalEl.addEventListener('hidden.bs.modal', function () {
            console.log("Şikayet ekleme modalı kapandı, form sıfırlanıyor.");
            clearComplaintForm(); // ui.js fonksiyonu çağır
            stateEvents.complaintImageBase64 = null; // Görsel state'i sıfırla
            // Puanlama kutularını ve state'i de sıfırlamak iyi olur (clearComplaintForm içinde yapılabilir veya burada)
             const form = DOMEvents.complaintForm;
             if(form){
                 form.querySelectorAll('.rating-input').forEach(input => input.value = '0');
                 form.querySelectorAll('.rating-boxes').forEach(rb => rb.className = rb.className.replace(/current-rating-\d/g, '').trim());
                 form.querySelectorAll('.rating-box.selected').forEach(box => box.classList.remove('selected'));
             }
             switchStep(stateEvents.activeStep, 1); // İlk adıma dön
        });
        console.log("Şikayet ekleme modalı kapanma olayı bağlandı.");
    }

    console.log("Olay dinleyicileri başarıyla bağlandı.");
}

// --- Uygulamayı Başlat ---
// DOMContentLoaded event listener'ını burada tutuyoruz
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM içeriği yüklendi, uygulama başlatılıyor...");
    init();
});

// Global API'yi dışa aç (gerektiğinde)
window.appEvents = {
    init,
    initEventListeners,
    showComplaintPreview,
    handleAdminTableActions
};