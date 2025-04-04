// events.js - Olay Dinleyicileri ve Uygulama Başlatma (Güncellenmiş)

import { getComplaints, addComplaint, addCommentToComplaint, approveComplaint, rejectComplaint, likeComplaint,  dislikeComplaint,  updateComplaint,   deleteComplaint } from './data.js';
import { updateComplaintList,  displayComplaintDetail,  updateAdminTable,  displayPopularBrands,  setupBrandAndFilterButtonEvents,  previewImage,  clearComplaintForm,   displayPricingPlans, displaySiteStats,  displayLatestComplaints } from './ui.js';
import { showToast, autoResizeTextarea, sanitizeHTML } from './utils.js';

// Mevcut kullanıcıyı simüle et veya localStorage'dan al
const currentUserId = localStorage.getItem('currentUser') || (() => {
    const newId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('currentUser', newId);
    return newId;
})();

// State yönetimi
const state = {
    complaintImageBase64: null,
    isInitialized: false,
    currentSearchTerm: '',
    activeComplaintId: null
};

// DOM elemanlarını bir kez al ve sakla
const DOM = {
    complaintList: document.getElementById('complaintList'), // Ana şikayet listesi (belki slider?)
    // searchButton: document.getElementById('searchButton'), // Eski/Kullanılmayan?
    // companySearch: document.getElementById('companySearch'), // Eski/Kullanılmayan?
    complaintForm: document.getElementById('complaintForm'),
    submitComplaintBtn: document.getElementById('submitComplaint'),
    complaintImage: document.getElementById('complaintImage'),
    adminTableBody: document.getElementById('adminComplaintTableBody'),
    adminModal: document.getElementById('adminModal'),
    createComplaintModal: document.getElementById('createComplaintModal'),
    previewComplaintBtn: document.getElementById('previewComplaintBtn'),
    previewComplaintModal: document.getElementById('previewComplaintModal'),
    complaintDetailModal: document.getElementById('complaintDetailModal'),
    descriptionTextarea: document.getElementById('complaintDescription'),
    complaintExplorerSection: document.getElementById('complaint-explorer-section') // Bu ID explore-section ile aynı mı?
};

// Animasyon fonksiyonu
const animateCSS = (element, animation, prefix = 'animate__') =>
    new Promise((resolve, reject) => {
        const animationName = `${prefix}${animation}`;
        const node = element;

        node.classList.add(`${prefix}animated`, animationName);

        function handleAnimationEnd(event) {
            event.stopPropagation();
            node.classList.remove(`${prefix}animated`, animationName);
            resolve('Animation ended');
        }

        node.addEventListener('animationend', handleAnimationEnd, {once: true});
    });

// Hero section animasyonlarını başlat
const initHeroAnimations = () => {
    const heroTitle = document.querySelector('.hero-section h1'); // #hero-advanced içindeki h1 daha spesifik olabilir
    const heroLead = document.querySelector('.hero-section .lead'); // #hero-advanced içindeki .hero-subtitle
    const heroButtons = document.querySelector('.hero-section .d-flex'); // #hero-advanced içindeki button container
    const heroStats = document.querySelector('.hero-section .text-muted'); // #hero-advanced içindeki .hero-stats

    if (heroTitle) animateCSS(heroTitle, 'fadeInDown');
    if (heroLead) animateCSS(heroLead, 'fadeIn');
    if (heroButtons) animateCSS(heroButtons, 'fadeIn');
    if (heroStats) animateCSS(heroStats, 'fadeIn');
};

// Genel durum güncelleme fonksiyonu (Belki sadece arama için?)
const updateDynamicUI = (searchTerm = undefined, options = { fullUpdate: false }) => {
    const complaints = getComplaints();

    // Bu fonksiyon hem genel arama hem de explore arama için mi kullanılacak?
    // Eğer öyleyse, hangi liste güncellenecek? (DOM.complaintList vs searchResultsList)
    // Şimdilik sadece Explore için updateComplaintList çağrılıyor.
    if (searchTerm !== undefined) {
        state.currentSearchTerm = searchTerm;
        // updateComplaintList çağrısı events.js içinde yapılıyor.
        // updateComplaintList(complaints, searchTerm, currentUserId);
    } else {
        // Belki başlangıç yüklemesi için?
        // updateComplaintList(complaints, state.currentSearchTerm, currentUserId);
    }

    if (options.fullUpdate) {
        updateAdminTable(complaints);
        displayPopularBrands(5);
        displaySiteStats();
        displayLatestComplaints(3);
    }
};

// Modal kapatma yardımcı fonksiyonu
const closeModal = (modalElement) => {
    if (!modalElement) return;
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    modalInstance?.hide();
};

// Form doğrulama yardımcı fonksiyonu
const validateForm = (form, ratings) => {
    if (!form) return false; // Form yoksa false dön

    let isValid = form.checkValidity(); // HTML5 validasyonunu kontrol et

    // Rating selectlerini kontrol et
    let ratingValid = true;
    Object.values(ratings).forEach(select => {
        if (!select) return; // Select yoksa atla
        const value = parseInt(select.value, 10);
        if (!value || value < 1 || value > 5) { // Değer boş, 0 veya geçersizse
            select.classList.add('is-invalid');
            const feedback = select.nextElementSibling;
            if (feedback?.classList.contains('invalid-feedback')) {
                feedback.style.display = 'block';
            }
            ratingValid = false;
        } else {
            select.classList.remove('is-invalid');
            const feedback = select.nextElementSibling;
            if (feedback?.classList.contains('invalid-feedback')) {
                feedback.style.display = 'none';
            }
        }
    });

    if (!isValid || !ratingValid) {
         form.classList.add('was-validated'); // Bootstrap validasyon stillerini göster
        if (!ratingValid) {
            showToast('Lütfen tüm değerlendirme alanlarını 1-5 arasında puanlayın.', 'Eksik Bilgi', 'warning');
        } else {
            showToast('Lütfen tüm zorunlu alanları doldurun.', 'Eksik Bilgi', 'warning');
        }
        return false;
    }

    form.classList.remove('was-validated'); // Geçerliyse validasyon stillerini kaldır
    return true;
};


// Puanlama HTML'i oluşturmak için yardımcı fonksiyon (ui.js'de benzeri var, hangisi kullanılacak?)
const generateRatingsHtml = (ratings) => {
    if (!ratings || typeof ratings !== 'object') return '<p class="text-muted small">Puanlama bilgisi yok.</p>';

    const validRatings = Object.entries(ratings).filter(([_, rating]) => {
        const numRating = Number(rating);
        return !isNaN(numRating) && numRating >= 1 && numRating <= 5;
    });

    if (validRatings.length === 0) {
        return '<p class="text-muted small">Henüz geçerli puanlama yapılmamış.</p>';
    }

    return validRatings.map(([category, rating]) => {
        const percentage = (Number(rating) / 5) * 100;
        return `
            <div class="mb-2">
                <div class="d-flex justify-content-between align-items-center small mb-1">
                    <span>${sanitizeHTML(category)}</span><span>${Number(rating)}/5</span>
                </div>
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-success"
                         style="width: ${percentage}%;"
                         role="progressbar"
                         aria-valuenow="${Number(rating)}"
                         aria-valuemin="0"
                         aria-valuemax="5"></div>
                </div>
            </div>`;
    }).join('');
};

// Beğeni/Beğenmeme işlemleri için yardımcı fonksiyon (ui.js'de benzeri var, hangisi kullanılacak?)
const handleLikeDislike = async (complaintId, action) => {
    if (isNaN(complaintId)) return;
    try {
        const module = await import('./data.js'); // Dinamik import
        const success = action === 'like'
            ? module.likeComplaint(complaintId, currentUserId)
            : module.dislikeComplaint(complaintId, currentUserId);

        if (success) {
            showToast(
                action === 'like' ? 'Beğeni güncellendi.' : 'Beğenmeme güncellendi.',
                'Başarılı',
                'success'
            );
            // UI güncellemesi ui.js'deki listener içinde yapılıyor. Burada tekrar çağırmaya gerek yok.
            // updateDynamicUI(document.getElementById('searchInputExplore')?.value); // Veya hangi arama aktifse?
        } else {
            showToast(
                action === 'like' ? 'Beğeni işlemi başarısız oldu.' : 'Beğenmeme işlemi başarısız oldu.',
                'Hata',
                'error'
            );
        }
    } catch (error) {
         console.error(`${action} hatası:`, error);
         showToast('İşlem sırasında bir hata oluştu.', 'Hata', 'error');
    }
};


// Şikayet gönderme işlemi için yardımcı fonksiyon
const handleComplaintSubmission = () => {
    const form = DOM.complaintForm;
    if (!form) return;

    const formElements = {
        title: form.querySelector('#complaintTitle'),
        category: form.querySelector('#complaintCategory'),
        brand: form.querySelector('#complaintBrand'),
        description: form.querySelector('#complaintDescription'),
        ratings: {
            hizmet: form.querySelector('#ratingHizmet'),
            urunKalitesi: form.querySelector('#ratingUrunKalitesi'),
            iletisim: form.querySelector('#ratingIletisim'),
            teslimat: form.querySelector('#ratingTeslimat'),
            fiyat: form.querySelector('#ratingFiyat')
        }
    };

    // Null check for rating elements
    const ratingsForValidation = {};
    Object.entries(formElements.ratings).forEach(([key, element]) => {
        if (element) ratingsForValidation[key] = element;
    });


    if (!validateForm(form, ratingsForValidation)) return;

    const formData = {
        title: sanitizeHTML(formElements.title?.value?.trim() ?? ''),
        brand: sanitizeHTML(formElements.brand?.value?.trim() ?? ''),
        category: formElements.category?.value ?? '',
        description: sanitizeHTML(formElements.description?.value?.trim() ?? ''),
        ratings: {
            Hizmet: parseInt(formElements.ratings.hizmet?.value, 10) || 0, // Default to 0 if NaN or missing
            "Ürün Kalitesi": parseInt(formElements.ratings.urunKalitesi?.value, 10) || 0,
            İletişim: parseInt(formElements.ratings.iletisim?.value, 10) || 0,
            Teslimat: parseInt(formElements.ratings.teslimat?.value, 10) || 0,
            Fiyat: parseInt(formElements.ratings.fiyat?.value, 10) || 0,
        }
    };

     // Tekrar kontrol: En az bir zorunlu alan eksikse veya ratinglerden biri 0 ise
     if (!formData.title || !formData.brand || !formData.category || !formData.description ||
         Object.values(formData.ratings).some(r => r === 0)) {
         validateForm(form, ratingsForValidation); // Hataları tekrar göster
         return;
     }


    try {
        const newComplaint = addComplaint(
            formData.title,
            formData.category,
            formData.description,
            formData.brand,
            state.complaintImageBase64,
            currentUserId,
            formData.ratings
        );

        if (newComplaint) {
            showToast('Şikayetiniz admin onayına gönderildi.', 'Başarılı', 'success');
            clearComplaintForm();
            state.complaintImageBase64 = null;
            closeModal(DOM.createComplaintModal);
             // Tam UI güncellemesi gerekli (admin tablosu, istatistikler vs.)
             updateDynamicUI(undefined, { fullUpdate: true });
             // Ayrıca Explore listesini de güncellemek gerekebilir (eğer gösteriliyorsa)
             const exploreInput = document.getElementById('searchInputExplore');
             if (exploreInput && exploreInput.value.trim()) {
                 updateComplaintList(getComplaints(), exploreInput.value.trim(), currentUserId);
             } else {
                 // Slider'ı güncellemek için? Veya sadece fullUpdate yeterli mi?
                  displayLatestComplaints(3); // Slider'ı yenile
             }
        } else {
            throw new Error('Şikayet eklenemedi (data.js null döndürdü).');
        }
    } catch (error) {
        console.error("Şikayet ekleme hatası:", error);
        showToast(`Şikayet eklenemedi: ${error.message}`, 'Hata', 'error');
    }
};

// Şikayet önizleme için yardımcı fonksiyon
const showComplaintPreview = () => {
    const form = DOM.complaintForm;
    if (!form) return;

    const formData = {
        title: form.querySelector('#complaintTitle')?.value.trim() ?? '',
        category: form.querySelector('#complaintCategory')?.value ?? '',
        brand: form.querySelector('#complaintBrand')?.value.trim() ?? '',
        description: form.querySelector('#complaintDescription')?.value.trim() ?? '',
        ratings: {
            Hizmet: parseInt(form.querySelector('#ratingHizmet')?.value, 10) || 0,
            "Ürün Kalitesi": parseInt(form.querySelector('#ratingUrunKalitesi')?.value, 10) || 0,
            İletişim: parseInt(form.querySelector('#ratingIletisim')?.value, 10) || 0,
            Teslimat: parseInt(form.querySelector('#ratingTeslimat')?.value, 10) || 0,
            Fiyat: parseInt(form.querySelector('#ratingFiyat')?.value, 10) || 0,
        }
    };

    // Zorunlu alan kontrolü
    if (!formData.title || !formData.category || !formData.brand || !formData.description) {
        showToast('Önizleme için lütfen Başlık, Kategori, Marka ve Açıklama alanlarını doldurun.', 'Eksik Bilgi', 'warning');
        // Hatalı alanları göstermek için validasyon tetiklenebilir
        form.classList.add('was-validated');
        // Özellikle boş alanlara is-invalid ekleyebiliriz
         if (!formData.title) form.querySelector('#complaintTitle')?.classList.add('is-invalid');
         if (!formData.category) form.querySelector('#complaintCategory')?.classList.add('is-invalid');
         if (!formData.brand) form.querySelector('#complaintBrand')?.classList.add('is-invalid');
         if (!formData.description) form.querySelector('#complaintDescription')?.classList.add('is-invalid');
        return;
    }

    // Puanlama HTML'ini oluştur (events.js içindeki yardımcı fonksiyonu kullan)
    const ratingsHtml = generateRatingsHtml(formData.ratings);
    const previewBody = document.getElementById('previewComplaintBody');

    if (previewBody) {
        previewBody.innerHTML = `
            <h4 class="mb-2">${sanitizeHTML(formData.title)}</h4>
            <p class="mb-1"><strong>Marka:</strong> ${sanitizeHTML(formData.brand)}</p>
            <p class="mb-2"><strong>Kategori:</strong> <span class="badge bg-secondary">${sanitizeHTML(formData.category)}</span></p>
            <h6>Açıklama</h6>
            <p class="border p-2 rounded bg-light mb-3">${sanitizeHTML(formData.description).replace(/\n/g, '<br>')}</p>
            <h6>Değerlendirmeler</h6>
            <div class="mb-3">${ratingsHtml}</div>
            <hr>
            <h6>Görsel</h6>
            ${state.complaintImageBase64
                ? `<img src="${state.complaintImageBase64}" alt="Şikayet Görseli Önizlemesi" class="img-fluid img-thumbnail" style="max-height: 300px;">`
                : '<p class="text-muted small">Görsel eklenmemiş.</p>'}
        `;

        const previewModalElement = DOM.previewComplaintModal;
        if (previewModalElement) {
            const previewModal = bootstrap.Modal.getInstance(previewModalElement) ||
                               new bootstrap.Modal(previewModalElement);
             previewModal.show();
         }
    }
};

// Admin tablo aksiyonları için yardımcı fonksiyon
const handleAdminTableActions = (e) => {
    // data-id'si olan en yakın butonu bul
    const target = e.target.closest('button[data-id]');
    if (!target) return;

    const complaintId = parseInt(target.dataset.id);
    if (isNaN(complaintId)) return;

    // Şikayeti bul (getComplaints her zaman güncel veriyi döner)
    const complaint = getComplaints().find(c => c.id === complaintId);
    if (!complaint) {
        showToast('Şikayet bulunamadı!', 'Hata', 'error');
        return;
    }

    state.activeComplaintId = complaintId; // Hangi şikayet üzerinde işlem yapıldığını sakla

    // Hangi butona tıklandı?
    if (target.matches('.view-btn')) {
        displayComplaintDetail(complaint, 'admin', currentUserId); // ui.js'den fonksiyonu çağır
        const detailModalElement = DOM.complaintDetailModal;
        if (detailModalElement) {
             const detailModal = bootstrap.Modal.getInstance(detailModalElement) || new bootstrap.Modal(detailModalElement);
             detailModal.show();
         }
    } else if (target.matches('.approve-btn')) {
        if (approveComplaint(complaintId)) { // data.js'den fonksiyonu çağır
            showToast('Şikayet onaylandı ve yayınlandı.', 'Başarılı', 'success');
            updateDynamicUI(undefined, { fullUpdate: true }); // Tüm UI'ı güncelle
        } else {
            showToast('Onaylama başarısız oldu veya şikayet zaten onaylı.', 'Hata', 'warning');
        }
    } else if (target.matches('.reject-btn')) {
        // Kullanıcıdan onay iste
        if (confirm(`"${complaint.title || complaintId}" başlıklı şikayeti reddedip SİLMEK istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            if (rejectComplaint(complaintId)) { // data.js'den fonksiyonu çağır
                showToast('Şikayet reddedildi ve sistemden silindi.', 'Başarılı', 'success');
                updateDynamicUI(undefined, { fullUpdate: true }); // Tüm UI'ı güncelle
            } else {
                showToast('Reddetme/silme işlemi başarısız oldu veya şikayet onay bekler durumda değil.', 'Hata', 'error');
            }
        }
    } else if (target.matches('.edit-btn')) {
        // Düzenleme modalını bul ve aç
        const editModalElement = document.getElementById('editComplaintModal');
        if (!editModalElement) return;
        const editModal = bootstrap.Modal.getInstance(editModalElement) || new bootstrap.Modal(editModalElement);

        // Formu şikayet verileriyle doldur
        document.getElementById('editComplaintTitle').value = complaint.title || '';
        document.getElementById('editComplaintCategory').value = complaint.category || '';
        document.getElementById('editComplaintBrand').value = complaint.brand || '';
        document.getElementById('editComplaintDescription').value = complaint.description || '';
        // Puanlama düzenleme eklenmedi, sadece metin alanları

        // Kaydet butonuna olay dinleyici ekle (her seferinde yeniden eklemek daha güvenli)
        const saveBtn = document.getElementById('saveEditedComplaint');
        const editForm = document.getElementById('editComplaintForm');

        // Önceki listener'ı kaldır (varsa)
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        const newSaveBtn = document.getElementById('saveEditedComplaint'); // Yeni butonu al

        newSaveBtn.onclick = () => { // Olay dinleyiciyi doğrudan ata
             if (!editForm.checkValidity()) {
                 editForm.classList.add('was-validated');
                 return;
             }
             editForm.classList.remove('was-validated');

            const updatedData = {
                title: sanitizeHTML(document.getElementById('editComplaintTitle').value.trim()),
                category: document.getElementById('editComplaintCategory').value,
                brand: sanitizeHTML(document.getElementById('editComplaintBrand').value.trim()),
                description: sanitizeHTML(document.getElementById('editComplaintDescription').value.trim())
                 // Status ve diğer alanlar admin panelinden ayrıca değiştirilebilir
            };

            if (updateComplaint(state.activeComplaintId, updatedData)) { // data.js'den güncelleme
                showToast('Şikayet başarıyla güncellendi.', 'Başarılı', 'success');
                closeModal(editModalElement);
                updateDynamicUI(undefined, { fullUpdate: true }); // UI'ı güncelle
            } else {
                showToast('Güncelleme başarısız oldu.', 'Hata', 'error');
            }
        };

        editModal.show();

    } else if (target.matches('.delete-btn')) {
        // Bu buton admin tablosunda yok ama detayda olabilir. Burada sadece kalıcı silme var.
        if (confirm(`"${complaint.title || complaintId}" başlıklı şikayeti KALICI olarak silmek istediğinizden emin misiniz? Durumu ne olursa olsun silinecektir ve bu işlem geri alınamaz.`)) {
            if (deleteComplaint(complaintId)) { // data.js'den silme
                showToast('Şikayet başarıyla kalıcı olarak silindi.', 'Başarılı', 'success');
                updateDynamicUI(undefined, { fullUpdate: true }); // UI'ı güncelle
            } else {
                showToast('Silme işlemi başarısız oldu.', 'Hata', 'error');
            }
        }
    } else if (target.matches('.comment-btn')) {
        // Admin yorum/not modalını aç
        const commentModalElement = document.getElementById('adminCommentModal');
        if (!commentModalElement) return;
        const commentModal = bootstrap.Modal.getInstance(commentModalElement) || new bootstrap.Modal(commentModalElement);
        const commentTextarea = document.getElementById('adminCommentText');
        const submitCommentBtn = document.getElementById('submitAdminComment');

        commentTextarea.value = ''; // Textarea'yı temizle

        // Gönder butonuna olay dinleyici ekle
        submitCommentBtn.replaceWith(submitCommentBtn.cloneNode(true)); // Eski listener'ı temizle
         const newSubmitBtn = document.getElementById('submitAdminComment'); // Yeni butonu al

        newSubmitBtn.onclick = () => {
            const commentText = commentTextarea.value.trim();
            if (!commentText) {
                showToast('Lütfen bir yorum/not yazın.', 'Uyarı', 'warning');
                return;
            }

            if (addCommentToComplaint(complaintId, sanitizeHTML(commentText), 'admin')) { // data.js'den yorum ekle
                showToast('Admin yorumu/notu eklendi.', 'Başarılı', 'success');
                closeModal(commentModalElement);
                updateAdminTable(getComplaints()); // Admin tablosunu güncelle

                // Eğer detay modalı açıksa, onu da güncelle
                const detailModalInstance = bootstrap.Modal.getInstance(DOM.complaintDetailModal);
                if (detailModalInstance && DOM.complaintDetailModal?.classList.contains('show')) {
                     const updatedComplaint = getComplaints().find(c => c.id === complaintId);
                     if (updatedComplaint) {
                         displayComplaintDetail(updatedComplaint, 'admin', currentUserId); // Detayı yenile
                     }
                 }
            } else {
                showToast('Yorum eklenemedi (Belki şikayet onay bekliyor?).', 'Hata', 'error');
            }
        };

        commentModal.show();

    } else if (target.matches('.status-btn')) {
         // Durum değiştirme modalı (Admin tablosunda yok, belki başka yerde?)
         if (complaint.pendingApproval) {
             showToast('Onay bekleyen şikayetlerin durumu değiştirilemez. Önce onaylayın veya reddedin.', 'Uyarı', 'warning');
             return;
         }

        const statusModalElement = document.getElementById('changeStatusModal');
        if (!statusModalElement) return;
        const statusModal = bootstrap.Modal.getInstance(statusModalElement) || new bootstrap.Modal(statusModalElement);
        const statusSelect = document.getElementById('newStatus');
        const saveStatusBtn = document.getElementById('saveNewStatus');

        statusSelect.value = complaint.status || 'Açık'; // Mevcut durumu seçili getir

        // Kaydet butonuna olay dinleyici
        saveStatusBtn.replaceWith(saveStatusBtn.cloneNode(true)); // Eski listener'ı temizle
        const newSaveBtn = document.getElementById('saveNewStatus');

        newSaveBtn.onclick = () => {
            const newStatus = statusSelect.value;
            // updateComplaint kullanarak durumu güncelle
            if (updateComplaint(complaintId, { status: newStatus })) {
                showToast('Şikayet durumu güncellendi.', 'Başarılı', 'success');
                closeModal(statusModalElement);
                 updateDynamicUI(undefined, { fullUpdate: true }); // UI'ı güncelle
            } else {
                showToast('Durum güncellenemedi.', 'Hata', 'error');
            }
        };

        statusModal.show();
    }
};

// Uygulama başlatma fonksiyonu
function init() {
    if (state.isInitialized) return;
    console.log("Uygulama başlatılıyor...");

    // Hero section animasyonlarını başlat (Eğer varsa)
    initHeroAnimations();

    // İlk UI güncellemeleri
    displaySiteStats();
    displayLatestComplaints(3); // Slider'ı göster
    displayPopularBrands(5);    // Popüler markaları göster
    displayPricingPlans();      // Fiyat planlarını göster
    // updateComplaintList(getComplaints(), '', currentUserId); // Başlangıçta Explore listesi boş olmalı

    // Etkinlikleri başlat
    setupBrandAndFilterButtonEvents(); // Explore içindeki buton olayları (arama hariç)
    initEvents(); // Genel olay dinleyicileri (arama dahil)

    // Scroll etkinlikleri
    const setupScrollEvent = (selector, targetId, focusElement = null) => {
        const button = document.querySelector(selector);
        button?.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = document.getElementById(targetId);
            targetSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (focusElement) {
                 // Kısa bir gecikme ile focus yap, scroll bitince çalışsın
                 setTimeout(() => focusElement.focus({ preventScroll: true }), 300);
            }
        });
    };

     // Hero'daki Keşfet butonu
     setupScrollEvent('#hero-advanced a[href="#explore"]', 'explore', document.getElementById('searchInputExplore'));
     // Son Eklenenler bölümündeki Tümünü Gör butonu
     setupScrollEvent('#latest-complaints a[href="#explore"]', 'explore', document.getElementById('searchInputExplore'));
     // Navbar Keşfet linki
     setupScrollEvent('.navbar a[href="#explore"]', 'explore', document.getElementById('searchInputExplore'));


    state.isInitialized = true;
    console.log("Uygulama başlatıldı.");
}

// Olay dinleyicilerini bağlama fonksiyonu
function initEvents() {
    // 1. Şikayet Listesi Etkileşimleri (Slider ve Arama Sonuçları için UI.js içinde yapılıyor)
    // DOM.complaintList?.addEventListener('click', (e) => { ... }); // Bu belki eski yapı içindi

    // 2. ARAMA İŞLEMLERİ (Explore bölümü araması)
    const searchInputExplore = document.getElementById('searchInputExplore');
    const searchButtonExplore = document.getElementById('searchButtonExplore');
    // const currentUserId = localStorage.getItem('currentUser') || 'anonymous'; // Yukarıda zaten tanımlı

    if (searchButtonExplore && searchInputExplore) {
        searchButtonExplore.addEventListener('click', () => {
            const searchTerm = searchInputExplore.value.trim();
            updateComplaintList(getComplaints(), searchTerm, currentUserId);
        });

        searchInputExplore.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = searchInputExplore.value.trim();
                updateComplaintList(getComplaints(), searchTerm, currentUserId);
            }
        });
         // Opsiyonel: Arama sırasında öneri gösterme eklenebilir
         // searchInputExplore.addEventListener('input', () => { ... });
    } else {
        console.warn("Explore bölümü arama elementleri (#searchInputExplore veya #searchButtonExplore) initEvents içinde tekrar kontrol edildi, bulunamadı.");
    }

    // 3. Şikayet Formu Gönderimi
    DOM.submitComplaintBtn?.addEventListener('click', handleComplaintSubmission);

    // 4. Görsel Yükleme ve Önizleme
    DOM.complaintImage?.addEventListener('change', (e) => {
        previewImage(e, (base64) => { // ui.js'deki previewImage'i kullan
            state.complaintImageBase64 = base64; // base64 veriyi state'e kaydet
        });
    });

    // 5. Şikayet Önizleme Butonu
    DOM.previewComplaintBtn?.addEventListener('click', showComplaintPreview); // events.js içindeki helper'ı kullan

    // 6. Admin Paneli Açıldığında Tabloyu Güncelle
    DOM.adminModal?.addEventListener('show.bs.modal', () => {
        updateAdminTable(getComplaints()); // ui.js'deki fonksiyon
    });

    // 7. Admin Tablosu İşlemleri (Onayla, Reddet, Gör, Düzenle, Yorum Ekle)
    DOM.adminTableBody?.addEventListener('click', handleAdminTableActions); // events.js içindeki helper'ı kullan

    // 8. Şikayet Detay Modalı İçindeki Admin Butonları (Onayla/Reddet - Sadece onay bekleyenler için)
    DOM.complaintDetailModal?.addEventListener('click', (e) => {
        const target = e.target.closest('.approve-btn, .reject-btn');
        if (!target) return;

        const complaintId = parseInt(target.dataset.id);
        if (isNaN(complaintId)) return;

        // Hangi şikayet üzerinde işlem yapılıyor? Detay modalı açıkken state.activeComplaintId güncel olmalı.
        // Ancak burada doğrudan butonun data-id'sini kullanmak daha güvenli.
        const complaint = getComplaints().find(c => c.id === complaintId);
        if (!complaint || !complaint.pendingApproval) {
             showToast('Bu işlem sadece onay bekleyen şikayetler için geçerlidir.', 'Uyarı', 'warning');
             return;
        }

        if (target.matches('.approve-btn')) {
            if (approveComplaint(complaintId)) {
                showToast('Şikayet onaylandı ve yayınlandı.', 'Başarılı', 'success');
                closeModal(DOM.complaintDetailModal);
                updateDynamicUI(undefined, { fullUpdate: true });
            } else {
                showToast('Onaylama başarısız oldu.', 'Hata', 'error');
            }
        } else if (target.matches('.reject-btn')) {
            if (confirm(`Bu şikayeti reddedip SİLMEK istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
                if (rejectComplaint(complaintId)) {
                    showToast('Şikayet reddedildi ve silindi.', 'Başarılı', 'success');
                    closeModal(DOM.complaintDetailModal);
                    updateDynamicUI(undefined, { fullUpdate: true });
                } else {
                    showToast('Reddetme/silme işlemi başarısız oldu.', 'Hata', 'error');
                }
            }
        }
    });

    // 9. Şikayet Ekleme Modalı Textarea Boyutlandırma
    DOM.createComplaintModal?.addEventListener('shown.bs.modal', () => {
        if (DOM.descriptionTextarea) autoResizeTextarea(DOM.descriptionTextarea);
    });
    DOM.descriptionTextarea?.addEventListener('input', () => {
        if (DOM.descriptionTextarea) autoResizeTextarea(DOM.descriptionTextarea);
    });

    // 10. Düzenleme Modalı Textarea Boyutlandırma
    const editDescTextarea = document.getElementById('editComplaintDescription');
    const editModalElement = document.getElementById('editComplaintModal');
    editModalElement?.addEventListener('shown.bs.modal', () => {
        if (editDescTextarea) autoResizeTextarea(editDescTextarea);
    });
    editDescTextarea?.addEventListener('input', () => {
        if (editDescTextarea) autoResizeTextarea(editDescTextarea);
    });
}

// Uygulamayı Başlat
document.addEventListener('DOMContentLoaded', () => {
    // Animate.css kütüphanesini dinamik olarak yükle (Eğer kullanılmıyorsa kaldırılabilir)
    const animateCSSLink = document.createElement('link');
    animateCSSLink.rel = 'stylesheet';
    animateCSSLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css';
    document.head.appendChild(animateCSSLink);

    init(); // Ana başlatma fonksiyonunu çağır
});