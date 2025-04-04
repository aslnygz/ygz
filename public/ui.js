// ui.js - Kullanıcı Arayüzü Yönetimi (Tam, Güncellenmiş ve Düzeltilmiş Hali - 03.04.2025)

import { getComplaints, addCommentToComplaint } from './data.js';
// Dinamik import ile: likeComplaint, dislikeComplaint (gerektiğinde çağrılır)
import { showToast, autoResizeTextarea, capitalizeFirstLetter, getDistinctColors, formatDate, sanitizeHTML } from './utils.js';

// Sabitler
const EXCERPT_LENGTH = 120; // Şikayet özetlerinde gösterilecek karakter sayısı
const MAX_FILE_SIZE_MB = 2; // Maksimum resim yükleme boyutu (MB)
const MAX_SUGGESTIONS = 5; // Arama öneri sayısı
const FEATURED_COMPLAINT_COUNT = 3; // "Öne Çıkan Şikayetler" widget'ında gösterilecek sayı

// Grafik nesnelerini saklamak için global değişkenler
let brandChart = null;
let brandCategoryChart = null;

/**
 * Arama sonuçlarını veya marka bazlı şikayetleri Explore bölümündeki ilgili widget'ta günceller.
 * @param {Array} complaints Gösterilecek şikayetler dizisi.
 * @param {string} filterTerm Arama terimi (marka, başlık veya açıklama).
 * @param {string} currentUserId Mevcut oturumdaki kullanıcı ID'si.
 */
export function updateComplaintList(complaints, filterTerm = '', currentUserId = null) {
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const searchResultsList = document.getElementById('searchResultsList');
    const searchWidgetTitle = document.querySelector('#explore .search-widget .widget-title');

    if (!searchResultsContainer || !searchResultsList) {
        console.error("Arama sonuçları listesi (#searchResultsList) veya konteyneri (#searchResultsContainer) DOM'da bulunamadı!");
        return;
    }

    const approvedComplaints = complaints.filter(c => !c.pendingApproval);
    let filteredComplaints = [];
    let isBrandFilter = false;
    const lowerCaseFilter = filterTerm.toLowerCase().trim();

    if (!lowerCaseFilter) {
        searchResultsContainer.style.display = 'none';
        searchResultsList.innerHTML = '';
        if (searchWidgetTitle) searchWidgetTitle.innerHTML = '<i class="fas fa-search me-2 text-primary"></i> Şikayet Ara';
        hideBrandStats();
        return;
    }

    searchResultsContainer.style.display = 'block';
    const brandMatch = approvedComplaints.filter(c => c.brand?.toLowerCase().trim() === lowerCaseFilter);

    if (brandMatch.length > 0) {
        filteredComplaints = brandMatch;
        isBrandFilter = true;
        if (searchWidgetTitle) searchWidgetTitle.innerHTML = `<i class="fas fa-tag me-2"></i> ${capitalizeFirstLetter(filterTerm)} Sonuçları`;
        displayBrandStats(filterTerm);
    } else {
        filteredComplaints = approvedComplaints.filter(c =>
            (c.title?.toLowerCase().includes(lowerCaseFilter)) ||
            (c.description?.toLowerCase().includes(lowerCaseFilter)) ||
            (c.brand?.toLowerCase().includes(lowerCaseFilter))
        );
        if (searchWidgetTitle) searchWidgetTitle.innerHTML = `<i class="fas fa-search me-2"></i> '${filterTerm}' İçin Sonuçlar`;
        hideBrandStats();
    }

    searchResultsList.innerHTML = '';
    if (filteredComplaints.length === 0) {
        const message = isBrandFilter
            ? `${capitalizeFirstLetter(filterTerm)} markası için sonuç bulunamadı.`
            : `'${filterTerm}' ile eşleşen sonuç bulunamadı.`;
        searchResultsList.innerHTML = `<li class="list-group-item text-center text-muted p-3">${message}</li>`;
        searchResultsList.className = 'list-group list-group-flush p-0';
    } else {
        searchResultsList.className = 'complaint-list-group p-0';
        searchResultsList.innerHTML = filteredComplaints
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(complaint => createComplaintCard(complaint, currentUserId).outerHTML)
            .join('');
        addEventListenersToComplaintCards(searchResultsList, currentUserId);
    }
}

/**
 * Belirtilen liste içindeki şikayet kartlarına tıklama ve like/dislike olay dinleyicilerini ekler.
 * @param {HTMLElement} listElement Olay dinleyicisinin ekleneceği liste.
 * @param {string|null} currentUserId Mevcut kullanıcı ID'si.
 */
function addEventListenersToComplaintCards(listElement, currentUserId) {
     if (!listElement) return;
     listElement.querySelectorAll('.complaint-card, .complaint-summary-card').forEach(card => {
         const existingCardListener = card.cardClickListener;
         if (existingCardListener) card.removeEventListener('click', existingCardListener);
         const clickListener = (e) => {
             if (!e.target.closest('.like-btn') && !e.target.closest('.dislike-btn')) {
                 const complaintId = parseInt(card.dataset.id);
                 if (!isNaN(complaintId)) {
                     const complaint = getComplaints().find(c => c.id === complaintId);
                     if (complaint) {
                         displayComplaintDetail(complaint, 'user', currentUserId);
                         const detailModalElement = document.getElementById('complaintDetailModal');
                         if (detailModalElement) {
                             const detailModal = bootstrap.Modal.getInstance(detailModalElement) || new bootstrap.Modal(detailModalElement);
                             detailModal.show();
                         }
                     } else { console.warn(`Complaint ID ${complaintId} not found.`); }
                 }
             }
         };
         card.addEventListener('click', clickListener);
         card.cardClickListener = clickListener;

         card.querySelectorAll('.like-btn, .dislike-btn').forEach(button => {
              const existingButtonListener = button.buttonClickListener;
              if (existingButtonListener) button.removeEventListener('click', existingButtonListener);
               const buttonClickListener = async (ev) => {
                   ev.stopPropagation();
                   const complaintId = parseInt(button.dataset.complaintId);
                   if (isNaN(complaintId)) return;
                   const action = button.classList.contains('like-btn') ? 'like' : 'dislike';
                   try {
                       const module = await import('./data.js');
                       const success = action === 'like' ? module.likeComplaint(complaintId, currentUserId) : module.dislikeComplaint(complaintId, currentUserId);
                       if (success) {
                           const updatedComplaint = module.getComplaints().find(c => c.id === complaintId);
                           const likeDislikeSection = button.closest('.like-dislike-section');
                           const likeCountEl = likeDislikeSection?.querySelector('.like-btn .count');
                           const dislikeCountEl = likeDislikeSection?.querySelector('.dislike-btn .count');
                           const likeBtn = likeDislikeSection?.querySelector('.like-btn');
                           const dislikeBtn = likeDislikeSection?.querySelector('.dislike-btn');
                           if (updatedComplaint && likeCountEl && dislikeCountEl && likeBtn && dislikeBtn) {
                               likeCountEl.textContent = updatedComplaint.likes ? Object.keys(updatedComplaint.likes).length : 0;
                               dislikeCountEl.textContent = updatedComplaint.dislikes ? Object.keys(updatedComplaint.dislikes).length : 0;
                               likeBtn.classList.toggle('active-like', !!updatedComplaint.likes?.[currentUserId]);
                               dislikeBtn.classList.toggle('active-dislike', !!updatedComplaint.dislikes?.[currentUserId]);
                           }
                       } else { showToast(action === 'like' ? 'Beğeni başarısız.' : 'Beğenmeme başarısız.', 'Hata', 'error'); }
                   } catch (error) { console.error("Like/Dislike hatası:", error); showToast('İşlem hatası.', 'Hata', 'error'); }
               };
               button.addEventListener('click', buttonClickListener);
               button.buttonClickListener = buttonClickListener;
         });
     });
}

/**
 * Tek bir şikayet için HTML kartı oluşturur (div elementi olarak).
 * @param {object} complaint Şikayet verisi.
 * @param {string|null} currentUserId Mevcut kullanıcı ID'si.
 * @param {object} options Ekstra seçenekler (örn: { showActions: true }).
 * @returns {HTMLElement} Oluşturulan div elementi.
 */
function createComplaintCard(complaint, currentUserId, options = { showActions: true }) {
    const cardDiv = document.createElement('div');
    const status = complaint.status?.toLowerCase() || 'unknown';
    cardDiv.className = `complaint-card status-${status}`;
    cardDiv.dataset.id = complaint.id;

    const likeCount = complaint.likes ? Object.keys(complaint.likes).length : 0;
    const dislikeCount = complaint.dislikes ? Object.keys(complaint.dislikes).length : 0;
    const userLiked = currentUserId && complaint.likes?.[currentUserId];
    const userDisliked = currentUserId && complaint.dislikes?.[currentUserId];

    let avgRatingHtml = '<span class="me-3 text-muted small">Puanlanmamış</span>';
    if (complaint.ratings && Object.keys(complaint.ratings).length > 0) {
        const ratingsArray = Object.values(complaint.ratings).map(Number).filter(r => !isNaN(r) && r >= 1 && r <= 5);
        if (ratingsArray.length > 0) {
            const avgRating = (ratingsArray.reduce((sum, val) => sum + val, 0) / ratingsArray.length).toFixed(1);
            avgRatingHtml = `<div class="d-flex align-items-center"><span class="me-1 small text-muted">Ortalama:</span><div class="average-box">${avgRating}</div></div>`;
        }
    }

    const badgeClass = { 'açık': 'bg-primary', 'çözüldü': 'bg-success', 'kapalı': 'bg-secondary', 'beklemede': 'bg-warning text-dark' }[status] || 'bg-info';
    const safeBrand = sanitizeHTML(complaint.brand || 'Marka Belirtilmemiş');
    const safeCategory = sanitizeHTML(complaint.category || 'Kategori Yok');
    const safeTitle = sanitizeHTML(complaint.title || 'Başlık Yok');
    let safeDescription = sanitizeHTML(complaint.description || '');
    if (safeDescription.length > EXCERPT_LENGTH) {
        const lastSpace = safeDescription.lastIndexOf(' ', EXCERPT_LENGTH);
        safeDescription = safeDescription.substring(0, lastSpace > 0 ? lastSpace : EXCERPT_LENGTH) + '...';
    }
    const safeStatus = sanitizeHTML(complaint.pendingApproval ? 'Onay Bekliyor' : complaint.status || 'Bilinmiyor');

    cardDiv.innerHTML = `
        <div class="card-content-wrapper">
            <div class="card-header-info d-flex justify-content-between align-items-start mb-2 flex-wrap">
                <div class="brand-category mb-1 me-2">
                    <span class="brand-tag fw-bold">${safeBrand}</span>
                    <span class="ms-2 badge bg-light text-dark border">${safeCategory}</span>
                </div>
                <small class="complaint-date text-muted text-nowrap flex-shrink-0">${formatDate(complaint.date)}</small>
            </div>
            <h5 class="mb-2 complaint-title" role="button">${safeTitle}</h5>
            <p class="mb-3 complaint-excerpt">${safeDescription}</p>
            <div class="card-footer-info d-flex justify-content-between align-items-center flex-wrap border-top pt-2">
                <small class="text-muted me-3 mb-1">Durum: <span class="badge ${badgeClass}">${safeStatus}</span></small>
                <div class="d-flex align-items-center mb-1">
                    ${avgRatingHtml}
                    ${options.showActions && currentUserId && !complaint.pendingApproval ? `
                    <div class="like-dislike-section ms-3">
                        <button class="btn btn-sm like-btn ${userLiked ? 'active-like' : ''}" data-complaint-id="${complaint.id}" title="Beğen">
                            <i class="fas fa-thumbs-up"></i> <span class="count">${likeCount}</span>
                        </button>
                        <button class="btn btn-sm dislike-btn ${userDisliked ? 'active-dislike' : ''}" data-complaint-id="${complaint.id}" title="Beğenme">
                            <i class="fas fa-thumbs-down"></i> <span class="count">${dislikeCount}</span>
                        </button>
                    </div>` : ''}
                </div>
            </div>
        </div>
    `;
    return cardDiv;
}

/**
 * Öne çıkan (en çok etkileşim alan) şikayetler için özet kart HTML'i oluşturur.
 * @param {object} complaint Şikayet verisi.
 * @returns {string} HTML string'i.
 */
function createFeaturedComplaintCard(complaint) {
    const safeTitle = sanitizeHTML(complaint.title || 'Başlık Yok');
    const safeBrand = sanitizeHTML(complaint.brand || 'Markasız');
    const interactionCount = (complaint.likes ? Object.keys(complaint.likes).length : 0) +
                             (complaint.dislikes ? Object.keys(complaint.dislikes).length : 0) +
                             (complaint.comments ? complaint.comments.length : 0);

    return `
        <div class="complaint-summary-card" data-id="${complaint.id}" role="button" tabindex="0">
            <h6 class="complaint-summary-title">${safeTitle}</h6>
            <div class="d-flex justify-content-between align-items-center">
                 <span class="complaint-summary-brand">${safeBrand}</span>
                 <span class="complaint-summary-interactions small">
                     <i class="fas fa-eye me-1"></i> ${interactionCount} Etkileşim
                 </span>
            </div>
        </div>
    `;
}

/**
 * Şikayet detaylarını modal içinde gösterir.
 * @param {object} complaint Gösterilecek şikayet.
 * @param {string} displayMode 'user' veya 'admin'.
 * @param {string} currentUserId Mevcut kullanıcı ID'si.
 */
export function displayComplaintDetail(complaint, displayMode = 'user', currentUserId = null) {
    const detailBody = document.getElementById('complaintDetailBody');
    const modalTitle = document.getElementById('complaintDetailModalLabel');
    const adminActions = document.getElementById('adminActionButtons');

    if (!detailBody || !modalTitle || !adminActions) {
        showToast('Şikayet detayları gösterilemedi.', 'Hata', 'error');
        return;
    }

    modalTitle.textContent = `Şikayet Detayı: #${complaint.id}`;
    adminActions.innerHTML = '';
    adminActions.style.display = 'none';

    // Puanlama HTML'ini oluştur
    let ratingsHtml = '<h6><i class="fas fa-star me-2 text-warning"></i>Değerlendirmeler</h6>';
    if (complaint.ratings && Object.keys(complaint.ratings).length > 0) {
        const validRatingsHtml = Object.entries(complaint.ratings).map(([category, rating]) => {
            const numericRating = Number(rating);
            if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) return '';
            const percentage = (numericRating / 5) * 100;
            return `
                <div class="mb-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small">${sanitizeHTML(category)}</span>
                        <span class="small text-muted">${numericRating}/5</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${percentage}%;" aria-valuenow="${numericRating}" aria-valuemin="0" aria-valuemax="5"></div>
                    </div>
                </div>`;
        }).filter(Boolean).join('');

        if(validRatingsHtml) {
             ratingsHtml += `<div class="mb-3">${validRatingsHtml}</div>`;
        } else {
             ratingsHtml += '<p class="text-muted small">Geçerli değerlendirme yapılmamış.</p>';
        }
    } else {
        ratingsHtml += '<p class="text-muted small">Değerlendirme yapılmamış.</p>';
    }

    // Yorumlar HTML'ini oluştur
    let commentsHtml = '<h6><i class="fas fa-comments me-2"></i>Yorumlar</h6>';
    commentsHtml += generateCommentsHtml(complaint.comments || [], currentUserId, complaint.pendingApproval, complaint.id);
     if (!complaint.comments || complaint.comments.length === 0) {
        commentsHtml += '<p class="text-muted small">Henüz yorum yapılmamış.</p>';
    }

    const safeTitle = sanitizeHTML(complaint.title || 'Başlık Yok');
    const safeBrand = sanitizeHTML(complaint.brand || 'Marka Belirtilmemiş');
    const safeCategory = sanitizeHTML(complaint.category || 'Kategori Yok');
    const safeDescription = sanitizeHTML(complaint.description || '');
    const statusClass = complaint.pendingApproval ? 'bg-warning text-dark' : ({ 'çözüldü': 'bg-success', 'açık': 'bg-primary' }[complaint.status?.toLowerCase()] || 'bg-secondary');
    const safeStatus = sanitizeHTML(complaint.pendingApproval ? 'Onay Bekliyor' : complaint.status || 'Bilinmiyor');

    // Modal içeriğini oluştur
    detailBody.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-8">
                <h4>${safeTitle}</h4>
                <p class="mb-1">
                    <span class="detail-brand">${safeBrand}</span>
                    <span class="detail-category ms-2">${safeCategory}</span>
                </p>
                <p class="detail-date text-muted small mb-3">Oluşturulma: ${formatDate(complaint.date)}</p>
                <p class="detail-description mb-3">${safeDescription.replace(/\n/g, '<br>')}</p>
                <p class="mb-3"><strong>Durum:</strong> <span class="badge ${statusClass}">${safeStatus}</span></p>
                <hr>
                <div class="ratings-section mb-3">${ratingsHtml}</div>
                ${!complaint.pendingApproval ? `
                <hr>
                <div class="comment-section">
                     <div class="comments-container mb-3">${commentsHtml}</div> 
                    <div class="mt-4">
                        <h6><i class="fas fa-pen me-1"></i>Yorum Ekle:</h6>
                        <textarea id="newCommentText" class="form-control form-control-sm" rows="2" placeholder="Yorumunuzu buraya yazın..." maxlength="500"></textarea>
                        <button id="submitCommentBtn" class="btn modern-btn-primary btn-sm mt-2" data-complaint-id="${complaint.id}">
                            <i class="fas fa-paper-plane me-1"></i> Gönder
                        </button>
                    </div>
                    <div id="replyFormContainer" class="mt-3 border p-2 rounded bg-light" style="display: none;">
                        <small id="replyingTo" class="d-block mb-1 text-muted"></small>
                        <textarea id="replyCommentText" class="form-control form-control-sm" rows="2" placeholder="Yanıtınızı buraya yazın..." maxlength="500"></textarea>
                        <div class="mt-2">
                            <button id="submitReplyBtn" class="btn modern-btn-primary btn-sm"><i class="fas fa-reply me-1"></i> Yanıtla</button>
                            <button id="cancelReplyBtn" type="button" class="btn modern-btn-outline-secondary btn-sm ms-2">İptal</button>
                        </div>
                    </div>
                </div>` : '<p class="mt-4 alert alert-warning small">Bu şikayet henüz onaylanmadığı için yorum yapılamaz veya yorumlar görüntülenemez.</p>'}
            </div>
            <div class="col-lg-4">
                ${complaint.image ? `<img src="${complaint.image}" alt="Şikayet Görseli" class="img-fluid detail-image rounded border">` : '<div class="text-center p-3 border rounded bg-light"><p class="text-muted small my-5">Görsel eklenmemiş.</p></div>'}
            </div>
        </div>
    `;

    if (displayMode === 'admin' && complaint.pendingApproval) {
        adminActions.innerHTML = `
            <button class="btn modern-btn-success btn-sm approve-btn" data-id="${complaint.id}"> <i class="fas fa-check me-1"></i> Onayla </button>
            <button class="btn modern-btn-danger btn-sm reject-btn ms-2" data-id="${complaint.id}"> <i class="fas fa-times me-1"></i> Reddet (Sil) </button>
        `;
        adminActions.style.display = 'flex';
    }

    setupDetailModalEventListeners(complaint, currentUserId);
}

/**
 * Yorumlar ve yanıtlar için HTML yapısını oluşturur.
 * @param {Array} comments Yorumlar dizisi.
 * @param {string} currentUserId Mevcut kullanıcı ID'si.
 * @param {boolean} isPending Şikayetin onay durumu.
 * @param {number} complaintId Şikayet ID'si.
 * @param {number} depth Yanıt derinliği.
 * @returns {string} Oluşturulan HTML string'i.
 */
function generateCommentsHtml(comments, currentUserId, isPending, complaintId, depth = 0) {
    if (!comments || comments.length === 0) return '';
    const marginLeft = depth * 15;
    return `<div class="comment-thread" style="margin-left: ${marginLeft}px;">` +
        [...comments].sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(comment => {
            const isOwnComment = comment.userId === currentUserId;
            const userDisplay = comment.userId === 'admin' ? '<span class="badge bg-info me-1">Admin</span>' : (isOwnComment ? '<span class="text-primary fw-bold">Siz</span>' : `<span class="text-muted">Kullanıcı ...${comment.userId?.slice(-4) || '????'}</span>`);
            return `
                <div class="comment mb-2 border-start border-2 ps-2" data-comment-id="${comment.id}">
                    <p class="mb-1 small">${sanitizeHTML(comment.text)}</p>
                    <div class="comment-meta d-flex justify-content-between align-items-center">
                        <span class="small">${userDisplay} - ${formatDate(comment.date)}</span>
                        ${!isPending && depth < 3 ? `
                        <button class="btn btn-link btn-sm reply-btn p-0" data-comment-id="${comment.id}" data-complaint-id="${complaintId}" title="Yanıtla"> <i class="fas fa-reply"></i> </button>` : ''}
                    </div>
                    ${comment.replies?.length > 0 ? generateCommentsHtml(comment.replies, currentUserId, isPending, complaintId, depth + 1) : ''}
                </div>`;
        }).join('') + '</div>';
}


/**
 * Şikayet Detayı modalı içindeki olay dinleyicilerini ayarlar.
 * @param {object} complaint İlgili şikayet objesi.
 * @param {string} currentUserId Mevcut kullanıcı ID'si.
 */
function setupDetailModalEventListeners(complaint, currentUserId) {
    const detailBody = document.getElementById('complaintDetailBody');
    if (!detailBody) return;

    const submitCommentBtn = detailBody.querySelector('#submitCommentBtn');
    const newCommentText = detailBody.querySelector('#newCommentText');
    const replyFormContainer = detailBody.querySelector('#replyFormContainer');
    const replyCommentText = detailBody.querySelector('#replyCommentText');
    const submitReplyBtn = detailBody.querySelector('#submitReplyBtn');
    const cancelReplyBtn = detailBody.querySelector('#cancelReplyBtn');
    const replyingTo = detailBody.querySelector('#replyingTo');
    const commentsContainer = detailBody.querySelector('.comments-container'); // Yorumların render edildiği alan

    // Yardımcı fonksiyon: Olay dinleyiciyi temizleyip yeniden ekler
    const cleanAndAddListener = (element, event, handler) => {
        if (!element) return;
        const newElement = element.cloneNode(true); // Klonla
        element.parentNode.replaceChild(newElement, element); // Eskisini yenisiyle değiştir
        newElement.addEventListener(event, handler); // Yeni elemente dinleyici ekle
        return newElement; // Yeni elementi döndür
    };

    // Yorum Gönderme Butonu
    if (newCommentText) {
         const currentSubmitBtn = cleanAndAddListener(submitCommentBtn, 'click', async () => {
             const commentText = newCommentText.value.trim();
             const complaintId = parseInt(currentSubmitBtn.dataset.complaintId);
             if (!commentText) { /*...*/ return; }
             if (isNaN(complaintId)) { /*...*/ return; }
             try {
                 const dataModule = await import('./data.js');
                 if (dataModule.addCommentToComplaint(complaintId, sanitizeHTML(commentText), currentUserId)) {
                     showToast('Yorumunuz eklendi.', 'Başarılı', 'success');
                     const updatedComplaint = dataModule.getComplaints().find(c => c.id === complaintId);
                     if (commentsContainer && updatedComplaint) {
                          commentsContainer.innerHTML = generateCommentsHtml(updatedComplaint.comments || [], currentUserId, updatedComplaint.pendingApproval, complaintId);
                          setupDetailModalEventListeners(updatedComplaint, currentUserId); // Yeni reply butonları için
                     }
                     newCommentText.value = '';
                     autoResizeTextarea(newCommentText);
                     if(replyFormContainer) replyFormContainer.style.display = 'none';
                 } else { showToast('Yorum eklenirken bir hata oluştu.', 'Hata', 'error'); }
             } catch(error) { console.error("Yorum ekleme hatası:", error); showToast('Yorum eklenirken bir hata oluştu.', 'Hata', 'error'); }
         });
         newCommentText.removeEventListener('input', autoResizeTextarea);
         newCommentText.addEventListener('input', () => autoResizeTextarea(newCommentText));
     }

    // Yanıtla Butonları
    detailBody.querySelectorAll('.reply-btn').forEach(btn => {
        cleanAndAddListener(btn, 'click', (e) => {
            e.preventDefault();
            const commentId = parseInt(btn.dataset.commentId);
            const complaintId = parseInt(btn.dataset.complaintId);

            if (replyFormContainer && replyingTo && replyCommentText && submitReplyBtn && cancelReplyBtn) {
                const findComment = (comments, id) => {
                     if (!comments) return null;
                     for (const c of comments) {
                         if (c.id === id) return c;
                         if (c.replies) { const found = findComment(c.replies, id); if (found) return found; }
                     } return null;
                 };
                const parentComment = findComment(complaint.comments || [], commentId);
                if (!parentComment) { showToast('Yanıtlanacak yorum bulunamadı.', 'Hata', 'error'); return; }

                replyingTo.textContent = `Yanıtlanan: "${parentComment.text.substring(0, 20)}..."`;
                replyFormContainer.style.display = 'block';
                replyCommentText.value = '';
                replyCommentText.focus();

                 const currentSubmitReplyBtn = cleanAndAddListener(submitReplyBtn, 'click', async () => {
                     const replyText = replyCommentText.value.trim();
                     if (!replyText) { showToast('Lütfen yanıtınızı yazın.', 'Uyarı', 'warning'); return; }
                     try {
                         const dataModule = await import('./data.js');
                         if (dataModule.addCommentToComplaint(complaintId, sanitizeHTML(replyText), currentUserId, commentId)) {
                            showToast('Yanıtınız eklendi.', 'Başarılı', 'success');
                            const updatedComplaint = dataModule.getComplaints().find(c => c.id === complaintId);
                            if (commentsContainer && updatedComplaint) {
                                 commentsContainer.innerHTML = generateCommentsHtml(updatedComplaint.comments || [], currentUserId, updatedComplaint.pendingApproval, complaintId);
                                 setupDetailModalEventListeners(updatedComplaint, currentUserId);
                            }
                            replyFormContainer.style.display = 'none';
                         } else { showToast('Yanıt eklenirken bir hata oluştu.', 'Hata', 'error'); }
                     } catch (error) { console.error("Yanıt ekleme hatası:", error); showToast('Yanıt eklenirken bir hata oluştu.', 'Hata', 'error'); }
                 });

                if(cancelReplyBtn) { cancelReplyBtn.onclick = () => { replyFormContainer.style.display = 'none'; replyCommentText.value = ''; }; }
                if(replyCommentText) { replyCommentText.removeEventListener('input', autoResizeTextarea); replyCommentText.addEventListener('input', () => autoResizeTextarea(replyCommentText)); }
            }
        });
    });
}

/**
 * Popüler markaları hesaplar ve Explore bölümünde listeler.
 */
export function displayPopularBrands(count = 5) {
    const popularBrandsListElement = document.getElementById('popularBrandsListExplore');
    if (!popularBrandsListElement) {
         console.warn("Popüler markalar listesi elementi (#popularBrandsListExplore) bulunamadı!");
         return;
    }
    try {
        const brandCounts = getComplaints().filter(c => !c.pendingApproval && c.brand?.trim())
                                         .reduce((acc, { brand }) => {
                                             const cleanBrand = capitalizeFirstLetter(brand.trim());
                                             acc[cleanBrand] = (acc[cleanBrand] || 0) + 1;
                                             return acc;
                                         }, {});
        const sortedBrands = Object.entries(brandCounts).sort(([, a], [, b]) => b - a).slice(0, count);
        popularBrandsListElement.innerHTML = sortedBrands.length === 0
            ? '<p class="text-center text-muted small p-2">Henüz popüler marka yok.</p>'
            : sortedBrands.map(([brandName, complaintCount]) => `
                <a href="#" class="list-group-item list-group-item-action popular-brand-item" data-brand="${sanitizeHTML(brandName)}">
                    <span>${sanitizeHTML(brandName)}</span>
                    <span class="badge">${complaintCount}</span>
                </a>`).join('');
        addEventListenersToPopularBrands(popularBrandsListElement);
    } catch (error) {
        console.error("Popüler markalar yüklenirken hata:", error);
        popularBrandsListElement.innerHTML = '<p class="text-center text-danger small p-2">Markalar yüklenirken hata oluştu.</p>';
    }
}

/**
 * Popüler markalar listesindeki her bir öğeye tıklama olayı ekler.
 */
function addEventListenersToPopularBrands(listElement) {
    if (!listElement) return;
    const newElement = listElement.cloneNode(true); // Listener temizliği için klonla
    listElement.parentNode.replaceChild(newElement, listElement);
    newElement.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('.popular-brand-item');
        if (target?.dataset.brand) {
            const brandName = target.dataset.brand;
            const searchInput = document.getElementById('searchInputExplore');
            if (searchInput) {
                searchInput.value = brandName;
                updateComplaintList(getComplaints(), brandName, localStorage.getItem('currentUser'));
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                searchInput.focus();
            }
        }
    });
}

/**
 * Belirli bir markanın istatistiklerini Explore bölümündeki widget'ta gösterir.
 */
export function displayBrandStats(brandName) {
    const contentContainer = document.getElementById('featuredComplaintsContent'); // İçeriğin gösterileceği alan
    const chartContainer = document.getElementById('brandStatsCharts'); // Grafiklerin parent'ı
    const statsBrandName = document.getElementById('statsBrandName');
    const sentimentChartCanvas = document.getElementById('brandSentimentChart');
    const categoryChartCanvas = document.getElementById('brandCategoryChart');
    const widgetTitle = document.querySelector('#explore .featured-complaints-widget .widget-title');

    if (!contentContainer || !chartContainer || !statsBrandName || !sentimentChartCanvas || !categoryChartCanvas || !widgetTitle) {
         console.warn("Marka istatistik widget elementleri bulunamadı!");
         return;
    }

    const lowerCaseBrandName = brandName.toLowerCase().trim();
    const brandComplaints = getComplaints().filter(c => !c.pendingApproval && c.brand?.toLowerCase().trim() === lowerCaseBrandName);

    if (brandComplaints.length === 0) {
        hideBrandStats(); // Veri yoksa öne çıkanları göster
        return;
    }

    widgetTitle.innerHTML = `<i class="fas fa-chart-pie me-2 text-info"></i> ${capitalizeFirstLetter(brandName)} İstatistikleri`;
    contentContainer.innerHTML = ''; // Öne çıkanları temizle
    chartContainer.style.display = 'block';
    document.getElementById('brandStatsInfo').style.display = 'none'; // Bilgi yazısını gizle
    statsBrandName.textContent = capitalizeFirstLetter(brandName);

    // Grafik hesaplama ve çizdirme
    if (brandChart) brandChart.destroy();
    if (brandCategoryChart) brandCategoryChart.destroy();

    let good = 0, average = 0, bad = 0, unrated = 0;
    const categoryCounts = {};
    brandComplaints.forEach(c => {
        if (c.ratings && Object.keys(c.ratings).length > 0) {
            const rArr = Object.values(c.ratings).map(Number).filter(r => !isNaN(r) && r >= 1 && r <= 5);
            if (rArr.length > 0) { const avg = rArr.reduce((s, v) => s + v, 0) / rArr.length; if (avg >= 4.0) good++; else if (avg >= 2.5) average++; else bad++; } else { unrated++; }
        } else { unrated++; }
        if (c.category?.trim()) { const cat = capitalizeFirstLetter(c.category.trim()); categoryCounts[cat] = (categoryCounts[cat] || 0) + 1; }
    });

    brandChart = new Chart(sentimentChartCanvas, {
        type: 'doughnut', data: { labels: [`İyi (${good})`, `Orta (${average})`, `Kötü (${bad})`, `Puansız (${unrated})`], datasets: [{ data: [good, average, bad, unrated], backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#6c757d'], borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}` } } }, cutout: '60%' } });

    const categoryLabels = Object.keys(categoryCounts); const categoryData = Object.values(categoryCounts);
    const categoryChartContainer = categoryChartCanvas.closest('.chart-container');
    const existingMsg = categoryChartContainer?.querySelector('.no-category-data'); if(existingMsg) existingMsg.remove();
    if (categoryLabels.length > 0) {
        categoryChartCanvas.style.display = 'block';
        brandCategoryChart = new Chart(categoryChartCanvas, { type: 'pie', data: { labels: categoryLabels.map(cat => `${cat} (${categoryCounts[cat]})`), datasets: [{ data: categoryData, backgroundColor: getDistinctColors(categoryLabels.length), borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 15 } }, tooltip: { callbacks: { label: c => ` ${c.label.split('(')[0].trim()}: ${c.raw}` } } } } });
    } else {
        categoryChartCanvas.style.display = 'none';
        const p = document.createElement('p'); p.className = 'text-muted small text-center mt-2 no-category-data'; p.textContent = 'Kategori verisi yok.'; categoryChartContainer?.appendChild(p);
    }
}

/**
 * Marka istatistiklerini gizler ve yerine öne çıkan şikayetleri gösterir.
 */
function hideBrandStats() {
    const contentContainer = document.getElementById('featuredComplaintsContent');
    const chartContainer = document.getElementById('brandStatsCharts');
    const statsInfo = document.getElementById('brandStatsInfo');
    const widgetTitle = document.querySelector('#explore .featured-complaints-widget .widget-title');

    if(widgetTitle) widgetTitle.innerHTML = `<i class="fas fa-star me-2 text-warning"></i> Öne Çıkan Şikayetler`;
    if(chartContainer) chartContainer.style.display = 'none';
    if(statsInfo) statsInfo.style.display = 'none'; // Başlangıçta bilgi yazısını da gizle

    try {
        if (brandChart) { brandChart.destroy(); brandChart = null; }
        if (brandCategoryChart) { brandCategoryChart.destroy(); brandCategoryChart = null; }
    } catch (e) { console.warn("Grafik silme hatası:", e); }

    // Varsayılan olarak öne çıkan şikayetleri göster
    displayFeaturedComplaints('featuredComplaintsContent', FEATURED_COMPLAINT_COUNT);
}

/**
 * Öne çıkan şikayetleri (en çok etkileşim alan) widget'ta gösterir.
 */
function displayFeaturedComplaints(containerId, count) {
    const container = document.getElementById(containerId);
    if (!container) { console.warn(`Featured complaints container (#${containerId}) not found.`); return; }

    try {
        const complaints = getComplaints().filter(c => !c.pendingApproval);
        if (complaints.length === 0) { container.innerHTML = '<p class="text-center text-muted small p-2">Gösterilecek şikayet yok.</p>'; return; }

        const sortedComplaints = complaints.sort((a, b) => {
            const interactionsA = (a.likes ? Object.keys(a.likes).length : 0) + (a.dislikes ? Object.keys(a.dislikes).length : 0) + (a.comments ? a.comments.length : 0);
            const interactionsB = (b.likes ? Object.keys(b.likes).length : 0) + (b.dislikes ? Object.keys(b.dislikes).length : 0) + (b.comments ? b.comments.length : 0);
            return interactionsB - interactionsA; // Çoktan aza
        }).slice(0, count);

        if (sortedComplaints.length === 0) { container.innerHTML = '<p class="text-center text-muted small p-2">Öne çıkan şikayet bulunamadı.</p>'; return; }

        container.innerHTML = sortedComplaints.map(createFeaturedComplaintCard).join('');
        addEventListenersToComplaintCards(container, localStorage.getItem('currentUser')); // Tıklama olayı ekle

    } catch (error) {
        console.error("Öne çıkan şikayetler yüklenirken hata:", error);
        container.innerHTML = '<p class="text-center text-danger small p-2">Şikayetler yüklenirken hata oluştu.</p>';
    }
}


/**
 * Popüler markalar, arama ve filtreleme buton olaylarını ayarlar (Yeni Explore yapısı için).
 */
export function setupBrandAndFilterButtonEvents() {
    const popularBrandsListExplore = document.getElementById('popularBrandsListExplore'); // Bu zaten displayPopularBrands içinde handle ediliyor
    const searchInputExplore = document.getElementById('searchInputExplore');
    const searchButtonExplore = document.getElementById('searchButtonExplore');
    // const suggestionDropdown = document.getElementById('suggestionDropdown'); // Öneri DOM'da yok, eklenirse seçilir

    // Arama Butonu Tıklama
    if (searchButtonExplore && searchInputExplore) {
         const newBtn = searchButtonExplore.cloneNode(true);
         searchButtonExplore.parentNode.replaceChild(newBtn, searchButtonExplore);
        newBtn.addEventListener('click', () => {
            const searchTerm = searchInputExplore.value.trim();
            updateComplaintList(getComplaints(), searchTerm, localStorage.getItem('currentUser'));
        });

        // Enter ile Arama
        const newInput = searchInputExplore.cloneNode(true);
        searchInputExplore.parentNode.replaceChild(newInput, searchInputExplore);
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = newInput.value.trim();
                updateComplaintList(getComplaints(), searchTerm, localStorage.getItem('currentUser'));
            }
        });
    }
}

/**
 * Arama terimine göre şikayet/marka önerileri getirir.
 */
function getComplaintSuggestions(filterTerm) {
    const lowerCaseFilter = filterTerm.toLowerCase().trim();
    if (lowerCaseFilter.length < 2) return [];
    const approvedComplaints = getComplaints().filter(c => !c.pendingApproval);
    const suggestions = []; const addedBrands = new Set(); const addedTitles = new Set();
    approvedComplaints.forEach(c => { if (suggestions.length >= MAX_SUGGESTIONS) return; const brandLower = c.brand?.toLowerCase().trim(); if (brandLower && brandLower.includes(lowerCaseFilter) && !addedBrands.has(brandLower)) { suggestions.push({ type: 'brand', text: c.brand.trim() }); addedBrands.add(brandLower); } });
    approvedComplaints.forEach(c => { if (suggestions.length >= MAX_SUGGESTIONS) return; const titleLower = c.title?.toLowerCase().trim(); if (titleLower && titleLower.includes(lowerCaseFilter) && !addedTitles.has(titleLower)) { const shortTitle = c.title.trim().length > 50 ? c.title.trim().substring(0, 47) + '...' : c.title.trim(); suggestions.push({ type: 'title', text: shortTitle, brand: c.brand?.trim() || '' }); addedTitles.add(titleLower); } });
    return suggestions;
}

/**
 * Önerileri dropdown içinde gösterir.
 */
function displaySuggestions(suggestions, dropdown, searchInput) {
    if (!dropdown || !searchInput) return;
    if (suggestions.length === 0) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = suggestions.map(suggestion => { const icon = suggestion.type === 'brand' ? 'fa-tag' : 'fa-file-alt'; const displayText = suggestion.type === 'brand' ? `<strong>${sanitizeHTML(suggestion.text)}</strong> <small class='text-muted'>(Marka)</small>` : `${sanitizeHTML(suggestion.text)} ${suggestion.brand ? `<small class='text-muted'>(${sanitizeHTML(suggestion.brand)})</small>` : ''}`; const dataAttribute = `data-search="${sanitizeHTML(suggestion.type === 'brand' ? suggestion.text : suggestion.text)}"`; return `<a href="#" class="dropdown-item complaint-suggestion" ${dataAttribute}><i class="fas ${icon} me-2 text-muted fa-fw"></i> ${displayText}</a>`; }).join('');
    dropdown.style.display = 'block';
}

/**
 * Görsel önizlemesini günceller ve base64 veriyi callback ile döner.
 */
export function previewImage(event, callback) {
    const fileInput = event.target;
    const file = fileInput?.files?.[0];
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const resetPreview = () => { if (imagePreview && imagePreviewContainer) { imagePreview.src = '#'; imagePreviewContainer.style.display = 'none'; } if(fileInput) fileInput.value = ''; callback?.(null); };
    if (!imagePreview || !imagePreviewContainer) return resetPreview(); if (!file) return resetPreview();
    if (!file.type.startsWith('image/')) { showToast('Lütfen geçerli bir resim dosyası seçin.', 'Hata', 'warning'); return resetPreview(); }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) { showToast(`Maksimum ${MAX_FILE_SIZE_MB}MB.`, 'Hata', 'warning'); return resetPreview(); }
    const reader = new FileReader();
    reader.onload = (e) => { imagePreview.src = e.target.result; imagePreviewContainer.style.display = 'block'; callback?.(e.target.result); };
    reader.onerror = () => { showToast('Resim okuma hatası.', 'Hata', 'error'); resetPreview(); };
    reader.readAsDataURL(file);
}

/**
 * Şikayet formunu temizler ve validasyonları sıfırlar.
 */
export function clearComplaintForm() {
    const form = document.getElementById('complaintForm');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const fileInput = document.getElementById('complaintImage');
    if (form) { form.reset(); form.classList.remove('was-validated'); form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid')); }
    if (imagePreview && imagePreviewContainer) { imagePreview.src = '#'; imagePreviewContainer.style.display = 'none'; }
    if (fileInput) { fileInput.value = ''; }
}

/**
 * Fiyatlandırma planlarını ana sayfada gösterir ve toggle işlevselliğini ekler.
 */
export function displayPricingPlans() {
    const pricingPlansContainer = document.getElementById('pricingPlans');
    const monthlyToggle = document.querySelector('.billing-toggle[data-billing="monthly"]');
    const yearlyToggle = document.querySelector('.billing-option[data-billing="yearly"]');

    if (!pricingPlansContainer || !monthlyToggle || !yearlyToggle) {
         console.error("Fiyatlandırma planı konteyneri (#pricingPlans) veya toggle butonları bulunamadı!");
         if(pricingPlansContainer) pricingPlansContainer.innerHTML = '<p class="text-center text-danger">Fiyat planları yüklenemedi.</p>';
         return;
    }

    const pricingData = {
        monthly: [ { title: "Ücretsiz", price: "0₺", features: ["Sınırsız şikayet", "Temel arama", "Topluluk yorumları"], buttonText: "Başla", buttonClass: "modern-btn-primary", popular: false }, { title: "Premium", price: "29.99₺", features: ["Öncelikli yayınlama", "Gelişmiş istatistikler", "Markalarla iletişim", "Reklamsız deneyim"], buttonText: "Premium'a Geç", buttonClass: "modern-btn-success", popular: false }, { title: "Pro", price: "49.99₺", features: ["Premium+", "Detaylı marka analizi", "Özel destek", "API Erişimi (Yakında)"], buttonText: "Pro'ya Geç", buttonClass: "modern-btn-warning", popular: true } ],
        yearly: [ { title: "Ücretsiz", price: "0₺", features: ["Sınırsız şikayet", "Temel arama", "Topluluk yorumları"], buttonText: "Başla", buttonClass: "modern-btn-primary", popular: false }, { title: "Premium", price: "287.90₺", features: ["Öncelikli yayınlama", "Gelişmiş istatistikler", "Markalarla iletişim", "Reklamsız deneyim"], buttonText: "Premium'a Geç", buttonClass: "modern-btn-success", popular: false }, { title: "Pro", price: "479.90₺", features: ["Premium+", "Detaylı marka analizi", "Özel destek", "API Erişimi (Yakında)"], buttonText: "Pro'ya Geç", buttonClass: "modern-btn-warning", popular: true } ]
    };

     const renderPlans = (billingType) => {
         const plans = pricingData[billingType];
         pricingPlansContainer.innerHTML = plans.map(plan => `
            <div class="col-md-6 col-lg-4 mb-4 d-flex align-items-stretch">
                <div class="card h-100 shadow-sm ${plan.popular ? 'popular-plan border-warning' : ''} w-100">
                    ${plan.popular ? '<div class="popular-badge bg-warning text-dark">Popüler</div>' : ''}
                    <div class="card-body text-center d-flex flex-column">
                         <h5 class="card-title">${plan.title}</h5>
                         <h6 class="card-subtitle display-6 fw-light mb-3">${plan.price}<span class="small text-muted">/${billingType === 'monthly' ? 'ay' : 'yıl'}</span></h6>
                         <ul class="list-group list-group-flush mb-4 text-start small flex-grow-1">
                             ${plan.features.map(feature => `<li class="list-group-item border-0 px-0"><i class="fas fa-check text-success me-2"></i> ${feature}</li>`).join('')}
                         </ul>
                         <button class="btn ${plan.buttonClass} mt-auto">${plan.buttonText}</button>
                     </div>
                 </div>
             </div>`).join('');
         document.querySelectorAll('.popular-plan .popular-badge').forEach(badge => { badge.style.borderColor = 'var(--warning)'; });
    };

    const setActiveToggle = (activeType) => {
         if (activeType === 'monthly') { newMonthlyToggle.classList.add('active'); newYearlyToggle.classList.remove('active', 'text-primary', 'fw-bold'); newYearlyToggle.classList.add('text-muted'); }
         else { newMonthlyToggle.classList.remove('active'); newYearlyToggle.classList.add('active', 'text-primary', 'fw-bold'); newYearlyToggle.classList.remove('text-muted'); }
        renderPlans(activeType);
    };

    // Olay dinleyicilerini temizleyip yeniden ekle
    const newMonthlyToggle = monthlyToggle.cloneNode(true);
    monthlyToggle.parentNode.replaceChild(newMonthlyToggle, monthlyToggle);
    newMonthlyToggle.addEventListener('click', () => setActiveToggle('monthly'));

    const newYearlyToggle = yearlyToggle.cloneNode(true);
    yearlyToggle.parentNode.replaceChild(newYearlyToggle, yearlyToggle);
    newYearlyToggle.addEventListener('click', () => setActiveToggle('yearly'));

    // İlk render
    try { setActiveToggle('monthly'); }
    catch (error) { console.error("Fiyat planları render hatası:", error); pricingPlansContainer.innerHTML = '<p class="text-center text-danger">Fiyat planları yüklenemedi.</p>'; }
}

/**
 * Admin panelindeki onay bekleyen şikayetler tablosunu günceller.
 */
export function updateAdminTable(allComplaints) {
     const tableBody = document.getElementById('adminComplaintTableBody');
     const noPendingMsg = document.getElementById('noPendingComplaintsMsg');
     const adminTable = document.getElementById('adminComplaintTable');
     if (!tableBody || !noPendingMsg || !adminTable) return;
     tableBody.innerHTML = '';
     const pendingComplaints = allComplaints.filter(c => c.pendingApproval);
     if (pendingComplaints.length === 0) { noPendingMsg.textContent = 'Onay bekleyen yeni şikayet yok.'; noPendingMsg.style.display = 'block'; adminTable.style.display = 'none'; }
     else { noPendingMsg.style.display = 'none'; adminTable.style.display = 'table'; pendingComplaints.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(complaint => { const row = tableBody.insertRow(); row.innerHTML = `<td>${complaint.id}</td><td class="text-start">${sanitizeHTML(complaint.title)}</td><td class="text-start">${sanitizeHTML(complaint.brand)}</td><td>${formatDate(complaint.date)}</td><td><span class="badge bg-warning text-dark">Onay Bekliyor</span></td><td class="action-buttons"><button class="btn btn-sm modern-btn-info view-btn" data-id="${complaint.id}" title="Gör"><i class="fas fa-eye"></i></button><button class="btn btn-sm modern-btn-success approve-btn" data-id="${complaint.id}" title="Onayla"><i class="fas fa-check"></i></button><button class="btn btn-sm modern-btn-danger reject-btn" data-id="${complaint.id}" title="Reddet"><i class="fas fa-times"></i></button><button class="btn btn-sm modern-btn-warning edit-btn" data-id="${complaint.id}" title="Düzenle"><i class="fas fa-edit"></i></button><button class="btn btn-sm modern-btn-secondary comment-btn" data-id="${complaint.id}" title="Not Ekle"><i class="fas fa-comment-dots"></i></button></td>`; }); }
}

/**
 * Genel site istatistiklerini (ana bölümdeki) hesaplar ve gösterir.
 */
export function displaySiteStats() {
    const totalComplaintsEl = document.getElementById('statsTotalComplaints');
    const solvedComplaintsEl = document.getElementById('statsSolvedComplaints');
    const totalBrandsEl = document.getElementById('statsTotalBrands');

    if (!totalComplaintsEl || !solvedComplaintsEl || !totalBrandsEl) { console.warn("Ana istatistik elementleri bulunamadı."); return; }
    try {
        const complaints = getComplaints().filter(c => !c.pendingApproval);
        const solvedCount = complaints.filter(c => c.status?.toLowerCase() === 'çözüldü').length;
        const uniqueBrands = new Set(complaints.map(c => c.brand?.trim()).filter(Boolean));
        totalComplaintsEl.textContent = complaints.length;
        solvedComplaintsEl.textContent = solvedCount;
        totalBrandsEl.textContent = uniqueBrands.size;
    } catch (error) { console.error("Ana İstatistikler hatası:", error); totalComplaintsEl.textContent = "-"; solvedComplaintsEl.textContent = "-"; totalBrandsEl.textContent = "-"; }
}

/**
 * Son eklenen onaylanmış şikayetleri ana sayfada bir slider içinde gösterir.
 */
export function displayLatestComplaints(count = 5) {
     const latestListContainer = document.getElementById('latestComplaintList');
     if (!latestListContainer) { console.warn("Son şikayetler listesi elementi (#latestComplaintList) bulunamadı."); return; }
     try {
         const latestComplaints = getComplaints().filter(c => !c.pendingApproval).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, count);
         latestListContainer.innerHTML = ''; // Önce temizle
         if (latestComplaints.length === 0) { latestListContainer.innerHTML = '<p class="text-muted text-center">Henüz gösterilecek şikayet yok.</p>'; return; }

         const sliderContainer = document.createElement('div'); sliderContainer.className = 'slider-container';
         const sliderTrack = document.createElement('div'); sliderTrack.className = 'slider-track';

         latestComplaints.forEach(complaint => {
             const cardElement = createComplaintCard(complaint, localStorage.getItem('currentUser'), { showActions: true }); // Like/dislike görünsün
             cardElement.style.marginRight = '1.5rem'; cardElement.style.flex = '0 0 300px';
             sliderTrack.appendChild(cardElement);
         });

         // Klonlama (sonsuz döngü için)
         if (latestComplaints.length > 0 && latestComplaints.length < 5) { // Sadece az sayıda kart varsa klonla (geniş ekranlar için)
            const cardsToClone = Array.from(sliderTrack.children);
            cardsToClone.forEach(card => { const clone = card.cloneNode(true); sliderTrack.appendChild(clone); });
         }

         sliderContainer.appendChild(sliderTrack);
         latestListContainer.appendChild(sliderContainer);
         addEventListenersToComplaintCards(sliderTrack, localStorage.getItem('currentUser')); // Slider içindeki kartlara listener ekle
     } catch (error) {
         console.error("Son şikayetler yüklenirken hata:", error);
         latestListContainer.innerHTML = '<p class="text-danger text-center">Şikayetler yüklenirken bir hata oluştu.</p>';
     }
}