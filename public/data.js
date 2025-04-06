// data.js - Veri Yönetimi (localStorage Tabanlı - Düzeltilmiş)
// import { formatDate } from './utils.js'; // Artık utils.js'den import etmeye gerek yok, burada kullanılmıyor.

const STORAGE_KEY = 'complaintsData';

// Başlangıç verileri (Örnek) - Tarihleri ISO string olarak sakla
const initialComplaints = [
    { id: 1, title: "Kargo çok geç geldi", category: "Teslimat Sorunu", description: "Sipariş ettiğim ürün 2 hafta sonra elime ulaştı.", brand: "Hızlı Kargo", image: null, userId: "user_abc", date: new Date(Date.now() - 86400000 * 14).toISOString(), status: "Açık", pendingApproval: false, comments: [], ratings: { Hizmet: 1, "Ürün Kalitesi": 3, İletişim: 2, Teslimat: 1, Fiyat: 3 }, likes: { "user_def": true }, dislikes: {} },
    { id: 2, title: "Telefonun ekranı çizik geldi", category: "Ürün Kalitesi", description: "Yeni aldığım telefonun ekranında çizik vardı.", brand: "TeknoMarket", image: null, userId: "user_def", date: new Date(Date.now() - 86400000 * 10).toISOString(), status: "Çözüldü", pendingApproval: false, comments: [{ id: 101, text: "Değişim sağlandı.", userId: "admin", date: new Date(Date.now() - 86400000 * 8).toISOString(), replies: [] }], ratings: { Hizmet: 4, "Ürün Kalitesi": 2, İletişim: 4, Teslimat: 3, Fiyat: 4 }, likes: { "user_abc": true, "user_ghi": true }, dislikes: {} },
    { id: 3, title: "Müşteri hizmetleri kaba", category: "Müşteri Hizmetleri", description: "Sorunumu çözmek yerine yüzüme kapattılar.", brand: "İletişim Hattı", image: null, userId: "user_ghi", date: new Date(Date.now() - 86400000 * 5).toISOString(), status: "Açık", pendingApproval: false, comments: [], ratings: { Hizmet: 1, "Ürün Kalitesi": 3, İletişim: 1, Teslimat: 3, Fiyat: 2 }, likes: {}, dislikes: { "user_abc": true } },
    { id: 4, title: "Onay Bekleyen Şikayet", category: "Diğer", description: "Bu şikayet admin onayı beklemektedir.", brand: "Test Marka", image: null, userId: "user_jkl", date: new Date(Date.now() - 86400000 * 1).toISOString(), status: "Beklemede", pendingApproval: true, comments: [], ratings: { Hizmet: 3, "Ürün Kalitesi": 3, İletişim: 3, Teslimat: 3, Fiyat: 3 }, likes: {}, dislikes: {} }
];

// Mevcut şikayetleri yükle
let complaints = loadComplaints();

/**
 * localStorage'dan şikayet verilerini yükler ve tarihleri Date objesine çevirir.
 * Hata durumunda başlangıç verilerini döndürür.
 * @returns {Array} Şikayetler dizisi.
 */
export function loadComplaints() {
    let loadedData = [];
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Veri yapısını kontrol et ve dönüştür
            if (Array.isArray(parsedData)) {
                 loadedData = parsedData.map(c => {
                    // Her şikayet için gerekli alanların varlığını ve türünü kontrol et
                    const complaintDate = new Date(c.date); // Önce Date objesine çevir
                    const validComplaintDate = !isNaN(complaintDate.getTime()) ? complaintDate : new Date(); // Geçersizse şimdiki zaman

                    // Yorumları ve yanıtları işle, tarihleri Date yap
                    const processComments = (commentsArray) => {
                        if (!Array.isArray(commentsArray)) return [];
                        return commentsArray.map(comment => {
                            const commentDate = new Date(comment.date);
                            const validCommentDate = !isNaN(commentDate.getTime()) ? commentDate : new Date();
                            return {
                                ...comment,
                                id: comment.id || Date.now() + Math.random(), // ID yoksa oluştur
                                date: validCommentDate.toISOString(),
                                replies: processComments(comment.replies || []) // İç içe yanıtları işle
                            };
                        });
                    };

                    return {
                        id: typeof c.id === 'number' ? c.id : Date.now() + Math.random(), // ID kontrolü
                        title: typeof c.title === 'string' ? c.title : 'Başlık Yok',
                        category: typeof c.category === 'string' ? c.category : 'Kategori Yok',
                        description: typeof c.description === 'string' ? c.description : '',
                        brand: typeof c.brand === 'string' ? c.brand : 'Marka Yok',
                        image: c.image || null,
                        userId: c.userId || 'unknown_user',
                        date: validComplaintDate.toISOString(), // ISO string olarak sakla
                        status: typeof c.status === 'string' ? c.status : 'Bilinmiyor',
                        pendingApproval: typeof c.pendingApproval === 'boolean' ? c.pendingApproval : false,
                        comments: processComments(c.comments), // Yorumları işle
                        ratings: typeof c.ratings === 'object' && c.ratings !== null ? c.ratings : {},
                        likes: typeof c.likes === 'object' && c.likes !== null ? c.likes : {},
                        dislikes: typeof c.dislikes === 'object' && c.dislikes !== null ? c.dislikes : {}
                    };
                });
            } else {
                 console.warn("localStorage'daki veri dizi formatında değil. Başlangıç verileri kullanılıyor.");
                 loadedData = initialComplaints.map(c => ({...c})); // Kopyasını al
            }
        } else {
            console.log("localStorage boş. Başlangıç verileri kullanılıyor.");
            loadedData = initialComplaints.map(c => ({...c})); // Kopyasını al
        }
    } catch (e) {
        console.error("LocalStorage'dan veri yükleme/parse etme hatası:", e);
        loadedData = initialComplaints.map(c => ({...c})); // Hata durumunda kopyasını al
    }
     // ID'ye göre sırala (en yeni en üstte)
    loadedData.sort((a, b) => new Date(b.date) - new Date(a.date));
    return loadedData;
}

/**
 * Şikayet verilerini localStorage'a kaydeder.
 */
function saveComplaints() {
    try {
        // Tarihler zaten ISO string formatında olmalı
        localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
    } catch (e) {
        console.error("LocalStorage'a veri kaydetme hatası:", e);
        // Kullanıcıya bilgi verilebilir (örn: showToast ile)
    }
}

/**
 * Mevcut şikayetlerin bir kopyasını döndürür (Date objeleri ile).
 * @returns {Array} Şikayetler dizisi (Date objeleri ile).
 */
export function getComplaints() {
    // Dışarıya verinin kopyasını ve tarihleri Date objesi olarak ver
    return complaints.map(c => ({
        ...c,
        date: new Date(c.date), // ISO string'i Date objesine çevir
        comments: (c.comments || []).map(comment => ({ // Yorum tarihlerini de çevir
            ...comment,
            date: new Date(comment.date),
            replies: (comment.replies || []).map(reply => ({ // Yanıt tarihlerini de çevir
                ...reply,
                date: new Date(reply.date)
            }))
        }))
    }));
}

/**
 * Yeni bir şikayet ekler.
 * @param {string} title Başlık.
 * @param {string} category Kategori.
 * @param {string} description Açıklama.
 * @param {string} brand Marka.
 * @param {string|null} imageBase64 Görsel (Base64).
 * @param {string} userId Kullanıcı ID.
 * @param {object} ratings Değerlendirmeler.
 * @returns {object|null} Eklenen yeni şikayet objesi veya hata durumunda null.
 */
export function addComplaint(title, category, description, brand, imageBase64, userId, ratings) {
    try {
        // Girdi doğrulaması
        if (!title?.trim() || !category?.trim() || !description?.trim() || !brand?.trim() || !userId) {
            throw new Error("Başlık, Kategori, Açıklama, Marka ve Kullanıcı ID alanları zorunludur.");
        }
        if (!ratings || typeof ratings !== 'object' || Object.keys(ratings).length === 0 || Object.values(ratings).some(r => r === 0 || r === null || r === undefined)) {
             throw new Error("Değerlendirme puanları eksik veya geçersiz.");
        }

        // Yeni ID oluştur (mevcut en büyük ID'nin bir fazlası veya 1)
        const newId = complaints.length > 0 ? Math.max(...complaints.map(c => c.id)) + 1 : 1;

        const newComplaint = {
            id: newId,
            title: title.trim(),
            category: category.trim(),
            description: description.trim(),
            brand: brand.trim(),
            image: imageBase64, // Base64 string veya null
            userId,
            date: new Date().toISOString(), // ISO string olarak kaydet
            status: "Beklemede", // Yeni şikayetler onay bekler
            pendingApproval: true,
            comments: [],
            ratings, // Doğrudan gelen objeyi kullan
            likes: {},
            dislikes: {}
        };
        complaints.unshift(newComplaint); // Yeni şikayeti başa ekle
        saveComplaints();
        // Ekleme sonrası Date objesi ile döndür
        return { ...newComplaint, date: new Date(newComplaint.date) };
    } catch (error) {
        console.error("Şikayet ekleme hatası:", error);
        // Hata durumunda null döndür, çağıran taraf kontrol etsin
        return null;
    }
}

/**
 * Bir şikayete yorum veya yanıt ekler.
 * @param {number} complaintId Şikayet ID'si.
 * @param {string} commentText Yorum metni.
 * @param {string} userId Yorumu yapan kullanıcı ID'si ('admin' veya 'user_xyz').
 * @param {number|null} parentCommentId Yanıt veriliyorsa üst yorumun ID'si.
 * @returns {boolean} İşlem başarılıysa true, değilse false.
 */
export function addCommentToComplaint(complaintId, commentText, userId, parentCommentId = null) {
    const complaintIndex = complaints.findIndex(c => c.id === complaintId);
    if (complaintIndex === -1) {
        console.error(`Şikayet bulunamadı: ID ${complaintId}`);
        return false;
    }
    const complaint = complaints[complaintIndex];

    // Onaylanmamış şikayetlere yorum yapılamaz
    if (complaint.pendingApproval) {
        console.warn("Onay bekleyen şikayete yorum eklenemez.");
        return false;
    }
    if (!commentText?.trim() || !userId) {
        console.error("Yorum metni veya kullanıcı ID eksik.");
        return false;
    }

    const newComment = {
        id: Date.now() + Math.random(), // Daha benzersiz ID
        text: commentText.trim(),
        userId,
        date: new Date().toISOString(),
        replies: []
    };

    complaint.comments = complaint.comments || []; // Yorum dizisi yoksa oluştur

    if (parentCommentId) {
        // Yanıt ekleme mantığı (iç içe olabilir)
        const findParentComment = (comments, targetId) => {
            for (let i = 0; i < comments.length; i++) {
                const comment = comments[i];
                if (comment.id === targetId) {
                    return comment;
                }
                if (comment.replies && comment.replies.length > 0) {
                    const found = findParentComment(comment.replies, targetId);
                    if (found) return found;
                }
            }
            return null;
        };

        const parent = findParentComment(complaint.comments, parentCommentId);
        if (parent) {
            parent.replies = parent.replies || []; // Yanıt dizisi yoksa oluştur
            parent.replies.push(newComment);
        } else {
            console.error(`Üst yorum bulunamadı: ID ${parentCommentId}`);
            return false; // Üst yorum bulunamazsa ekleme
        }
    } else {
        // Ana yorum ekleme
        complaint.comments.push(newComment);
    }

    saveComplaints();
    return true;
}


/**
 * Belirtilen ID'li şikayeti onaylar.
 * @param {number} complaintId Onaylanacak şikayet ID'si.
 * @returns {boolean} İşlem başarılıysa true.
 */
export function approveComplaint(complaintId) {
    if (!complaintId || isNaN(complaintId)) {
        console.error("Geçersiz Şikayet ID:", complaintId);
        return false;
    }
    
    const complaint = complaints.find(c => c.id === complaintId);
    
    if (!complaint) {
        console.error(`Onaylama başarısız: Şikayet ID ${complaintId} bulunamadı.`);
        return false;
    }
    
    if (!complaint.pendingApproval) {
        console.warn(`Onaylama başarısız: Şikayet ID ${complaintId} zaten onaylanmış.`);
        return false;
    }
    
    // Şikayet bulundu ve onay bekliyor
    complaint.pendingApproval = false;
    complaint.status = 'Açık'; // Onaylanınca durumu 'Açık' yap
    saveComplaints();
    console.log(`Şikayet ID ${complaintId} başarıyla onaylandı.`);
    return true;
}

/**
 * Belirtilen ID'li onay bekleyen şikayeti reddeder (siler).
 * @param {number} complaintId Reddedilecek şikayet ID'si.
 * @returns {boolean} İşlem başarılıysa true.
 */
export function rejectComplaint(complaintId) {
    if (!complaintId || isNaN(complaintId)) {
        console.error("Geçersiz Şikayet ID:", complaintId);
        return false;
    }
    
    const index = complaints.findIndex(c => c.id === complaintId);
    
    if (index === -1) {
        console.error(`Reddetme başarısız: Şikayet ID ${complaintId} bulunamadı.`);
        return false;
    }
    
    if (!complaints[index].pendingApproval) {
        console.warn(`Reddetme başarısız: Şikayet ID ${complaintId} onay beklemiyor.`);
        return false;
    }
    
    // Şikayet bulundu ve onay bekliyor
    complaints.splice(index, 1); // Şikayeti diziden çıkar
    saveComplaints();
    console.log(`Şikayet ID ${complaintId} başarıyla reddedildi ve silindi.`);
    return true;
}

/**
 * Belirtilen ID'li şikayetin verilerini günceller.
 * @param {number} complaintId Güncellenecek şikayet ID'si.
 * @param {object} updatedData Güncellenecek alanları içeren obje (örn: { title, description, status, category, brand }).
 * @returns {boolean} İşlem başarılıysa true.
 */
export function updateComplaint(complaintId, updatedData) {
    const complaint = complaints.find(c => c.id === complaintId);
    if (complaint) {
        let changed = false;
        const allowedUpdates = ['title', 'description', 'status', 'category', 'brand'];
        for (const key in updatedData) {
            if (allowedUpdates.includes(key) && updatedData[key] !== undefined && complaint[key] !== updatedData[key]) {
                // Özel durum: Status 'Beklemede' yapılamaz (sadece onay ile)
                if (key === 'status' && updatedData[key] === 'Beklemede' && !complaint.pendingApproval) {
                    console.warn("Onaylanmış bir şikayetin durumu manuel olarak 'Beklemede' yapılamaz.");
                    continue;
                }
                // Özel durum: Onay bekleyen şikayetin durumu değiştirilemez (onayla/reddet hariç)
                if (key === 'status' && complaint.pendingApproval) {
                    console.warn("Onay bekleyen şikayetin durumu buradan değiştirilemez.");
                    continue;
                }
                complaint[key] = typeof updatedData[key] === 'string' ? updatedData[key].trim() : updatedData[key];
                changed = true;
            }
        }
        if (changed) {
            saveComplaints();
        }
        return true; // Şikayet bulunduysa true dön (değişiklik olmasa bile)
    }
    console.warn(`Güncelleme başarısız: Şikayet ${complaintId} bulunamadı.`);
    return false;
}

/**
 * Belirtilen ID'li şikayeti durumuna bakmaksızın siler.
 * @param {number} complaintId Silinecek şikayet ID'si.
 * @returns {boolean} İşlem başarılıysa true.
 */
export function deleteComplaint(complaintId) {
    const index = complaints.findIndex(c => c.id === complaintId);
    if (index !== -1) {
        complaints.splice(index, 1);
        saveComplaints();
        return true;
    }
     console.warn(`Silme başarısız: Şikayet ${complaintId} bulunamadı.`);
    return false;
}

/**
 * Bir şikayeti beğenme/beğeniyi geri alma işlemini yapar.
 * @param {number} complaintId Beğenilecek şikayet ID'si.
 * @param {string} userId İşlemi yapan kullanıcı ID'si.
 * @returns {boolean} İşlem başarılıysa true.
 */
export function likeComplaint(complaintId, userId) {
    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint || complaint.pendingApproval || !userId) {
         console.warn(`Like başarısız: Şikayet ${complaintId} uygun değil veya userId eksik.`);
         return false;
    }

    complaint.likes = complaint.likes || {};
    complaint.dislikes = complaint.dislikes || {};

    // Eğer kullanıcı dislike yapmışsa, onu kaldır
    if (complaint.dislikes[userId]) {
        delete complaint.dislikes[userId];
    }

    // Like durumunu tersine çevir
    if (complaint.likes[userId]) {
        delete complaint.likes[userId]; // Beğeniyi kaldır
    } else {
        complaint.likes[userId] = true; // Beğen
    }

    saveComplaints();
    return true;
}

/**
 * Bir şikayeti beğenmeme/beğenmemeyi geri alma işlemini yapar.
 * @param {number} complaintId Beğenilmeyecek şikayet ID'si.
 * @param {string} userId İşlemi yapan kullanıcı ID'si.
 * @returns {boolean} İşlem başarılıysa true.
 */
export function dislikeComplaint(complaintId, userId) {
    const complaint = complaints.find(c => c.id === complaintId);
     if (!complaint || complaint.pendingApproval || !userId) {
         console.warn(`Dislike başarısız: Şikayet ${complaintId} uygun değil veya userId eksik.`);
         return false;
     }

    complaint.likes = complaint.likes || {};
    complaint.dislikes = complaint.dislikes || {};

    // Eğer kullanıcı like yapmışsa, onu kaldır
    if (complaint.likes[userId]) {
        delete complaint.likes[userId];
    }

    // Dislike durumunu tersine çevir
    if (complaint.dislikes[userId]) {
        delete complaint.dislikes[userId]; // Beğenmemeyi kaldır
    } else {
        complaint.dislikes[userId] = true; // Beğenme
    }

    saveComplaints();
    return true;
}
