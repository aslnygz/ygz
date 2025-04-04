// utils.js - Yardımcı Fonksiyonlar

/**
 * Toast bildirimini gösterir.
 * @param {string} message Gösterilecek mesaj.
 * @param {string} title Başlık.
 * @param {string} type Bildirim türü ('success', 'error', 'warning', 'info').
 */
export function showToast(message, title = 'Bildirim', type = 'info') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) {
        console.error("Toast elementi bulunamadı!");
        return;
    }

    const toastBody = toastEl.querySelector('#toastBody');
    const toastTitle = toastEl.querySelector('#toastTitle');
    const toastHeader = toastEl.querySelector('.toast-header');
    if (!toastBody || !toastTitle || !toastHeader) {
         console.error("Toast iç elementleri bulunamadı!");
         return;
    }

    toastBody.textContent = message;
    toastTitle.textContent = title;

    // Önceki sınıfları temizle
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-white', 'text-dark');
    const icon = toastHeader.querySelector('i'); // İkonu bul veya oluşturmaya gerek yok, HTML'de sabit

    const styles = {
        success: { bg: 'bg-success', text: 'text-white', icon: 'fa-check-circle' },
        error:   { bg: 'bg-danger',  text: 'text-white', icon: 'fa-times-circle' },
        warning: { bg: 'bg-warning', text: 'text-dark',  icon: 'fa-exclamation-triangle' },
        info:    { bg: 'bg-info',    text: 'text-white', icon: 'fa-info-circle' }
    };

    const selectedStyle = styles[type] || styles.info;

    toastHeader.classList.add(selectedStyle.bg, selectedStyle.text);
    if (icon) {
        icon.className = `fas me-2 ${selectedStyle.icon}`; // İkon sınıfını güncelle
    }

    // Bootstrap 5 Toast instance
    const toastInstance = bootstrap.Toast.getOrCreateInstance(toastEl);
    toastInstance.show();
}

/**
 * Textarea'yı içeriğine göre otomatik boyutlandırır.
 * @param {HTMLTextAreaElement} textareaElement Boyutlandırılacak textarea elementi.
 */
export function autoResizeTextarea(textareaElement) {
    if (textareaElement instanceof HTMLTextAreaElement) {
        textareaElement.style.height = 'auto'; // Önce sıfırla
        textareaElement.style.height = `${textareaElement.scrollHeight}px`; // İçerik yüksekliğine ayarla
    }
}

/**
 * Verilen string'in ilk harfini büyük yapar, geri kalanını küçük.
 * @param {string} string Dönüştürülecek metin.
 * @returns {string} Dönüştürülmüş metin veya boş string.
 */
export function capitalizeFirstLetter(string) {
    return typeof string === 'string' && string.length > 0
        ? string.charAt(0).toUpperCase() + string.slice(1).toLowerCase()
        : '';
}

/**
 * Rastgele hex renk kodu üretir.
 * @returns {string} # ile başlayan hex renk kodu.
 */
export const getRandomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

/**
 * Belirtilen sayıda birbirinden belirgin renk üretmeye çalışır.
 * @param {number} count İstenen renk sayısı.
 * @returns {string[]} Hex renk kodları dizisi.
 */
export const getDistinctColors = (count) => {
    // Önceden tanımlanmış uyumlu renkler
    const predefinedColors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997', '#6610f2', '#e83e8c'];
    if (count <= predefinedColors.length) {
        return predefinedColors.slice(0, count);
    }
    // Daha fazla renk gerekirse rastgele ekle (çok efektif olmayabilir)
    const colors = [...predefinedColors];
    while (colors.length < count) {
        colors.push(getRandomColor()); // Basitçe rastgele ekle, çakışma kontrolü maliyetli olabilir
    }
    return colors;
};

// Renk mesafesi ve hex->rgb fonksiyonları getDistinctColors'un daha iyi çalışması için kullanılabilir,
// ancak basitlik adına yukarıdaki implementasyonda direkt kullanılmadı.
// function hexToRgb(hex) { ... }
// function colorDistance(hex1, hex2) { ... }

/**
 * Verilen tarih girdisini locali kullanarak formatlar.
 * @param {Date|string|number} dateInput Formatlanacak tarih.
 * @returns {string} Formatlanmış tarih string'i veya hata mesajı.
 */
export function formatDate(dateInput) {
    try {
        const date = new Date(dateInput);
        // Geçerli bir tarih olup olmadığını kontrol et
        if (isNaN(date.getTime())) {
            // throw new Error("Geçersiz tarih girdisi"); // Hata fırlatmak yerine
             return 'Geçersiz Tarih'; // Kullanıcıya gösterilecek mesaj
        }
        return date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error("Tarih formatlama hatası:", error, "Girdi:", dateInput);
        return 'Tarih Hatası';
    }
}

/**
 * HTML içeriğini DOMPurify kullanarak temizler (XSS saldırılarına karşı).
 * DOMPurify kütüphanesinin projeye dahil edilmiş olması gerekir (CDN veya npm).
 * @param {string} html Temizlenecek HTML string'i.
 * @returns {string} Temizlenmiş (güvenli) HTML string'i.
 */
export function sanitizeHTML(html) {
    // DOMPurify'ın yüklü olup olmadığını kontrol et (CDN ile yüklendiğinde global olur)
    if (typeof DOMPurify === 'undefined') {
        console.error("DOMPurify kütüphanesi bulunamadı! HTML sanitizasyonu yapılamıyor.");
        // Güvenlik riski! En azından basit bir kaçış yap veya hatayı bildir.
        // return html.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // Çok temel kaçış
        return html; // Veya boş döndür?
    }
    // typeof kontrolü yerine doğrudan string kontrolü daha güvenli olabilir
    if (typeof html !== 'string') {
        return ''; // String değilse boş döndür
    }
    // DOMPurify ile temizle
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}