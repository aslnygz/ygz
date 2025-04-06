// utils.js - Yardımcı Fonksiyonlar (Düzeltilmiş)

/**
 * Toast bildirimini gösterir.
 * @param {string} message Gösterilecek mesaj.
 * @param {string} title Başlık.
 * @param {string} type Bildirim türü ('success', 'error', 'warning', 'info').
 */
export function showToast(message, title = 'Bildirim', type = 'info') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) {
        console.error("Toast elementi (#liveToast) bulunamadı!");
        // Fallback olarak alert gösterilebilir ama çok önerilmez.
        // alert(`${title}: ${message}`);
        return;
    }

    const toastBody = toastEl.querySelector('.toast-body'); // ID yerine class ile seçmek daha esnek olabilir
    const toastTitle = toastEl.querySelector('.toast-header .me-auto'); // Başlık için daha spesifik seçici
    const toastHeader = toastEl.querySelector('.toast-header');
    const toastIcon = toastHeader?.querySelector('i.fas'); // İkonu bul

    if (!toastBody || !toastTitle || !toastHeader || !toastIcon) {
         console.error("Toast iç elementleri (.toast-body, .toast-header .me-auto, .toast-header, .toast-header i.fas) bulunamadı!");
         return;
    }

    toastBody.innerHTML = sanitizeHTML(message); // Mesajı sanitize et
    toastTitle.textContent = title;

    // Önceki sınıfları temizle
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-white', 'text-dark');
    toastIcon.className = 'fas me-2'; // İkon sınıflarını sıfırla

    const styles = {
        success: { bg: 'bg-success', text: 'text-white', icon: 'fa-check-circle' },
        error:   { bg: 'bg-danger',  text: 'text-white', icon: 'fa-times-circle' }, // 'error' yerine 'danger' Bootstrap class'ı
        warning: { bg: 'bg-warning', text: 'text-dark',  icon: 'fa-exclamation-triangle' },
        info:    { bg: 'bg-info',    text: 'text-white', icon: 'fa-info-circle' }
    };

    const selectedStyle = styles[type] || styles.info;

    toastHeader.classList.add(selectedStyle.bg);
    // Metin rengini sadece warning için ekle, diğerleri zaten beyaz varsayılır (Bootstrap bg-* ile)
    if (type === 'warning') {
        toastHeader.classList.add(selectedStyle.text);
    }

    toastIcon.classList.add(selectedStyle.icon); // İkon sınıfını ekle

    // Bootstrap 5 Toast instance
    try {
        const toastInstance = bootstrap.Toast.getOrCreateInstance(toastEl);
        toastInstance.show();
    } catch (e) {
        console.error("Bootstrap Toast gösterme hatası:", e);
    }
}

/**
 * Textarea'yı içeriğine göre otomatik boyutlandırır.
 * @param {HTMLTextAreaElement} textareaElement Boyutlandırılacak textarea elementi.
 */
export function autoResizeTextarea(textareaElement) {
    if (textareaElement instanceof HTMLTextAreaElement) {
        textareaElement.style.height = 'auto'; // Önce sıfırla
        // scrollHeight hesaplaması için kısa bir gecikme gerekebilir
        setTimeout(() => {
             textareaElement.style.height = `${textareaElement.scrollHeight}px`;
        }, 0);
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
    const predefinedColors = ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#6f42c1', '#fd7e14', '#20c997', '#6610f2', '#d63384']; // Bootstrap 5 renkleri
    if (count <= 0) return [];
    if (count <= predefinedColors.length) {
        return predefinedColors.slice(0, count);
    }
    const colors = [...predefinedColors];
    while (colors.length < count) {
        colors.push(getRandomColor());
    }
    return colors;
};

/**
 * Verilen tarih girdisini locali kullanarak formatlar (dd.MM.yyyy HH:mm).
 * @param {Date|string|number} dateInput Formatlanacak tarih.
 * @returns {string} Formatlanmış tarih string'i veya hata mesajı.
 */
export function formatDate(dateInput) {
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) {
             // console.warn("Geçersiz tarih girdisi:", dateInput);
             return 'Geçersiz Tarih';
        }
        // 'tr-TR' locali ve 2 haneli formatlama
        const options = {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false // 24 saat formatı
        };
        //toLocaleDateString ve toLocaleTimeString birleştirilebilir
        // return date.toLocaleDateString('tr-TR', options).replace(/\./g, '.') + ' ' + date.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit', hour12: false});
         return new Intl.DateTimeFormat('tr-TR', options).format(date);

    } catch (error) {
        console.error("Tarih formatlama hatası:", error, "Girdi:", dateInput);
        return 'Tarih Hatası';
    }
}

/**
 * HTML içeriğini DOMPurify kullanarak temizler (XSS saldırılarına karşı).
 * @param {string} html Temizlenecek HTML string'i.
 * @returns {string} Temizlenmiş (güvenli) HTML string'i.
 */
export function sanitizeHTML(html) {
    if (typeof DOMPurify === 'undefined') {
        console.warn("DOMPurify kütüphanesi bulunamadı! HTML sanitizasyonu yapılamıyor. İçerik olduğu gibi kullanılıyor.");
        // Güvenlik riski! Geliştirme ortamı dışında DOMPurify mutlaka yüklenmeli.
        return html || ''; // null veya undefined ise boş string döndür
    }
    if (typeof html !== 'string') {
        // console.warn("sanitizeHTML fonksiyonuna string olmayan bir değer geldi:", html);
        return ''; // String değilse boş döndür
    }
    // DOMPurify ile temizle
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
