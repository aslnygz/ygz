// ui.js - Kullanıcı Arayüzü Yönetimi (Düzeltilmiş)

// data.js ve utils.js'den fonksiyonları import et (module scope içinde)
import { getComplaints, addCommentToComplaint, likeComplaint, dislikeComplaint } from './data.js';
import { showToast, autoResizeTextarea, capitalizeFirstLetter, getDistinctColors, formatDate, sanitizeHTML } from './utils.js';

// Sabitler
const EXCERPT_LENGTH = 120;
const MAX_FILE_SIZE_MB = 2;
const FEATURED_COMPLAINT_COUNT = 3; // Öne çıkanlar widget'ı için

// Grafik nesneleri (Chart.js)
let brandSentimentChart = null;
let brandCategoryChart = null;

/**
 * Şikayet derecelendirmelerinin ortalamasını hesaplar.
 * @param {object} ratings Derecelendirme objesi.
 * @returns {number} Ortalama değeri (1-5 arası, 1 ondalık).
 */
function calculateAverageRatingUtil(ratings) {
    if (!ratings || typeof ratings !== 'object' || Object.keys(ratings).length === 0) {
        return 0;
    }
    
    let total = 0;
    let count = 0;
    
    for (const key in ratings) {
        const rating = parseFloat(ratings[key]);
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
            total += rating;
            count++;
        }
    }
    
    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
}

/**
 * Durum metnini CSS sınıflarında kullanılabilecek formata dönüştürür.
 * @param {string} status Durum metni.
 * @returns {string} CSS sınıfı için uygun durum metni.
 */
function normalizeStatusUtil(status) {
    if (!status) return 'unknown';
    return status.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Aksanlı karakterleri kaldır
        .replace(/\s+/g, '') // Boşlukları kaldır
        .replace(/[^a-z0-9]/g, ''); // Alfanumerik olmayan karakterleri kaldır
}

/**
 * HTML içeriğini sanitize eder (utils.js fonksiyonuna wrapper).
 * @param {string} html Sanitize edilecek HTML.
 * @returns {string} Sanitize edilmiş HTML.
 */
function sanitizeHTMLUtil(html) {
    return sanitizeHTML(html);
}

/**
 * Arama sonuçlarını veya marka bazlı şikayetleri Explore bölümündeki widget'ta günceller.
 * @param {Array} allComplaints Tüm şikayetler dizisi (getComplaints() sonucu).
 * @param {string} filterTerm Arama terimi (marka, başlık veya açıklama).
 * @param {string} categoryFilter Kategori filtresi değeri.
 * @param {string} currentUserId Mevcut kullanıcı ID'si.
 */
export function updateComplaintList(allComplaints, filterTerm = '', categoryFilter = '', currentUserId = null) {
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const searchResultsList = document.getElementById('searchResultsList');
    const noResultsMsg = document.getElementById('noSearchResults');
    const searchWidgetTitle = document.querySelector('#explore .search-widget .widget-title'); // Başlığı güncellemek için

    if (!searchResultsContainer || !searchResultsList || !noResultsMsg || !searchWidgetTitle) {
        console.error("Arama sonuçları elementleri (#searchResultsContainer, #searchResultsList, #noSearchResults, .search-widget .widget-title) DOM'da bulunamadı!");
        return;
    }

    const approvedComplaints = allComplaints.filter(c => !c.pendingApproval); // Sadece onaylanmışları göster
    const lowerCaseFilter = filterTerm.toLowerCase().trim();

    let filteredComplaints = approvedComplaints;

    // Kategoriye göre filtrele (eğer seçiliyse)
    if (categoryFilter) {
        filteredComplaints = filteredComplaints.filter(c => c.category === categoryFilter);
    }

    // Arama terimine göre filtrele (eğer varsa)
    if (lowerCaseFilter) {
        filteredComplaints = filteredComplaints.filter(c =>
            (c.title?.toLowerCase().includes(lowerCaseFilter)) ||
            (c.description?.toLowerCase().includes(lowerCaseFilter)) ||
            (c.brand?.toLowerCase().includes(lowerCaseFilter))
        );
    }

    // Sonuçları göster/gizle
    if (!lowerCaseFilter && !categoryFilter) { // Filtre yoksa sonuçları gizle
        searchResultsContainer.style.display = 'none';
        searchResultsList.innerHTML = '';
        noResultsMsg.style.display = 'none';
        searchWidgetTitle.innerHTML = '<i class="fas fa-search me-2 text-primary"></i> Şikayet Ara'; // Başlığı sıfırla
        hideBrandStats(); // Marka istatistiklerini gizle
        return;
    }

    // Sonuçlar varsa konteyneri göster
    searchResultsContainer.style.display = 'block';
    searchResultsList.innerHTML = ''; // Önceki sonuçları temizle

    if (filteredComplaints.length === 0) {
        noResultsMsg.style.display = 'block'; // "Sonuç yok" mesajını göster
        searchWidgetTitle.innerHTML = `<i class="fas fa-search-minus me-2"></i> Sonuç Bulunamadı`;
        hideBrandStats(); // Marka istatistiklerini gizle
    } else {
        noResultsMsg.style.display = 'none'; // "Sonuç yok" mesajını gizle
        searchWidgetTitle.innerHTML = `<i class="fas fa-list me-2"></i> Arama Sonuçları (${filteredComplaints.length})`;

        // Sonuçları render et (en yeni en üstte)
        filteredComplaints
            .sort((a, b) => b.date - a.date) // Date objesi olarak sırala
            .forEach(complaint => {
                const cardElement = createComplaintCard(complaint, currentUserId); // Element olarak oluştur
                searchResultsList.appendChild(cardElement); // Elementi ekle
            });

        addEventListenersToComplaintCards(searchResultsList, currentUserId); // Olay dinleyicilerini ekle

        // Eğer sadece marka araması yapıldıysa ve sonuç varsa istatistikleri göster
        const isBrandSearch = approvedComplaints.some(c => c.brand?.toLowerCase().trim() === lowerCaseFilter);
        if (isBrandSearch && filteredComplaints.length > 0 && !categoryFilter) { // Sadece marka adı ile arama yapıldıysa
             displayBrandStats(capitalizeFirstLetter(lowerCaseFilter));
        } else {
             hideBrandStats();
        }
    }
}


/**
 * Belirtilen liste içindeki şikayet kartlarına tıklama ve like/dislike olay dinleyicilerini ekler.
 * @param {HTMLElement} listElement Olay dinleyicisinin ekleneceği liste (örn: #searchResultsList, #latestComplaintList .slider-track).
 * @param {string|null} currentUserId Mevcut kullanıcı ID'si.
 */
function addEventListenersToComplaintCards(listElement, currentUserId) {
    if (!listElement) return;

    // Olay delegasyonu kullanarak ana listeye tek bir listener ekle
    const listClickHandler = (e) => {
        const card = e.target.closest('.complaint-card, .complaint-summary-card'); // Kart veya özet kartı
        const likeBtn = e.target.closest('.like-btn');
        const dislikeBtn = e.target.closest('.dislike-btn');

        if (likeBtn && card) {
            e.stopPropagation(); // Kartın tıklama olayını tetikleme
            const complaintId = parseInt(card.dataset.id);
            const button = likeBtn;
            if (!isNaN(complaintId) && currentUserId) {
                handleLikeDislikeAction(complaintId, 'like', currentUserId, button);
            } else if (!currentUserId) {
                 showToast('Beğenmek için giriş yapmalısınız (simüle ediliyor).', 'Uyarı', 'warning');
            }
        } else if (dislikeBtn && card) {
            e.stopPropagation();
            const complaintId = parseInt(card.dataset.id);
             const button = dislikeBtn;
            if (!isNaN(complaintId) && currentUserId) {
                handleLikeDislikeAction(complaintId, 'dislike', currentUserId, button);
            } else if (!currentUserId) {
                 showToast('Beğenmemek için giriş yapmalısınız (simüle ediliyor).', 'Uyarı', 'warning');
            }
        } else if (card) {
            // Kartın kendisine tıklandı (like/dislike değil) -> Detayları aç
            const complaintId = parseInt(card.dataset.id);
            if (!isNaN(complaintId)) {
                const complaint = getComplaints().find(c => c.id === complaintId); // data.js'den al
                if (complaint) {
                    displayComplaintDetail(complaint, 'user', currentUserId); // ui.js fonksiyonu
                    const detailModalElement = document.getElementById('complaintDetailModal');
                    if (detailModalElement) {
                        const detailModal = bootstrap.Modal.getInstance(detailModalElement) || new bootstrap.Modal(detailModalElement);
                        detailModal.show();
                    }
                } else {
                    console.warn(`Şikayet ID ${complaintId} bulunamadı.`);
                    showToast('Şikayet detayı yüklenemedi.', 'Hata', 'error');
                }
            }
        }
    };

    // Eski listener'ı kaldırıp yenisini ekle (güvenlik için)
    const newListElement = listElement.cloneNode(true); // Derin klonlama
    listElement.parentNode.replaceChild(newListElement, listElement);
    newListElement.addEventListener('click', listClickHandler);
}

/**
 * Like/Dislike buton tıklama işlemini ve UI güncellemesini yönetir.
 * @param {number} complaintId
 * @param {'like' | 'dislike'} action
 * @param {string} currentUserId
 * @param {HTMLElement} button Tıklanan buton elementi.
 */
async function handleLikeDislikeAction(complaintId, action, currentUserId, button) {
    const likeDislikeSection = button.closest('.like-dislike-section');
    if (!likeDislikeSection) return;

    const likeBtn = likeDislikeSection.querySelector('.like-btn');
    const dislikeBtn = likeDislikeSection.querySelector('.dislike-btn');
    const likeCountEl = likeBtn?.querySelector('.count');
    const dislikeCountEl = dislikeBtn?.querySelector('.count');

    // Butonları geçici olarak devre dışı bırak
    if(likeBtn) likeBtn.disabled = true;
    if(dislikeBtn) dislikeBtn.disabled = true;

    try {
        // data.js'den ilgili fonksiyonu çağır
        const success = action === 'like'
            ? likeComplaint(complaintId, currentUserId)
            : dislikeComplaint(complaintId, currentUserId);

        if (success) {
            // Başarılıysa, güncel veriyi al
            const updatedComplaint = getComplaints().find(c => c.id === complaintId);
            if (updatedComplaint && likeCountEl && dislikeCountEl && likeBtn && dislikeBtn) {
                // Sayıları ve buton durumlarını güncelle
                const likes = updatedComplaint.likes || {};
                const dislikes = updatedComplaint.dislikes || {};
                likeCountEl.textContent = Object.keys(likes).length;
                dislikeCountEl.textContent = Object.keys(dislikes).length;
                likeBtn.classList.toggle('active-like', !!likes[currentUserId]);
                dislikeBtn.classList.toggle('active-dislike', !!dislikes[currentUserId]);
            }
        } else {
            showToast(action === 'like' ? 'Beğeni başarısız.' : 'Beğenmeme başarısız.', 'Hata', 'error');
        }
    } catch (error) {
        console.error(`${action} hatası:`, error);
        showToast('İşlem sırasında bir hata oluştu.', 'Hata', 'error');
    } finally {
         // Butonları tekrar etkinleştir
         if(likeBtn) likeBtn.disabled = false;
         if(dislikeBtn) dislikeBtn.disabled = false;
    }
}


/**
 * Tek bir şikayet için HTML kartı oluşturur (div elementi olarak).
 * @param {object} complaint Şikayet verisi (Date objesi ile).
 * @param {string|null} currentUserId Mevcut kullanıcı ID'si.
 * @param {object} options Ekstra seçenekler (örn: { showActions: true }).
 * @returns {HTMLElement} Oluşturulan div elementi.
 */
function createComplaintCard(complaint, currentUserId, options = { showActions: true }) {
    const cardDiv = document.createElement('div');
    // Durumu normalize et ve CSS sınıfı oluştur
    const statusClass = normalizeStatusUtil(complaint.pendingApproval ? 'Beklemede' : complaint.status);
    cardDiv.className = `complaint-card status-${statusClass}`;
    cardDiv.dataset.id = complaint.id; // ID'yi data attribute olarak ekle

    // Like/Dislike sayılarını ve kullanıcının durumunu al
    const likes = complaint.likes || {};
    const dislikes = complaint.dislikes || {};
    const likeCount = Object.keys(likes).length;
    const dislikeCount = Object.keys(dislikes).length;
    const userLiked = currentUserId && !!likes[currentUserId];
    const userDisliked = currentUserId && !!dislikes[currentUserId];

    // Ortalama Puanı Hesapla ve HTML'ini oluştur
    let avgRatingHtml = '<span class="me-3 text-muted small">Puanlanmamış</span>';
    const avgRatingValue = calculateAverageRatingUtil(complaint.ratings);
    if (avgRatingValue > 0) {
         avgRatingHtml = `<div class="d-flex align-items-center" title="Ortalama Puan"><div class="average-box">${avgRatingValue}</div></div>`;
    }

    // Durum Rozeti için CSS sınıfı belirle
    const badgeClass = complaint.pendingApproval ? 'bg-warning text-dark' : {
        'açık': 'bg-primary',
        'çözüldü': 'bg-success',
        'kapalı': 'bg-secondary',
        'beklemede': 'bg-warning text-dark'
    }[complaint.status?.toLowerCase()] || 'bg-info'; // Bilinmeyen durum için info

    // Güvenli HTML için sanitize et
    const safeBrand = sanitizeHTMLUtil(complaint.brand || 'Marka Belirtilmemiş');
    const safeCategory = sanitizeHTMLUtil(complaint.category || 'Kategori Yok');
    const safeTitle = sanitizeHTMLUtil(complaint.title || 'Başlık Yok');
    let safeDescription = sanitizeHTMLUtil(complaint.description || '');
    // Açıklama kısaltma
    if (safeDescription.length > EXCERPT_LENGTH) {
        const lastSpace = safeDescription.lastIndexOf(' ', EXCERPT_LENGTH);
        safeDescription = safeDescription.substring(0, lastSpace > 0 ? lastSpace : EXCERPT_LENGTH) + '...';
    }
    const safeStatus = sanitizeHTMLUtil(complaint.pendingApproval ? 'Onay Bekliyor' : complaint.status || 'Bilinmiyor');
    const formattedDate = formatDate(complaint.date); // utils.js'den formatla

    // Kartın iç HTML'ini oluştur
    cardDiv.innerHTML = `
        <div class="card-content-wrapper">
            <div class="card-header-info">
                <div class="brand-info">
                    <strong class="brand-tag">${safeBrand}</strong>
                    <span class="badge bg-light text-dark">${safeCategory}</span>
                </div>
                <span class="complaint-date">${formattedDate}</span>
            </div>
            <h5 class="complaint-title" role="button" title="${safeTitle}">${safeTitle}</h5>
            <p class="complaint-excerpt">${safeDescription}</p>
        </div>
        <div class="card-footer-info">
            <span class="badge status-badge ${badgeClass}">${safeStatus}</span>
            ${avgRatingHtml}
            ${options.showActions && currentUserId && !complaint.pendingApproval ? `
            <div class="like-dislike-section">
                <button class="btn btn-sm like-btn ${userLiked ? 'active-like' : ''}" title="Beğen">
                    <i class="far fa-thumbs-up"></i> <span class="count">${likeCount}</span>
                </button>
                <button class="btn btn-sm dislike-btn ${userDisliked ? 'active-dislike' : ''}" title="Beğenme">
                    <i class="far fa-thumbs-down"></i> <span class="count">${dislikeCount}</span>
                </button>
            </div>` : ''}
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
    const safeTitle = sanitizeHTMLUtil(complaint.title || 'Başlık Yok');
    const safeBrand = sanitizeHTMLUtil(complaint.brand || 'Markasız');
    // Etkileşim sayısını hesapla (like + dislike + yorum)
    const interactionCount = (Object.keys(complaint.likes || {}).length) +
                             (Object.keys(complaint.dislikes || {}).length) +
                             (complaint.comments ? complaint.comments.length : 0); // Sadece ana yorumları say şimdilik

    return `
        <div class="list-group-item list-group-item-action complaint-summary-card" data-id="${complaint.id}" role="button" tabindex="0">
            <h6 class="complaint-summary-title mb-1 text-truncate">${safeTitle}</h6>
            <div class="d-flex justify-content-between align-items-center">
                <span class="complaint-summary-brand small text-muted">${safeBrand}</span>
                <span class="complaint-summary-interactions small text-primary">
                    <i class="fas fa-fire me-1"></i> ${interactionCount} Etkileşim
                </span>
            </div>
        </div>
    `;
}

/**
 * Şikayet detaylarını modal içinde gösterir.
 * @param {object} complaint Gösterilecek şikayet (Date objesi ile).
 * @param {string} displayMode 'user' veya 'admin'.
 * @param {string} currentUserId Mevcut kullanıcı ID'si.
 */
export function displayComplaintDetail(complaint, displayMode = 'user', currentUserId = null) {
    const detailBody = document.getElementById('complaintDetailBody');
    const modalTitle = document.getElementById('complaintDetailModalLabel');
    const adminActionsContainer = document.getElementById('adminActionButtonsDetail'); // Detay modalındaki admin butonları

    if (!detailBody || !modalTitle || !adminActionsContainer) {
        showToast('Şikayet detayları gösterilemedi (DOM hatası).', 'Hata', 'error');
        return;
    }

    modalTitle.textContent = `Şikayet Detayı: #${complaint.id}`;
    adminActionsContainer.innerHTML = ''; // Önceki butonları temizle
    adminActionsContainer.style.display = 'none'; // Başlangıçta gizle

    // --- İçerik Oluşturma ---

    // Puanlama HTML'i
    let ratingsHtml = `<h6><i class="fas fa-star me-2 text-warning"></i>Değerlendirmeler</h6>`;
    const avgRating = calculateAverageRatingUtil(complaint.ratings);
    if (avgRating > 0) {
        const validRatingsHtml = Object.entries(complaint.ratings)
            .map(([category, rating]) => {
                const numericRating = Number(rating);
                if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) return '';
                const percentage = (numericRating / 5) * 100;
                const progressBarColor = percentage >= 80 ? 'bg-success' : percentage >= 50 ? 'bg-warning' : 'bg-danger';
                return `
                    <div class="mb-2 rating-detail-row">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="small fw-500">${sanitizeHTMLUtil(category)}</span>
                            <span class="small text-muted">${numericRating}/5</span>
                        </div>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar ${progressBarColor}" role="progressbar" style="width: ${percentage}%;" aria-valuenow="${numericRating}" aria-valuemin="0" aria-valuemax="5"></div>
                        </div>
                    </div>`;
            }).filter(Boolean).join('');
         ratingsHtml += `<div class="mb-3 p-2 border rounded bg-light">${validRatingsHtml || '<p class="text-muted small mb-0">Geçerli değerlendirme yok.</p>'}</div>`;
    } else {
        ratingsHtml += '<p class="text-muted small">Değerlendirme yapılmamış.</p>';
    }

    // Yorumlar HTML'i
    let commentsHtml = `<h6><i class="fas fa-comments me-2"></i>Yorumlar (${(complaint.comments || []).length})</h6>`;
    const renderedComments = generateCommentsHtml(complaint.comments || [], currentUserId, complaint.pendingApproval, complaint.id);
    commentsHtml += `<div class="comments-container mb-3 border rounded p-2 bg-light" style="max-height: 350px; overflow-y: auto;">${renderedComments || '<p class="text-muted small mb-0">Henüz yorum yapılmamış.</p>'}</div>`;

    // Güvenli Değişkenler
    const safeTitle = sanitizeHTMLUtil(complaint.title || 'Başlık Yok');
    const safeBrand = sanitizeHTMLUtil(complaint.brand || 'Marka Belirtilmemiş');
    const safeCategory = sanitizeHTMLUtil(complaint.category || 'Kategori Yok');
    const safeDescription = sanitizeHTMLUtil(complaint.description || '');
    const statusClass = complaint.pendingApproval ? 'bg-warning text-dark' : {
        'açık': 'bg-primary text-white',
        'çözüldü': 'bg-success text-white',
        'kapalı': 'bg-secondary text-white',
        'beklemede': 'bg-warning text-dark'
    }[complaint.status?.toLowerCase()] || 'bg-info text-white';
    const safeStatus = sanitizeHTMLUtil(complaint.pendingApproval ? 'Onay Bekliyor' : complaint.status || 'Bilinmiyor');
    const formattedDate = formatDate(complaint.date);

    // Modal İçeriği
    detailBody.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-8">
                <h4>${safeTitle}</h4>
                <div class="d-flex flex-wrap align-items-center mb-2 text-muted small gap-3">
                    <span><strong>Marka:</strong> ${safeBrand}</span>
                    <span><strong>Kategori:</strong> ${safeCategory}</span>
                    <span><strong>Tarih:</strong> ${formattedDate}</span>
                    <span><strong>Durum:</strong> <span class="badge ${statusClass}">${safeStatus}</span></span>
                </div>
                <hr>
                <h6><i class="fas fa-file-alt me-2"></i>Açıklama</h6>
                <p class="detail-description mb-3 p-2 border rounded">${safeDescription.replace(/\n/g, '<br>')}</p>
                <hr>
                <div class="ratings-section mb-3">${ratingsHtml}</div>
                ${!complaint.pendingApproval ? `
                <hr>
                <div class="comment-section">
                    ${commentsHtml}
                    <div class="mt-3 add-comment-form">
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
                </div>`
                : '<p class="mt-4 alert alert-warning small"><i class="fas fa-info-circle me-1"></i> Bu şikayet henüz onaylanmadığı için yorum yapılamaz veya yorumlar görüntülenemez.</p>'}
            </div>
            <div class="col-lg-4">
                <h6><i class="fas fa-image me-2"></i>Görsel</h6>
                ${complaint.image
                    ? `<a href="${complaint.image}" target="_blank" title="Görseli yeni sekmede aç"><img src="${complaint.image}" alt="Şikayet Görseli" class="img-fluid detail-image rounded border shadow-sm"></a>`
                    : '<div class="text-center p-3 border rounded bg-light" style="min-height: 200px; display:flex; align-items:center; justify-content:center;"><p class="text-muted small my-auto">Görsel eklenmemiş.</p></div>'}
            </div>
        </div>
    `;

    // Admin ise ve onay bekliyorsa butonları göster
    if (displayMode === 'admin' && complaint.pendingApproval) {
        adminActionsContainer.innerHTML = `
            <button class="btn modern-btn-success btn-sm approve-btn" data-id="${complaint.id}"> <i class="fas fa-check me-1"></i> Onayla </button>
            <button class="btn modern-btn-danger btn-sm reject-btn ms-2" data-id="${complaint.id}"> <i class="fas fa-times me-1"></i> Reddet (Sil) </button>
        `;
        adminActionsContainer.style.display = 'flex'; // Görünür yap
    }

    // Yorum ekleme/yanıtlama olay dinleyicilerini ayarla
    if (!complaint.pendingApproval) {
         setupDetailModalEventListeners(complaint, currentUserId);
    }
}


/**
 * Yorumlar ve yanıtlar için HTML yapısını oluşturur (iç içe).
 * @param {Array} comments Yorumlar dizisi (Date objeleri ile).
 * @param {string} currentUserId Mevcut kullanıcı ID'si.
 * @param {boolean} isPending Şikayetin onay durumu.
 * @param {number} complaintId Şikayet ID'si.
 * @param {number} depth Yanıt derinliği (iç içe görünüm için).
 * @returns {string} Oluşturulan HTML string'i.
 */
function generateCommentsHtml(comments, currentUserId, isPending, complaintId, depth = 0) {
    if (!comments || comments.length === 0) return '';

    const marginLeft = depth * 20; // Yanıtlar için girinti

    return `<div class="comment-thread" style="margin-left: ${marginLeft}px;">` +
        [...comments] // Orijinal diziyi değiştirmemek için kopyala
            .sort((a, b) => a.date - b.date) // Eskiden yeniye sırala
            .map(comment => {
                const isOwnComment = comment.userId === currentUserId;
                const isAdminComment = comment.userId === 'admin'; // 'admin' özel kullanıcı adı
                let userDisplay = '';
                if (isAdminComment) {
                    userDisplay = '<span class="badge bg-info me-1">Admin</span>';
                } else if (isOwnComment) {
                    userDisplay = '<span class="text-primary fw-bold">Siz</span>';
                } else {
                    // Kullanıcı ID'sinin sadece bir kısmını göster (gizlilik)
                    userDisplay = `<span class="text-muted">Kullanıcı ...${String(comment.userId || '????').slice(-4)}</span>`;
                }
                const formattedCommentDate = formatDate(comment.date); // utils.js'den formatla

                // Yanıtlar için HTML'i oluştur (recursive)
                const repliesHtml = (comment.replies && comment.replies.length > 0)
                    ? generateCommentsHtml(comment.replies, currentUserId, isPending, complaintId, depth + 1)
                    : '';

                return `
                    <div class="comment mb-2 pb-2 ${depth > 0 ? 'border-start border-2 ps-2' : ''}" data-comment-id="${comment.id}">
                        <p class="mb-1 small">${sanitizeHTMLUtil(comment.text)}</p>
                        <div class="comment-meta d-flex justify-content-between align-items-center">
                            <span class="small text-muted">${userDisplay} - ${formattedCommentDate}</span>
                            ${!isPending && depth < 3 ? `<button class="btn btn-link btn-sm reply-btn p-0" data-comment-id="${comment.id}" data-complaint-id="${complaintId}" title="Yanıtla">
                                <i class="fas fa-reply"></i>
                            </button>` : ''}
                        </div>
                        ${repliesHtml} </div>`;
            }).join('') +
        '</div>';
}


/**
 * Şikayet Detayı modalı içindeki olay dinleyicilerini (yorum ekleme, yanıtlama) ayarlar.
 * @param {object} complaint İlgili şikayet objesi (Date objeleri ile).
 * @param {string} currentUserId Mevcut kullanıcı ID'si.
 */
function setupDetailModalEventListeners(complaint, currentUserId) {
    const detailBody = document.getElementById('complaintDetailBody');
    if (!detailBody || complaint.pendingApproval) return; // Onaylanmamışsa veya body yoksa çık

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
        if (!element) return null;
        const newElement = element.cloneNode(true);
        element.parentNode?.replaceChild(newElement, element);
        newElement.addEventListener(event, handler);
        return newElement; // Yeni elementi döndür ki referans güncellensin
    };

    // --- Yeni Yorum Ekleme ---
    if (newCommentText) {
        const currentSubmitBtn = cleanAndAddListener(submitCommentBtn, 'click', () => {
            const commentText = newCommentText.value.trim();
            const complaintId = parseInt(currentSubmitBtn?.dataset.complaintId); // Butondan ID al
            if (!commentText) { showToast('Lütfen yorumunuzu yazın.', 'Uyarı', 'warning'); return; }
            if (isNaN(complaintId)) { showToast('Şikayet ID bulunamadı.', 'Hata', 'error'); return; }

            // data.js'den yorum ekleme fonksiyonunu çağır
            if (addCommentToComplaint(complaintId, commentText, currentUserId)) {
                showToast('Yorumunuz eklendi.', 'Başarılı', 'success');
                // UI'ı güncelle: Yorum listesini yeniden render et
                const updatedComplaint = getComplaints().find(c => c.id === complaintId); // Güncel veriyi al
                if (commentsContainer && updatedComplaint) {
                    commentsContainer.innerHTML = generateCommentsHtml(updatedComplaint.comments || [], currentUserId, updatedComplaint.pendingApproval, complaintId);
                    // Yeni eklenen yorumlar için de olay dinleyicilerini tekrar ayarla
                    setupDetailModalEventListeners(updatedComplaint, currentUserId);
                }
                newCommentText.value = ''; // Textarea'yı temizle
                autoResizeTextarea(newCommentText); // Boyutu sıfırla
                if (replyFormContainer) replyFormContainer.style.display = 'none'; // Yanıt formunu gizle
            } else {
                showToast('Yorum eklenirken bir hata oluştu.', 'Hata', 'error');
            }
        });
        // Textarea için otomatik boyutlandırmayı ayarla
        newCommentText.removeEventListener('input', () => autoResizeTextarea(newCommentText)); // Önce varsa kaldır
        newCommentText.addEventListener('input', () => autoResizeTextarea(newCommentText));
    }

    // --- Yanıtlama İşlemleri ---
    detailBody.querySelectorAll('.reply-btn').forEach(btn => {
        cleanAndAddListener(btn, 'click', (e) => {
            e.preventDefault();
            const parentCommentId = parseInt(btn.dataset.commentId);
            const complaintId = parseInt(btn.dataset.complaintId);

            if (isNaN(parentCommentId) || isNaN(complaintId) || !replyFormContainer || !replyingTo || !replyCommentText || !submitReplyBtn || !cancelReplyBtn) {
                console.error("Yanıt form elementleri eksik veya ID'ler geçersiz.");
                return;
            }

            // Yanıtlanacak yorumu bul (iç içe arama)
            const findComment = (comments, id) => {
                 if (!comments) return null;
                 for (const c of comments) {
                     if (c.id === id) return c;
                     if (c.replies) { const found = findComment(c.replies, id); if (found) return found; }
                 } return null;
             };
            const parentComment = findComment(complaint.comments || [], parentCommentId);
            if (!parentComment) { showToast('Yanıtlanacak yorum bulunamadı.', 'Hata', 'error'); return; }

            // Yanıt formunu göster ve ayarla
            replyingTo.textContent = `Yanıtlanan: "${sanitizeHTMLUtil(parentComment.text.substring(0, 30))}..."`;
            replyFormContainer.style.display = 'block';
            replyCommentText.value = '';
            replyCommentText.focus();
            autoResizeTextarea(replyCommentText); // Boyutu ayarla

            // Yanıt Gönderme Butonu
            const currentSubmitReplyBtn = cleanAndAddListener(submitReplyBtn, 'click', () => {
                const replyText = replyCommentText.value.trim();
                if (!replyText) { showToast('Lütfen yanıtınızı yazın.', 'Uyarı', 'warning'); return; }

                // data.js'den yanıt ekleme fonksiyonunu çağır (parentCommentId ile)
                if (addCommentToComplaint(complaintId, replyText, currentUserId, parentCommentId)) {
                    showToast('Yanıtınız eklendi.', 'Başarılı', 'success');
                    // UI'ı güncelle
                    const updatedComplaint = getComplaints().find(c => c.id === complaintId);
                    if (commentsContainer && updatedComplaint) {
                        commentsContainer.innerHTML = generateCommentsHtml(updatedComplaint.comments || [], currentUserId, updatedComplaint.pendingApproval, complaintId);
                        setupDetailModalEventListeners(updatedComplaint, currentUserId); // Tekrar ayarla
                    }
                    replyFormContainer.style.display = 'none'; // Formu gizle
                } else {
                    showToast('Yanıt eklenirken bir hata oluştu.', 'Hata', 'error');
                }
            });

            // İptal Butonu
            if(cancelReplyBtn) {
                const currentCancelBtn = cleanAndAddListener(cancelReplyBtn, 'click', () => {
                    replyFormContainer.style.display = 'none';
                    replyCommentText.value = '';
                });
            }
            // Yanıt Textarea Boyutlandırma
             if(replyCommentText) {
                 replyCommentText.removeEventListener('input', () => autoResizeTextarea(replyCommentText));
                 replyCommentText.addEventListener('input', () => autoResizeTextarea(replyCommentText));
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
        // Onaylanmış ve marka adı olan şikayetleri al
        const brandCounts = getComplaints()
            .filter(c => !c.pendingApproval && c.brand?.trim())
            .reduce((acc, { brand }) => {
                const cleanBrand = capitalizeFirstLetter(brand.trim()); // Marka adını düzelt
                acc[cleanBrand] = (acc[cleanBrand] || 0) + 1;
                return acc;
            }, {});

        // Sayıya göre sırala ve belirtilen adette al
        const sortedBrands = Object.entries(brandCounts)
            .sort(([, countA], [, countB]) => countB - countA) // Çoktan aza sırala
            .slice(0, count);

        // Listeyi oluştur
        popularBrandsListElement.innerHTML = sortedBrands.length === 0
            ? '<p class="text-center text-muted small p-2">Henüz popüler marka yok.</p>'
            : sortedBrands.map(([brandName, complaintCount]) => `
                <a href="#" class="list-group-item list-group-item-action popular-brand-item d-flex justify-content-between align-items-center" data-brand="${sanitizeHTMLUtil(brandName)}">
                    <span>${sanitizeHTMLUtil(brandName)}</span>
                    <span class="badge bg-secondary rounded-pill">${complaintCount}</span>
                </a>`).join('');

        // Tıklama olaylarını ekle
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
    // Olay delegasyonu kullan
    listElement.addEventListener('click', (e) => {
        const target = e.target.closest('.popular-brand-item');
        if (target?.dataset.brand) {
            e.preventDefault(); // Linkin varsayılan davranışını engelle
            const brandName = target.dataset.brand;
            const searchInput = document.getElementById('searchInputExplore');
            const categorySelect = document.getElementById('categorySelectExplore');

            if (searchInput && categorySelect) {
                searchInput.value = brandName; // Arama kutusunu doldur
                categorySelect.value = ""; // Kategori filtresini temizle
                // Arama fonksiyonunu tetikle (ui.js içindeki)
                updateComplaintList(getComplaints(), brandName, "", localStorage.getItem('currentUser'));
                // Arama widget'ına scroll yap ve focusla
                const searchWidget = searchInput.closest('.widget-card');
                searchWidget?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                searchInput.focus();
            }
        }
    });
}


/**
 * Belirli bir markanın istatistiklerini Explore bölümündeki widget'ta gösterir.
 */
export function displayBrandStats(brandName) {
    const contentContainer = document.getElementById('featuredComplaintsContent');
    const chartContainer = document.getElementById('brandStatsCharts');
    const statsBrandNameEl = document.getElementById('statsBrandName'); // Element adı düzeltildi
    const sentimentChartCanvas = document.getElementById('brandSentimentChart');
    const categoryChartCanvas = document.getElementById('brandCategoryChart');
    const statsInfoEl = document.getElementById('brandStatsInfo'); // Element adı düzeltildi
    const widgetTitle = document.querySelector('#explore .featured-complaints-widget .widget-title');

    if (!contentContainer || !chartContainer || !statsBrandNameEl || !sentimentChartCanvas || !categoryChartCanvas || !statsInfoEl || !widgetTitle) {
         console.warn("Marka istatistik widget elementleri bulunamadı!");
         return;
    }

    const lowerCaseBrandName = brandName.toLowerCase().trim();
    // Onaylanmış şikayetleri filtrele
    const brandComplaints = getComplaints().filter(c => !c.pendingApproval && c.brand?.toLowerCase().trim() === lowerCaseBrandName);

    if (brandComplaints.length === 0) {
        hideBrandStats(); // Veri yoksa öne çıkanları göster
        return;
    }

    // Widget başlığını ve görünürlüğü ayarla
    widgetTitle.innerHTML = `<i class="fas fa-chart-pie me-2 text-info"></i> ${capitalizeFirstLetter(brandName)} İstatistikleri`;
    contentContainer.innerHTML = ''; // Öne çıkanları temizle
    chartContainer.style.display = 'block';
    statsInfoEl.style.display = 'none'; // Bilgi yazısını gizle
    statsBrandNameEl.textContent = capitalizeFirstLetter(brandName);

    // Mevcut grafikleri yok et
    if (brandSentimentChart) brandSentimentChart.destroy();
    if (brandCategoryChart) brandCategoryChart.destroy();

    // --- Veri Hesaplama ---
    let good = 0, average = 0, bad = 0, unrated = 0;
    const categoryCounts = {};
    brandComplaints.forEach(c => {
        // Duygu Analizi (Ortalama Puana Göre)
        const avgRating = calculateAverageRatingUtil(c.ratings);
        if (avgRating > 0) {
            if (avgRating >= 4.0) good++;
            else if (avgRating >= 2.5) average++;
            else bad++;
        } else {
            unrated++;
        }
        // Kategori Sayımı
        if (c.category?.trim()) {
            const cat = capitalizeFirstLetter(c.category.trim());
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
    });

    // --- Grafik Çizdirme ---
    // Duygu Analizi Grafiği (Doughnut)
    brandSentimentChart = new Chart(sentimentChartCanvas, {
        type: 'doughnut',
        data: {
            labels: [`İyi (${good})`, `Orta (${average})`, `Kötü (${bad})`, `Puansız (${unrated})`],
            datasets: [{
                data: [good, average, bad, unrated].filter(v => v > 0), // Sadece 0'dan büyük değerleri al
                 backgroundColor: ['#198754', '#ffc107', '#dc3545', '#6c757d'].filter((_, i) => [good, average, bad, unrated][i] > 0), // Renkleri de filtrele
                borderColor: getComputedStyle(document.body).getPropertyValue('--card-bg') || '#ffffff', // Tema uyumlu kenarlık
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '60%',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}` } } } // Tooltip'te sadece etiket
        }
    });

    // Kategori Dağılımı Grafiği (Pie)
    const categoryLabels = Object.keys(categoryCounts);
    const categoryData = Object.values(categoryCounts);
    const categoryChartContainer = categoryChartCanvas.closest('.chart-container');
    const existingMsg = categoryChartContainer?.querySelector('.no-category-data');
    if (existingMsg) existingMsg.remove(); // Eski mesajı kaldır

    if (categoryLabels.length > 0) {
        categoryChartCanvas.style.display = 'block';
        brandCategoryChart = new Chart(categoryChartCanvas, {
            type: 'pie',
            data: {
                labels: categoryLabels, //.map(cat => `${cat} (${categoryCounts[cat]})`), // Etikete sayıyı ekleme
                datasets: [{
                    data: categoryData,
                    backgroundColor: getDistinctColors(categoryLabels.length),
                    borderColor: getComputedStyle(document.body).getPropertyValue('--card-bg') || '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: categoryLabels.length <= 6, position: 'bottom', labels: { font: { size: 10 }, boxWidth: 15 } }, // Az kategori varsa göster
                    tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}` } }
                }
            }
        });
    } else {
        // Kategori verisi yoksa mesaj göster
        categoryChartCanvas.style.display = 'none';
        const p = document.createElement('p');
        p.className = 'text-muted small text-center mt-2 no-category-data';
        p.textContent = 'Bu marka için kategori verisi bulunamadı.';
        categoryChartContainer?.appendChild(p);
    }
}

/**
 * Marka istatistiklerini gizler ve yerine öne çıkan şikayetleri gösterir.
 */
function hideBrandStats() {
    const contentContainer = document.getElementById('featuredComplaintsContent');
    const chartContainer = document.getElementById('brandStatsCharts');
    const statsInfoEl = document.getElementById('brandStatsInfo');
    const widgetTitle = document.querySelector('#explore .featured-complaints-widget .widget-title');

    if(widgetTitle) widgetTitle.innerHTML = `<i class="fas fa-star me-2 text-warning"></i> Öne Çıkan Şikayetler`;
    if(chartContainer) chartContainer.style.display = 'none';
    if(statsInfoEl) statsInfoEl.style.display = 'block'; // Bilgi yazısını tekrar göster

    // Grafikleri yok et
    try {
        if (brandSentimentChart) { brandSentimentChart.destroy(); brandSentimentChart = null; }
        if (brandCategoryChart) { brandCategoryChart.destroy(); brandCategoryChart = null; }
    } catch (e) { console.warn("Grafik silme hatası:", e); }

    // Öne çıkan şikayetleri tekrar yükle
    displayFeaturedComplaints('featuredComplaintsContent', FEATURED_COMPLAINT_COUNT);
}

/**
 * Öne çıkan şikayetleri (en çok etkileşim alan) widget'ta gösterir.
 */
function displayFeaturedComplaints(containerId, count) {
    const container = document.getElementById(containerId);
    if (!container) { console.warn(`Öne çıkan şikayetler konteyneri (#${containerId}) bulunamadı.`); return; }

    try {
        const complaints = getComplaints().filter(c => !c.pendingApproval); // Onaylanmışları al
        if (complaints.length === 0) {
            container.innerHTML = '<p class="text-center text-muted small p-2">Gösterilecek şikayet yok.</p>';
            return;
        }

        // Etkileşime göre sırala (like + dislike + yorum)
        const sortedComplaints = complaints.sort((a, b) => {
            const interactionsA = (Object.keys(a.likes || {}).length) + (Object.keys(a.dislikes || {}).length) + (a.comments ? a.comments.length : 0);
            const interactionsB = (Object.keys(b.likes || {}).length) + (Object.keys(b.dislikes || {}).length) + (b.comments ? b.comments.length : 0);
            // En çok etkileşim alanlar + en yeni olanlar öncelikli
            if (interactionsB !== interactionsA) {
                return interactionsB - interactionsA;
            } else {
                return b.date - a.date; // Eşitse yeni olan üste gelsin
            }
        }).slice(0, count); // Belirtilen sayıda al

        if (sortedComplaints.length === 0) {
            container.innerHTML = '<p class="text-center text-muted small p-2">Öne çıkan şikayet bulunamadı.</p>';
            return;
        }

        // Listeyi oluştur ve olay dinleyicilerini ekle
        container.innerHTML = `<div class="list-group list-group-flush">${sortedComplaints.map(createFeaturedComplaintCard).join('')}</div>`;
        addEventListenersToComplaintCards(container.querySelector('.list-group'), localStorage.getItem('currentUser')); // Tıklama olayı ekle

    } catch (error) {
        console.error("Öne çıkan şikayetler yüklenirken hata:", error);
        container.innerHTML = '<p class="text-center text-danger small p-2">Şikayetler yüklenirken hata oluştu.</p>';
    }
}

/**
 * Görsel önizlemesini günceller ve base64 veriyi callback ile döner.
 */
export function previewImage(event, callback) {
    const fileInput = event.target;
    const file = fileInput?.files?.[0];
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const previewButton = document.getElementById('previewComplaintBtn'); // Önizle butonu

    const resetPreview = () => {
        if (imagePreview && imagePreviewContainer) {
            imagePreview.src = '#';
            imagePreviewContainer.style.display = 'none';
        }
        if(fileInput) fileInput.value = ''; // Dosya seçimini temizle
        if(previewButton) previewButton.disabled = true; // Önizle butonunu pasif yap
        callback?.(null); // Callback'e null gönder
    };

    if (!imagePreview || !imagePreviewContainer || !previewButton) return resetPreview();
    if (!file) return resetPreview(); // Dosya seçilmediyse sıfırla

    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
        showToast('Lütfen geçerli bir resim dosyası seçin (örn: JPG, PNG, GIF).', 'Geçersiz Dosya Tipi', 'warning');
        return resetPreview();
    }

    // Dosya boyutu kontrolü
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast(`Dosya boyutu çok büyük. Maksimum ${MAX_FILE_SIZE_MB}MB olmalıdır.`, 'Dosya Boyutu Aşıldı', 'warning');
        return resetPreview();
    }

    // FileReader ile resmi oku
    const reader = new FileReader();
    reader.onload = (e) => {
        if (e.target?.result) {
            imagePreview.src = e.target.result;
            imagePreviewContainer.style.display = 'block';
            previewButton.disabled = false; // Resim varsa önizle butonu aktif
            callback?.(e.target.result); // Base64 veriyi callback ile döndür
        } else {
             resetPreview();
        }
    };
    reader.onerror = () => {
        showToast('Resim okunurken bir hata oluştu.', 'Hata', 'error');
        resetPreview();
    };
    reader.readAsDataURL(file); // Resmi Base64 olarak oku
}

/**
 * Şikayet formunu temizler ve validasyonları sıfırlar.
 */
export function clearComplaintForm() {
    const form = document.getElementById('complaintForm');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const fileInput = document.getElementById('complaintImage');
    const previewButton = document.getElementById('previewComplaintBtn');

    if (form) {
        form.reset(); // Formu sıfırla
        form.classList.remove('was-validated'); // Bootstrap validasyon stillerini kaldır
        // Tüm 'is-invalid' sınıflarını temizle
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
         // Rating feedback'lerini gizle
         form.querySelectorAll('.rating-row .invalid-feedback').forEach(el => el.style.display = 'none');
    }
    // Görsel önizlemesini sıfırla
    if (imagePreview && imagePreviewContainer) {
        imagePreview.src = '#';
        imagePreviewContainer.style.display = 'none';
    }
    if (fileInput) {
        fileInput.value = ''; // Dosya seçimini temizle
    }
     if(previewButton) {
         previewButton.disabled = true; // Önizle butonunu pasif yap
     }
}

/**
 * Fiyatlandırma planlarını ana sayfada gösterir.
 */
export function displayPricingPlans() {
    const pricingPlansContainer = document.getElementById('pricingPlans');
    if (!pricingPlansContainer) {
        console.warn("Fiyatlandırma planı konteyneri (#pricingPlans) bulunamadı!");
        return;
    }

    // Fiyat verileri (aylık ve yıllık)
    const pricingData = {
        monthly: [
            { title: "Ücretsiz", price: "0₺", features: ["Sınırsız şikayet", "Temel arama", "Topluluk yorumları", "<span class='text-muted'>Gelişmiş istatistikler</span>", "<span class='text-muted'>Öncelikli yayınlama</span>"], buttonText: "Başla", buttonClass: "modern-btn-outline-primary", popular: false },
            { title: "Premium", price: "29.99₺", features: ["<strong>Ücretsiz Plan +</strong>", "Öncelikli yayınlama", "Gelişmiş istatistikler", "Markalarla iletişim (Yakında)", "Reklamsız deneyim"], buttonText: "Premium'a Geç", buttonClass: "modern-btn-warning", popular: true }, // Popüler plan
            { title: "Pro", price: "49.99₺", features: ["<strong>Premium Plan +</strong>", "Detaylı marka analizi", "Özel destek hattı", "API Erişimi (Yakında)", "Raporlama araçları (Yakında)"], buttonText: "Pro'ya Geç", buttonClass: "modern-btn-primary", popular: false }
        ],
        yearly: [
            { title: "Ücretsiz", price: "0₺", features: ["Sınırsız şikayet", "Temel arama", "Topluluk yorumları", "<span class='text-muted'>Gelişmiş istatistikler</span>", "<span class='text-muted'>Öncelikli yayınlama</span>"], buttonText: "Başla", buttonClass: "modern-btn-outline-primary", popular: false },
            { title: "Premium", price: "287.90₺", features: ["<strong>Ücretsiz Plan +</strong>", "Öncelikli yayınlama", "Gelişmiş istatistikler", "Markalarla iletişim (Yakında)", "Reklamsız deneyim"], buttonText: "Premium'a Geç", buttonClass: "modern-btn-warning", popular: true },
            { title: "Pro", price: "479.90₺", features: ["<strong>Premium Plan +</strong>", "Detaylı marka analizi", "Özel destek hattı", "API Erişimi (Yakında)", "Raporlama araçları (Yakında)"], buttonText: "Pro'ya Geç", buttonClass: "modern-btn-primary", popular: false }
        ]
    };

    // Planları render eden fonksiyon
    const renderPlans = (billingType) => {
        const plans = pricingData[billingType];
        pricingPlansContainer.innerHTML = plans.map(plan => `
            <div class="col-lg-4 col-md-6 mb-4 d-flex"> <div class="card flex-fill ${plan.popular ? 'popular-plan' : ''}"> ${plan.popular ? '<div class="popular-badge">Popüler</div>' : ''}
                    <div class="card-body text-center d-flex flex-column">
                        <h5 class="card-title">${plan.title}</h5>
                        <h6 class="card-subtitle display-6 fw-light mb-3 price" data-monthly="${pricingData.monthly.find(p=>p.title===plan.title).price}" data-yearly="${pricingData.yearly.find(p=>p.title===plan.title).price}">
                            ${plan.price}<span class="small text-muted">/${billingType === 'monthly' ? 'ay' : 'yıl'}</span>
                        </h6>
                        <ul class="list-group list-group-flush mb-4 text-start small flex-grow-1">
                            ${plan.features.map(feature => `<li class="list-group-item border-0 px-0"><i class="fas ${feature.includes('text-muted') ? 'fa-times text-muted' : 'fa-check text-success'} me-2"></i> ${feature}</li>`).join('')}
                        </ul>
                        <button class="btn ${plan.buttonClass} mt-auto w-100">${plan.buttonText}</button>
                    </div>
                </div>
            </div>`).join('');
    };

    // Başlangıçta aylık planları göster
    try {
        renderPlans('monthly');
    } catch (error) {
        console.error("Fiyat planları render hatası:", error);
        pricingPlansContainer.innerHTML = '<p class="text-center text-danger">Fiyat planları yüklenemedi.</p>';
    }
}

/**
 * Admin panelindeki şikayetler tablosunu günceller ve filtreleme uygular.
 * @param {Array} allComplaints Tüm şikayetler dizisi (getComplaints() sonucu).
 * @param {string} searchTerm Arama terimi.
 * @param {string} statusFilter Durum filtresi.
 */
export function updateAdminTable(allComplaints, searchTerm = '', statusFilter = '') {
    const tableBody = document.getElementById('adminComplaintTableBody');
    const noComplaintsMsg = document.getElementById('noPendingComplaintsMsg'); 
    const adminTable = document.getElementById('adminComplaintTable');
    
    // Kritik elementlerin varlığını kontrol et
    if (!tableBody || !adminTable) {
        console.error("Admin tablosu elementleri bulunamadı! (#adminComplaintTableBody veya #adminComplaintTable)");
        return;
    }
    
    // adminLoadingRow elementi var mı kontrol et - yoksa hata verme
    const loadingRow = document.getElementById('adminLoadingRow');
    if (loadingRow) {
        loadingRow.style.display = 'none'; // Varsa gizle
    }
    
    tableBody.innerHTML = ''; // Tabloyu temizle

    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    // Filtreleme
    const filteredComplaints = allComplaints.filter(c => {
        const matchesSearch = !lowerSearchTerm ||
                              c.title?.toLowerCase().includes(lowerSearchTerm) ||
                              c.brand?.toLowerCase().includes(lowerSearchTerm) ||
                              String(c.id) === lowerSearchTerm; // ID ile arama
        const matchesStatus = !statusFilter || c.status === statusFilter || (statusFilter === 'Beklemede' && c.pendingApproval);

        return matchesSearch && matchesStatus;
    });

    if (filteredComplaints.length === 0) {
        if (noComplaintsMsg) {
            noComplaintsMsg.textContent = 'Filtrelerle eşleşen şikayet bulunamadı.';
            noComplaintsMsg.style.display = 'block';
        }
        adminTable.style.display = 'none'; // Tabloyu gizle
    } else {
        if (noComplaintsMsg) {
            noComplaintsMsg.style.display = 'none';
        }
        adminTable.style.display = 'table'; // Tabloyu göster

        // Sırala (en yeni en üstte)
        filteredComplaints.sort((a, b) => b.date - a.date);

        // Tablo satırlarını oluştur
        filteredComplaints.forEach(complaint => {
            const row = tableBody.insertRow();
            const statusText = complaint.pendingApproval ? 'Beklemede' : complaint.status;
            const statusClass = normalizeStatusUtil(statusText);
            const badgeClass = complaint.pendingApproval ? 'bg-warning text-dark' : {
                 'açık': 'bg-primary text-white',
                 'çözüldü': 'bg-success text-white',
                 'kapalı': 'bg-secondary text-white',
                 'beklemede': 'bg-warning text-dark'
             }[complaint.status?.toLowerCase()] || 'bg-info text-white';

            row.innerHTML = `
                <td class="text-center">${complaint.id}</td>
                <td>${sanitizeHTMLUtil(complaint.title)}</td>
                <td>${sanitizeHTMLUtil(complaint.brand)}</td>
                <td>${formatDate(complaint.date)}</td>
                <td class="text-center"><span class="badge ${badgeClass}">${sanitizeHTMLUtil(statusText)}</span></td>
                <td class="text-end action-buttons">
                    <button class="btn btn-sm btn-outline-info view-btn" data-id="${complaint.id}" title="Gör"><i class="fas fa-eye"></i></button>
                    ${complaint.pendingApproval ? `
                        <button class="btn btn-sm btn-outline-success approve-btn" data-id="${complaint.id}" title="Onayla"><i class="fas fa-check"></i></button>
                        <button class="btn btn-sm btn-outline-danger reject-btn" data-id="${complaint.id}" title="Reddet (Sil)"><i class="fas fa-times"></i></button>
                    ` : `
                         <button class="btn btn-sm btn-outline-secondary comment-btn" data-id="${complaint.id}" title="Yorum/Not Ekle"><i class="fas fa-comment-dots"></i></button>
                         <button class="btn btn-sm btn-outline-warning edit-btn" data-id="${complaint.id}" title="Düzenle"><i class="fas fa-edit"></i></button>
                         <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${complaint.id}" title="Kalıcı Sil"><i class="fas fa-trash-alt"></i></button>
                         `}
                </td>
            `;
        });
    }
}

/**
 * Genel site istatistiklerini hesaplar ve gösterir.
 */
export function displaySiteStats() {
    const totalComplaintsEl = document.getElementById('statsTotalComplaints');
    const solvedComplaintsEl = document.getElementById('statsSolvedComplaints');
    const totalBrandsEl = document.getElementById('statsTotalBrands');
    const avgRatingEl = document.getElementById('statsAvgRating');

    if (!totalComplaintsEl || !solvedComplaintsEl || !totalBrandsEl || !avgRatingEl) {
        console.warn("Ana istatistik elementleri bulunamadı.");
        return;
    }

    try {
        const complaints = getComplaints(); // Tüm şikayetleri al (onaylı/onaysız)
        const approvedComplaints = complaints.filter(c => !c.pendingApproval); // Sadece onaylanmışlar

        const totalCount = complaints.length; // Toplam şikayet sayısı (onay bekleyenler dahil)
        const solvedCount = approvedComplaints.filter(c => c.status?.toLowerCase() === 'çözüldü').length;
        const uniqueBrands = new Set(complaints.map(c => c.brand?.trim()).filter(Boolean)); // Tüm markalar

        // Ortalama puanı hesapla (sadece onaylanmış ve puanlanmış olanlar)
        let totalRatingSum = 0;
        let ratedComplaintsCount = 0;
        approvedComplaints.forEach(c => {
            const avg = parseFloat(calculateAverageRatingUtil(c.ratings));
            if (!isNaN(avg) && avg > 0) {
                totalRatingSum += avg;
                ratedComplaintsCount++;
            }
        });
        const overallAvgRating = ratedComplaintsCount > 0 ? (totalRatingSum / ratedComplaintsCount).toFixed(1) : 'N/A';

        // Elementlere değerleri ata
        totalComplaintsEl.textContent = totalCount;
        solvedComplaintsEl.textContent = solvedCount;
        totalBrandsEl.textContent = uniqueBrands.size;
        avgRatingEl.textContent = overallAvgRating;

    } catch (error) {
        console.error("Ana İstatistikler hatası:", error);
        totalComplaintsEl.textContent = "-";
        solvedComplaintsEl.textContent = "-";
        totalBrandsEl.textContent = "-";
        avgRatingEl.textContent = "-";
    }
}

/**
 * Son eklenen onaylanmış şikayetleri ana sayfada bir slider içinde gösterir.
 */
export function displayLatestComplaints(count = 5) {
    const latestListContainer = document.getElementById('latestComplaintList');
    if (!latestListContainer) {
        console.warn("Son şikayetler listesi elementi (#latestComplaintList) bulunamadı.");
        return;
    }

    try {
        // Onaylanmışları al, tarihe göre sırala ve belirtilen sayıda al
        const latestComplaints = getComplaints()
            .filter(c => !c.pendingApproval)
            .sort((a, b) => b.date - a.date) // En yeni en başa
            .slice(0, count);

        latestListContainer.innerHTML = ''; // Önce temizle

        if (latestComplaints.length === 0) {
            latestListContainer.innerHTML = '<p class="text-muted text-center p-5">Henüz gösterilecek şikayet yok.</p>';
            return;
        }

        // Slider Track oluştur
        const sliderTrack = document.createElement('div');
        sliderTrack.className = 'slider-track';

        // Kartları oluştur ve track'e ekle
        latestComplaints.forEach(complaint => {
            const cardElement = createComplaintCard(complaint, localStorage.getItem('currentUser'), { showActions: true });
            cardElement.style.marginRight = '1.5rem'; // Kartlar arası boşluk (CSS'den de ayarlanabilir)
            cardElement.style.flex = '0 0 320px'; // Kart genişliği (CSS'den de ayarlanabilir)
            sliderTrack.appendChild(cardElement);
        });

        // Sonsuz döngü için kartları klonla (eğer az sayıda kart varsa ve ekran genişse)
        if (latestComplaints.length > 0 && latestComplaints.length < 5) {
            const cardsToClone = Array.from(sliderTrack.children);
            cardsToClone.forEach(card => {
                const clone = card.cloneNode(true);
                sliderTrack.appendChild(clone);
            });
             // CSS animasyonu için track genişliğini iki katına çıkar (opsiyonel)
             // sliderTrack.style.width = `calc(${sliderTrack.scrollWidth * 2}px)`;
        }

        // Track'i konteynere ekle
        latestListContainer.appendChild(sliderTrack);

        // Olay dinleyicilerini ekle (tıklama, like/dislike)
        addEventListenersToComplaintCards(sliderTrack, localStorage.getItem('currentUser'));

        // Opsiyonel: CSS animasyonunu etkinleştir (eğer style.css içinde @keyframes scroll varsa)
        // sliderTrack.style.animation = 'scroll 40s linear infinite';

    } catch (error) {
        console.error("Son şikayetler yüklenirken hata:", error);
        latestListContainer.innerHTML = '<p class="text-danger text-center p-5">Şikayetler yüklenirken bir hata oluştu.</p>';
    }
}

// Grafik Temasını Güncelleme Fonksiyonu (events.js'den çağrılabilir)
window.updateChartsTheme = (theme) => {
     const chartOptions = {
         plugins: {
             legend: { labels: { color: theme === 'dark' ? '#adb5bd' : '#6c757d' } },
             tooltip: {
                 bodyColor: theme === 'dark' ? '#e9ecef' : '#212529',
                 titleColor: theme === 'dark' ? '#e9ecef' : '#212529',
                 backgroundColor: theme === 'dark' ? 'rgba(40, 50, 70, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                 borderColor: theme === 'dark' ? '#455474' : '#dee2e6'
             }
         },
         scales: { // Eğer bar/line grafik varsa eksen renkleri
             x: { ticks: { color: theme === 'dark' ? '#adb5bd' : '#6c757d' }, grid: { color: theme === 'dark' ? '#344767' : '#e9ecef' } },
             y: { ticks: { color: theme === 'dark' ? '#adb5bd' : '#6c757d' }, grid: { color: theme === 'dark' ? '#344767' : '#e9ecef' } }
         }
     };

     if (brandSentimentChart) {
         // Doughnut/Pie için sadece tooltip ve kenarlık rengi önemli olabilir
         brandSentimentChart.options.plugins.tooltip = chartOptions.plugins.tooltip;
         brandSentimentChart.data.datasets[0].borderColor = theme === 'dark' ? '#252f40' : '#ffffff'; // Arka plan rengi
         brandSentimentChart.update();
     }
     if (brandCategoryChart) {
         brandCategoryChart.options.plugins.legend.labels.color = chartOptions.plugins.legend.labels.color;
         brandCategoryChart.options.plugins.tooltip = chartOptions.plugins.tooltip;
         brandCategoryChart.data.datasets[0].borderColor = theme === 'dark' ? '#252f40' : '#ffffff';
         brandCategoryChart.update();
     }
 };