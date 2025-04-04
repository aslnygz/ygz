// data.js - Veri Yönetimi (localStorage Tabanlı - DİKKAT: Güvenli ve kalıcı değil!)
import { formatDate } from './utils.js'; // Tarih kontrolü için

const STORAGE_KEY = 'complaintsData';

// Başlangıç verileri (Örnek)
const initialComplaints = [
    { id: 1, title: "Kargo çok geç geldi", category: "Teslimat Sorunu", description: "Sipariş ettiğim ürün 2 hafta sonra elime ulaştı.", brand: "Hızlı Kargo", image: null, userId: "user_abc", date: new Date(2025, 2, 15, 10, 30).toISOString(), status: "Açık", pendingApproval: false, comments: [], ratings: { Hizmet: 1, "Ürün Kalitesi": 3, İletişim: 2, Teslimat: 1, Fiyat: 3 }, likes: {}, dislikes: {} },
    { id: 2, title: "Telefonun ekranı çizik geldi", category: "Ürün Kalitesi", description: "Yeni aldığım telefonun ekranında çizik vardı.", brand: "TeknoMarket", image: null, userId: "user_def", date: new Date(2025, 2, 20, 14, 0).toISOString(), status: "Çözüldü", pendingApproval: false, comments: [{ id: 1, text: "Değişim sağlandı.", userId: "admin", date: new Date(2025, 2, 22, 9, 0).toISOString(), replies: [] }], ratings: { Hizmet: 4, "Ürün Kalitesi": 2, İletişim: 4, Teslimat: 3, Fiyat: 4 }, likes: {}, dislikes: {} },
    { id: 3, title: "Müşteri hizmetleri kaba", category: "Müşteri Hizmetleri", description: "Sorunumu çözmek yerine yüzüme kapattılar.", brand: "İletişim Hattı", image: null, userId: "user_ghi", date: new Date(2025, 2, 25, 11, 15).toISOString(), status: "Açık", pendingApproval: false, comments: [], ratings: { Hizmet: 1, "Ürün Kalitesi": 3, İletişim: 1, Teslimat: 3, Fiyat: 2 }, likes: {}, dislikes: {} },
    { id: 4, title: "Onay Bekleyen Şikayet", category: "Diğer", description: "Admin onayı bekliyor.", brand: "Test Marka", image: null, userId: "user_jkl", date: new Date().toISOString(), status: "Beklemede", pendingApproval: true, comments: [], ratings: { Hizmet: 3, "Ürün Kalitesi": 3, İletişim: 3, Teslimat: 3, Fiyat: 3 }, likes: {}, dislikes: {} }
];

// Mevcut şikayetleri yükle
let complaints = loadComplaints();

/**
 * localStorage'dan şikayet verilerini yükler ve tarihleri Date objesine çevirir.
 * Hata durumunda başlangıç verilerini döndürür.
 * @returns {Array} Şikayetler dizisi.
 */
function loadComplaints() {
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Veri yapısını kontrol et ve dönüştür
            return parsedData.map(c => {
                const complaintDate = new Date(c.date);
                const validComplaintDate = !isNaN(complaintDate.getTime()) ? complaintDate : new Date(); // Geçersizse şimdiki zaman

                return {
                    ...c,
                    id: c.id || Date.now(), // ID yoksa oluştur
                    date: validComplaintDate.toISOString(), // ISO string olarak sakla
                    comments: (c.comments || []).map(comment => {
                        const commentDate = new Date(comment.date);
                        const validCommentDate = !isNaN(commentDate.getTime()) ? commentDate : new Date();
                        return {
                            ...comment,
                            id: comment.id || Date.now(),
                            date: validCommentDate.toISOString(),
                            replies: comment.replies || [] // Replies dizisi hep var olsun
                        };
                    }),
                    ratings: c.ratings || {}, // Ratings objesi hep var olsun
                    likes: c.likes || {},     // Likes objesi hep var olsun
                    dislikes: c.dislikes || {} // Dislikes objesi hep var olsun
                };
            });
        }
    } catch (e) {
        console.error("LocalStorage'dan veri yükleme/parse etme hatası:", e);
        // Hata durumunda başlangıç verilerini kullan, ancak kopyasını al
        // ve tarihleri ISO string yap
        return initialComplaints.map(c => ({...c}));
    }
    // localStorage boşsa başlangıç verilerini kullan
     return initialComplaints.map(c => ({...c}));
}

/**
 * Şikayet verilerini localStorage'a kaydeder.
 */
function saveComplaints() {
    try {
        // Tarihleri string'e çevirmeye gerek yok, JSON.stringify halleder.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
    } catch (e) {
        console.error("LocalStorage'a veri kaydetme hatası:", e);
        // Kullanıcıya bilgi verilebilir (örn: showToast ile)
    }
}

/**
 * Mevcut şikayetlerin bir kopyasını döndürür.
 * @returns {Array} Şikayetler dizisi.
 */
export function getComplaints() {
    // Dışarıya verinin kopyasını vererek orijinalinin değiştirilmesini engelle
    return JSON.parse(JSON.stringify(complaints));
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
 * @returns {object} Eklenen yeni şikayet objesi.
 * @throws {Error} Gerekli alanlar eksikse hata fırlatır.
 */
export function addComplaint(title, category, description, brand, imageBase64, userId, ratings) {
    // Girdi doğrulaması
    if (!title?.trim() || !category?.trim() || !description?.trim() || !brand?.trim() || !userId) {
        throw new Error("Başlık, Kategori, Açıklama, Marka ve Kullanıcı ID alanları zorunludur.");
    }
     if (!ratings || typeof ratings !== 'object' || Object.keys(ratings).length === 0) {
        throw new Error("Değerlendirme puanları eksik veya geçersiz.");
     }

    const newComplaint = {
        id: Date.now(), // Benzersiz ID için daha iyi bir yöntem (örn: uuid) düşünülebilir
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
    return newComplaint;
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
        id: Date.now(), // Benzersiz ID
        text: commentText.trim(),
        userId,
        date: new Date().toISOString(),
        replies: [] // Yeni yorumun yanıtları başlangıçta boş
    };

    complaint.comments = complaint.comments || []; // Yorum dizisi yoksa oluştur

    if (parentCommentId) {
        // Yanıt ekleme mantığı
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
    const complaint = complaints.find(c => c.id === complaintId);
    // Sadece onay bekleyen şikayetler onaylanabilir
    if (complaint?.pendingApproval) {
        complaint.pendingApproval = false;
        complaint.status = 'Açık'; // Onaylanınca durumu 'Açık' yap
        saveComplaints();
        return true;
    }
    return false;
}

/**
 * Belirtilen ID'li onay bekleyen şikayeti reddeder (siler).
 * @param {number} complaintId Reddedilecek şikayet ID'si.
 * @returns {boolean} İşlem başarılıysa true.
 */
export function rejectComplaint(complaintId) {
    const index = complaints.findIndex(c => c.id === complaintId);
    // Sadece onay bekleyen şikayetler reddedilebilir/silinebilir
    if (index !== -1 && complaints[index].pendingApproval) {
        complaints.splice(index, 1); // Şikayeti diziden çıkar
        saveComplaints();
        return true;
    }
    return false;
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
        // Sadece belirli ve geçerli alanları güncelle
        const allowedUpdates = ['title', 'description', 'status', 'category', 'brand'];
        for (const key in updatedData) {
            if (allowedUpdates.includes(key) && updatedData[key] !== undefined) {
                 // Özel durum: Status 'Beklemede' yapılamaz (sadece onay ile)
                 if (key === 'status' && updatedData[key] === 'Beklemede' && !complaint.pendingApproval) {
                     console.warn("Onaylanmış bir şikayetin durumu manuel olarak 'Beklemede' yapılamaz.");
                     continue;
                 }
                 // Özel durum: Onay bekleyen şikayetin durumu değiştirilemez
                 if (key === 'status' && complaint.pendingApproval) {
                     console.warn("Onay bekleyen şikayetin durumu değiştirilemez.");
                     continue;
                 }
                 complaint[key] = typeof updatedData[key] === 'string' ? updatedData[key].trim() : updatedData[key];
            }
        }
        saveComplaints();
        return true;
    }
    return false;
}

/**
 * Belirtilen ID'li şikayeti durumuna bakmaksızın siler.
 * DİKKAT: Bu işlem geri alınamaz.
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
    // Onaylanmamış şikayetler beğenilemez
    if (!complaint || complaint.pendingApproval || !userId) return false;

    complaint.likes = complaint.likes || {};
    complaint.dislikes = complaint.dislikes || {};

    // Eğer kullanıcı dislike yapmışsa, onu kaldır
    if (complaint.dislikes[userId]) {
        delete complaint.dislikes[userId];
    }

    // Like durumunu tersine çevir (varsa kaldır, yoksa ekle)
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
     // Onaylanmamış şikayetler beğenilemez
    if (!complaint || complaint.pendingApproval || !userId) return false;

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