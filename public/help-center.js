// help-center.js - Yardım merkezi işlevselliği

// Modalları içe aktarma, tema gibi yardımcı işlevler
let helpContent = null;
let currentArticleId = null;
let currentCategoryId = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Yardım merkezi yükleniyor...');

    // Modalları ana sayfadan içe aktar
    importModalsFromMainPage();

    // Temayı başlat
    initTheme();

    // Yardım içeriğini yükle
    loadHelpContent();

    // Arama işlevselliğini başlat
    initSearchFunctionality();

    // URL'den makale ID'sini al
    const articleId = getArticleIdFromUrl();
    if (articleId) {
        // Belirli bir makale gösterilecek
        currentArticleId = articleId;
        // İçerik yüklendikten sonra makaleyi göster
        waitForContentAndShowArticle(articleId);
    }

    // Makale geri bildirim olaylarını başlat
    initArticleFeedback();
});

// Ana sayfadaki modalları içe aktar (brand-profile.js'deki fonksiyonun aynısı)
function importModalsFromMainPage() {
    try {
        fetch('/')
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // İhtiyaç duyulan modalları getir
                const modalIds = [
                    'createComplaintModal',
                    'complaintDetailModal',
                    'adminModal'
                ];

                const modalContainer = document.getElementById('modalContainer');
                // Modal container yoksa, hata verme ve devam etme. Log tutabiliriz.
                if (!modalContainer) {
                    console.warn("Modal container elementi (modalContainer) bulunamadı.");
                    return;
                }


                modalIds.forEach(id => {
                    const modal = doc.getElementById(id);
                    if (modal) {
                        modalContainer.appendChild(modal.cloneNode(true));
                    } else {
                        console.warn(`Ana sayfada "${id}" ID'li modal bulunamadı.`);
                    }
                });

                // Tema değiştirme ve diğer olayları yeniden başlat
                if (typeof window.appEvents !== 'undefined' && window.appEvents.initEventListeners) {
                    window.appEvents.initEventListeners();
                }

                console.log("Modallar başarıyla içe aktarıldı (veya olmayanlar atlandı).");
            })
            .catch(error => {
                console.error("Modallar içe aktarılırken hata:", error);
                // showToast kullanmadan önce tanımlı olup olmadığını kontrol et
                if (typeof showToast === 'function') {
                    showToast('Bazı sayfa bileşenleri yüklenemedi.', 'Uyarı', 'warning');
                }
            });
    } catch (error) {
        console.error("Modallar içe aktarılırken hata:", error);
    }
}

// Tema kontrolü (diğer sayfalarla aynı)
function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const themeToggleBtn = document.getElementById('themeToggle');

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-mode');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }

    // Tema değiştirme butonu olayı
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
            if (newTheme === 'dark') {
                document.body.classList.add('dark-mode');
                themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                document.body.classList.remove('dark-mode');
                themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            }
            localStorage.setItem('theme', newTheme);
        });
    }

    // Navbar Scroll efekti
    const navbar = document.querySelector('.navbar.fixed-top');
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Başlangıçta kontrol et
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        }
    }
}

// Toast mesajlarını göster
function showToast(message, title = 'Bilgi', type = 'info') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) {
        console.error("Toast elementi bulunamadı!");
        alert(`${title}: ${message}`); // Fallback to alert
        return;
    }

    const toastBody = toastEl.querySelector('.toast-body');
    const toastTitle = toastEl.querySelector('.toast-header .me-auto');
    const toastHeader = toastEl.querySelector('.toast-header');
    const toastIcon = toastHeader?.querySelector('i.fas');

    if (!toastBody || !toastTitle || !toastHeader || !toastIcon) {
        console.error("Toast iç elementleri bulunamadı!");
        return;
    }

    toastBody.textContent = message;
    toastTitle.textContent = title;

    // Önceki sınıfları temizle
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-white', 'text-dark');
    toastIcon.className = 'fas me-2'; // İkon sınıflarını sıfırla

    const styles = {
        success: { bg: 'bg-success', text: 'text-white', icon: 'fa-check-circle' },
        error:   { bg: 'bg-danger',  text: 'text-white', icon: 'fa-times-circle' },
        warning: { bg: 'bg-warning', text: 'text-dark',  icon: 'fa-exclamation-triangle' },
        info:    { bg: 'bg-info',    text: 'text-white', icon: 'fa-info-circle' }
    };

    const selectedStyle = styles[type] || styles.info;

    toastHeader.classList.add(selectedStyle.bg);
    // Uyarı durumunda metin rengini ekle, diğer durumlarda beyaz kalacak (success, error, info)
    if (type === 'warning') {
        toastHeader.classList.add(selectedStyle.text);
    } else {
         toastHeader.classList.add('text-white'); // Diğerleri için beyaz metin
    }


    toastIcon.classList.add(selectedStyle.icon);

    try {
        // Bootstrap 5 Toast instance al veya oluştur
        const toastInstance = bootstrap.Toast.getOrCreateInstance(toastEl);
        toastInstance.show();
    } catch (e) {
        console.error("Bootstrap Toast gösterme hatası:", e);
    }
}


// HTML içeriğini temizle (güvenlik)
function sanitizeHTML(html) {
    if (typeof DOMPurify === 'undefined') {
        console.warn("DOMPurify kütüphanesi bulunamadı! HTML temizlenemiyor.");
        // Güvenlik riski olabilir, basit bir kaçış mekanizması eklenebilir veya olduğu gibi bırakılır.
        // Çok temel kaçış:
        // const tempDiv = document.createElement('div');
        // tempDiv.textContent = html || '';
        // return tempDiv.innerHTML;
        return html || ''; // Şimdilik olduğu gibi bırakalım, ama log uyarısı önemli.
    }
    if (typeof html !== 'string') {
        return '';
    }
    try {
        return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    } catch (e) {
        console.error("DOMPurify sanitization hatası:", e);
        return ''; // Hata durumunda boş string dön
    }
}


// Yardım içeriğini yükle
function loadHelpContent() {
    fetch('/api/help-content')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP hata! durum: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            helpContent = data;
            console.log('Yardım içeriği yüklendi:', helpContent);

            // Kategorileri ve içeriği göster
            updateCategoriesList();

            // Popüler makaleleri göster (ana sayfa için bu fonksiyon içinde çağrılıyor zaten)
            // updatePopularArticles(); // Eğer sidebar'da gösterilecekse burada çağrılabilir

            // URL'den makale ID'si alındıysa göster, yoksa ana sayfayı göster
            if (currentArticleId) {
                showArticle(currentArticleId);
            } else {
                showHomepage();
            }

            // Sayfa başlığını güncelle (showHomepage veya showArticle içinde zaten yapılıyor)
            // document.title = 'Yardım Merkezi | Şikayet Yönetim Sistemi';
        })
        .catch(error => {
            console.error('Yardım içeriği yüklenirken hata:', error);
            showToast('Yardım içeriği yüklenemedi. Lütfen daha sonra tekrar deneyin.', 'Hata', 'error');

            // Hata durumunda yardım içeriğini manuel olarak oluştur (gerçek uygulamada bu kısım olmaz veya fallback mekanizması olur)
            createSampleHelpContent();

            // Kategorileri ve içeriği göster
            updateCategoriesList();

            // Popüler makaleleri göster
            // updatePopularArticles();

            // Ana sayfayı göster
            showHomepage();
        });
}

// URL'den makale ID'sini al
function getArticleIdFromUrl() {
    // URL'yi analiz et (örnek: /yardim/makale-id veya /yardim/kategori/makale-id)
    const path = window.location.pathname;
    const parts = path.split('/').filter(part => part !== ''); // Boş kısımları filtrele

    // /yardim/makale-id örneği
    if (parts.length === 2 && parts[0] === 'yardim' && !helpContent?.categories.some(c => c.id === parts[1])) {
         // parts[1]'in bir kategori ID'si olup olmadığını kontrol et (opsiyonel iyileştirme)
        return parts[1];
    }

    // /yardim/kategori/makale-id örneği
    if (parts.length === 3 && parts[0] === 'yardim') {
        // parts[1]'in geçerli bir kategori ID olup olmadığını kontrol edebiliriz
        return parts[2];
    }

    // URL'de parametre olarak ?article=makale-id varsa
    const urlParams = new URLSearchParams(window.location.search);
    const articleParam = urlParams.get('article');
    if (articleParam) {
        return articleParam;
    }

    return null;
}

// İçerik yüklenene kadar bekleyip makaleyi göster
function waitForContentAndShowArticle(articleId) {
    if (helpContent) {
        showArticle(articleId);
    } else {
        // İçerik yüklenmezse sonsuz döngüye girmemek için bir sayaç eklenebilir
        console.log("İçerik bekleniyor...");
        setTimeout(() => waitForContentAndShowArticle(articleId), 100);
    }
}

// Kategorileri güncelle (Sol Sidebar için)
function updateCategoriesList() {
    const categoriesListEl = document.getElementById('helpCategoriesList');
    if (!categoriesListEl || !helpContent || !helpContent.categories) {
        console.warn("Kategori listesi elementi veya yardım içeriği bulunamadı/hatalı.");
        return;
    }

    // Kategori listesini temizle
    categoriesListEl.innerHTML = '';

    // "Tüm Kategoriler" veya "Ana Sayfa" linki ekle
    const homeLink = document.createElement('a');
    homeLink.href = '/yardim';
    homeLink.className = `list-group-item list-group-item-action ${!currentCategoryId ? 'active' : ''}`; // Ana sayfadaysa aktif
    homeLink.innerHTML = '<i class="fas fa-home me-2"></i> Ana Sayfa';
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showHomepage();
    });
    categoriesListEl.appendChild(homeLink);


    // Kategorileri ekle
    helpContent.categories.forEach(category => {
        const categoryItem = document.createElement('a');
        categoryItem.href = `/yardim/${category.id}`;
        categoryItem.className = `list-group-item list-group-item-action ${currentCategoryId === category.id ? 'active' : ''}`;
        categoryItem.dataset.categoryId = category.id; // Kategori ID'sini data attribute olarak ekle
        categoryItem.innerHTML = `
            <i class="${category.icon || 'fas fa-folder'} me-2"></i>
            ${sanitizeHTML(category.title)}
            <span class="badge bg-secondary float-end">${category.articles?.length || 0}</span>
        `;

        // Tıklama olayı ekle
        categoryItem.addEventListener('click', function(e) {
            e.preventDefault();
            showCategory(category.id);
        });

        categoriesListEl.appendChild(categoryItem);
    });
}

// Popüler makaleleri güncelle (Sağ Sidebar için)
function updatePopularArticles() {
    const popularArticlesList = document.getElementById('popularArticlesList');
    if (!popularArticlesList || !helpContent || !helpContent.categories) {
         console.warn("Popüler makale listesi elementi veya yardım içeriği bulunamadı/hatalı.");
        return;
    }

    // Liste içeriğini temizle
    popularArticlesList.innerHTML = '';

    // Tüm makaleleri topla ve popülerliğe göre sırala
    const allArticles = [];
    helpContent.categories.forEach(category => {
        // category.articles null veya undefined değilse devam et
        if(Array.isArray(category.articles)) {
            category.articles.forEach(article => {
                 // Popülerlik skoru (views * 1 + likes * 3)
                const popularityScore = (article.views || 0) + (article.likes || 0) * 3;
                allArticles.push({
                    ...article,
                    categoryId: category.id,
                    popularityScore
                });
            });
        }
    });

    // Popülerliğe göre sırala ve en popüler 5 tanesini al
    const popularArticles = allArticles
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, 5); // İlk 5 makaleyi al

    // Popüler makaleleri listele
    if (popularArticles.length === 0) {
        popularArticlesList.innerHTML = '<div class="text-center p-3"><p class="text-muted mb-0">Henüz popüler makale bulunmuyor.</p></div>';
    } else {
        popularArticles.forEach(article => {
            const articleItem = document.createElement('a');
            articleItem.href = `/yardim/${article.id}`; // URL'yi makale ID'si ile oluştur
            articleItem.className = 'list-group-item list-group-item-action popular-article-link'; // Tıklama için sınıf ekle
            articleItem.dataset.articleId = article.id; // Makale ID'sini data attribute olarak ekle
            articleItem.innerHTML = `
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <span class="mb-1 small">${sanitizeHTML(article.title)}</span>
                    <span class="badge bg-primary rounded-pill small">${article.views || 0} <i class="fas fa-eye ms-1"></i></span>
                </div>
            `;

            // Tıklama olayı ekle (Event delegation yerine doğrudan eklemek daha basit olabilir burada)
            articleItem.addEventListener('click', function(e) {
                e.preventDefault();
                showArticle(article.id);
            });

            popularArticlesList.appendChild(articleItem);
        });
    }
}


// İlgili makaleleri güncelle (Sağ Sidebar, makale gösterilirken)
function updateRelatedArticles(currentArticleId, categoryId) {
    const relatedArticlesList = document.getElementById('relatedArticlesList');
    if (!relatedArticlesList || !helpContent || !helpContent.categories) {
        console.warn("İlgili makale listesi elementi veya yardım içeriği bulunamadı/hatalı.");
        return;
    }

    // Liste içeriğini temizle
    relatedArticlesList.innerHTML = '';

    // Belirtilen kategorideki makaleleri bul (mevcut makale hariç)
    const category = helpContent.categories.find(c => c.id === categoryId);
    if (!category || !Array.isArray(category.articles)) {
        relatedArticlesList.innerHTML = '<div class="text-center p-3"><p class="text-muted mb-0">İlgili makale bulunamadı.</p></div>';
        return;
    }

    const relatedArticles = category.articles
        .filter(article => article.id !== currentArticleId) // Mevcut makaleyi filtrele
        .slice(0, 5); // En fazla 5 ilgili makale göster

    // İlgili makaleleri listele
    if (relatedArticles.length === 0) {
        relatedArticlesList.innerHTML = '<div class="text-center p-3"><p class="text-muted mb-0">Bu kategoride başka makale yok.</p></div>';
    } else {
        relatedArticles.forEach(article => {
            const articleItem = document.createElement('a');
            articleItem.href = `/yardim/${article.id}`; // URL'yi makale ID'si ile oluştur
            articleItem.className = 'list-group-item list-group-item-action related-article-link'; // Tıklama için sınıf ekle
            articleItem.dataset.articleId = article.id; // Makale ID'sini data attribute olarak ekle
            articleItem.innerHTML = `<small>${sanitizeHTML(article.title)}</small>`; // Küçük font

            // Tıklama olayı ekle
            articleItem.addEventListener('click', function(e) {
                e.preventDefault();
                showArticle(article.id);
            });

            relatedArticlesList.appendChild(articleItem);
        });
    }

    // İlgili makaleler varsa başlığı göster
    const relatedArticlesCard = document.getElementById('relatedArticlesCard');
     if (relatedArticlesCard) {
         relatedArticlesCard.style.display = relatedArticles.length > 0 ? 'block' : 'none';
     }
}


// Ana sayfayı göster
function showHomepage() {
    const helpContentEl = document.getElementById('helpContent');
    if (!helpContentEl || !helpContent || !helpContent.categories) {
         console.error("Ana içerik alanı veya yardım içeriği bulunamadı/hatalı.");
        return;
    }

    currentCategoryId = null; // Kategori seçimini sıfırla
    currentArticleId = null; // Makale seçimini sıfırla

    // Arama sonuçlarını gizle
    const searchResultsEl = document.getElementById('searchResults');
    if (searchResultsEl) {
        searchResultsEl.style.display = 'none';
        // Arama kutusunu da temizleyebiliriz
        const searchInput = document.getElementById('helpSearchInput');
        if(searchInput) searchInput.value = '';
    }


    // Makale detayına özel alanları gizle (geri bildirim, ilgili makaleler, navigasyon)
    const articleSpecificSections = ['articleFeedback', 'relatedArticlesCard', 'articleNavContainer'];
    articleSpecificSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });


    // URL'yi güncelle
    window.history.pushState({}, 'Yardım Merkezi', '/yardim');

    // Sayfa başlığını güncelle
    document.title = 'Yardım Merkezi | Şikayet Yönetim Sistemi';

    // Sol sidebar kategori seçimini güncelle
    updateCategoriesList();
    // Sağ sidebar popüler makaleleri güncelle
    updatePopularArticles();


    // Ana sayfa içeriğini oluştur
    let homepageHTML = `
        <div class="welcome-banner p-4 bg-light rounded shadow-sm mb-4">
            <h1 class="display-6 mb-3"><i class="fas fa-life-ring me-2"></i> Yardım Merkezi</h1>
            <p class="lead">Şikayet Yönetim Sistemi hakkında sık sorulan sorular ve yardım içeriklerini burada bulabilirsiniz.</p>
        </div>

        <h2 class="mb-4">Kategoriler</h2>
        <div class="category-grid row g-4 mb-5">
    `;

    // Kategorileri göster
    helpContent.categories.forEach(category => {
        // SSS kategorisini ana gridde gösterme (opsiyonel, aşağıda ayrı gösteriliyor)
        if (category.id === 'sss') return;

        const articleCount = category.articles?.length || 0;
        homepageHTML += `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 category-card-link shadow-sm" role="button" tabindex="0" data-category-id="${category.id}">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex align-items-center mb-3">
                            <div class="category-icon me-3 text-primary">
                                <i class="${category.icon || 'fas fa-folder'} fa-2x"></i>
                            </div>
                            <h5 class="card-title mb-0">${sanitizeHTML(category.title)}</h5>
                        </div>
                        <p class="card-text text-muted small flex-grow-1">${sanitizeHTML(category.description || '')}</p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <small class="text-muted">${articleCount} makale</small>
                            <span class="btn btn-sm btn-outline-primary">İncele <i class="fas fa-arrow-right ms-1"></i></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    homepageHTML += `
        </div>

        <h2 class="mb-4">Sık Sorulan Sorular (SSS)</h2>
        <div class="faq-section mb-5">
             <div class="accordion" id="faqAccordionHomepage">
    `;

    // SSS makalelerini bul
    const faqCategory = helpContent.categories.find(c => c.id === 'sss');
    const faqArticles = faqCategory && Array.isArray(faqCategory.articles) ? faqCategory.articles : [];

    if (faqArticles.length === 0) {
        homepageHTML += `<p class="text-muted small">Henüz sık sorulan soru bulunmuyor.</p>`;
    } else {
        // En popüler veya ilk 5 SSS'yi göster
        faqArticles.slice(0, 5).forEach((faq, index) => {
            const collapseId = `faqCollapseHomepage${index}`;
            const headingId = `faqHeadingHomepage${index}`;
            homepageHTML += `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="${headingId}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                            ${sanitizeHTML(faq.title)}
                        </button>
                    </h2>
                    <div id="${collapseId}" class="accordion-collapse collapse" aria-labelledby="${headingId}" data-bs-parent="#faqAccordionHomepage">
                        <div class="accordion-body">
                            <p>${sanitizeHTML(faq.summary || 'Detaylı bilgi için makaleyi inceleyin.')}</p>
                            <a href="/yardim/${faq.id}" class="btn btn-sm btn-link p-0 article-link" data-article-id="${faq.id}">Devamını Oku <i class="fas fa-angle-right ms-1"></i></a>
                        </div>
                    </div>
                </div>
            `;
        });
         // Tüm SSS'leri görmek için link
        if (faqArticles.length > 5) {
             homepageHTML += `
                 <div class="text-center mt-3">
                     <a href="/yardim/sss" class="btn btn-outline-secondary category-link" data-category-id="sss">
                         Tüm Sık Sorulan Soruları Gör
                     </a>
                 </div>
             `;
         }
    }

    homepageHTML += `
             </div>
        </div>

        <div class="contact-section mt-5 p-4 bg-primary text-white rounded shadow">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h4>Aradığınızı bulamadınız mı?</h4>
                    <p class="mb-0">Destek ekibimize ulaşarak doğrudan yardım alabilirsiniz.</p>
                </div>
                <div class="col-md-4 text-md-end mt-3 mt-md-0">
                    <a href="#" class="btn btn-light" data-bs-toggle="modal" data-bs-target="#createComplaintModal"> <i class="fas fa-headset me-1"></i> Destek İsteyin
                    </a>
                </div>
            </div>
        </div>
    `;

    // İçeriği güncelle
    helpContentEl.innerHTML = homepageHTML;

    // Kategori kartlarına tıklama olayı ekle (Event delegation daha performanslı olabilir)
    helpContentEl.querySelectorAll('.category-card-link').forEach(card => {
        card.addEventListener('click', function() {
            const categoryId = this.dataset.categoryId;
            showCategory(categoryId);
        });
         // Enter tuşuyla da çalışması için
        card.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                 e.preventDefault(); // Boşluk tuşunun sayfayı kaydırmasını engelle
                const categoryId = this.dataset.categoryId;
                showCategory(categoryId);
            }
        });
    });


    // Makale bağlantılarına tıklama olayı ekle
    helpContentEl.querySelectorAll('.article-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const articleId = this.dataset.articleId;
            showArticle(articleId);
        });
    });

    // Kategori linklerine tıklama olayı ekle (Tüm SSS butonu gibi)
    helpContentEl.querySelectorAll('.category-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const categoryId = this.dataset.categoryId;
            showCategory(categoryId);
        });
    });
}


// Kategori sayfasını göster
function showCategory(categoryId) {
    const helpContentEl = document.getElementById('helpContent');
    if (!helpContentEl || !helpContent || !helpContent.categories) {
        console.error("Ana içerik alanı veya yardım içeriği bulunamadı/hatalı.");
        return;
    }


    // Kategoriyi bul
    const category = helpContent.categories.find(c => c.id === categoryId);
    if (!category) {
        showToast('Kategori bulunamadı!', 'Hata', 'error');
        showHomepage(); // Kategori yoksa ana sayfaya yönlendir
        return;
    }

    currentCategoryId = categoryId; // Kategori seçimini güncelle
    currentArticleId = null; // Makale seçimini sıfırla

    // Arama sonuçlarını gizle
    const searchResultsEl = document.getElementById('searchResults');
    if (searchResultsEl) {
        searchResultsEl.style.display = 'none';
    }

    // Makale detayına özel alanları gizle
    const articleSpecificSections = ['articleFeedback', 'relatedArticlesCard', 'articleNavContainer'];
    articleSpecificSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });


    // URL'yi güncelle
    window.history.pushState({}, category.title, `/yardim/${categoryId}`);

    // Sayfa başlığını güncelle
    document.title = `${sanitizeHTML(category.title)} | Yardım Merkezi`;

    // Sol sidebar kategori seçimini güncelle
    updateCategoriesList();
    // Sağ sidebar popüler makaleleri güncelle (kategori sayfasında da gösterilebilir)
    updatePopularArticles();


    // Kategori sayfası içeriğini oluştur
    let categoryHTML = `
        <nav aria-label="breadcrumb" class="mb-4">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="/yardim" class="home-link">Yardım Merkezi</a></li>
                <li class="breadcrumb-item active" aria-current="page">${sanitizeHTML(category.title)}</li>
            </ol>
        </nav>

        <div class="category-header mb-4">
            <div class="d-flex align-items-center mb-3">
                <div class="category-icon me-3 text-primary">
                    <i class="${category.icon || 'fas fa-folder'} fa-3x"></i>
                </div>
                <div>
                    <h1 class="display-6 mb-0">${sanitizeHTML(category.title)}</h1>
                     ${category.description ? `<p class="lead text-muted mb-0">${sanitizeHTML(category.description)}</p>` : ''}
                 </div>
            </div>
        </div>

        <h2 class="mb-4">Bu Kategorideki Makaleler</h2>
        <div class="articles-list">
    `;

    // Makaleleri listele
     const articles = category.articles || [];
    if (articles.length === 0) {
        categoryHTML += `<div class="alert alert-info">Bu kategoride henüz makale bulunmuyor.</div>`;
    } else {
        categoryHTML += `<div class="row g-4">`; // Kartları satır içine al

        articles.forEach(article => {
            categoryHTML += `
                <div class="col-md-6">
                     <div class="card h-100 article-card-link shadow-sm" role="button" tabindex="0" data-article-id="${article.id}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${sanitizeHTML(article.title)}</h5>
                            <p class="card-text text-muted small flex-grow-1">${sanitizeHTML(article.summary || '')}</p>
                            <div class="mt-auto d-flex justify-content-between align-items-center">
                                 <small class="text-muted">${article.views || 0} <i class="fas fa-eye ms-1"></i></small>
                                 <span class="btn btn-sm btn-link p-0">Devamını Oku <i class="fas fa-angle-right ms-1"></i></span>
                             </div>
                        </div>
                    </div>
                </div>
            `;
        });

        categoryHTML += `</div>`; // row g-4 kapanışı
    }

    categoryHTML += `</div>`; // articles-list kapanışı

    // İçeriği güncelle
    helpContentEl.innerHTML = categoryHTML;

    // Ana sayfa bağlantısına tıklama olayı ekle
    helpContentEl.querySelector('.home-link')?.addEventListener('click', function(e) {
        e.preventDefault();
        showHomepage();
    });

    // Makale kartlarına tıklama olayı ekle
    helpContentEl.querySelectorAll('.article-card-link').forEach(card => {
        card.addEventListener('click', function() {
            const articleId = this.dataset.articleId;
            showArticle(articleId);
        });
         // Enter tuşuyla da çalışması için
         card.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                 e.preventDefault();
                const articleId = this.dataset.articleId;
                showArticle(articleId);
            }
        });
    });
}


// Makale detayını göster
function showArticle(articleId) {
    const helpContentEl = document.getElementById('helpContent');
    if (!helpContentEl || !helpContent || !helpContent.categories) {
         console.error("Ana içerik alanı veya yardım içeriği bulunamadı/hatalı.");
        return;
    }


    // Makaleyi bul
    let foundArticle = null;
    let articleCategoryId = null; // categoryId isminde çakışma olmaması için
    let categoryData = null;

    // Tüm kategorilerde ara
    for (const category of helpContent.categories) {
         if (Array.isArray(category.articles)) {
            const article = category.articles.find(a => a.id === articleId);
            if (article) {
                foundArticle = article;
                articleCategoryId = category.id;
                categoryData = category; // Kategori verisini de sakla
                break; // Makale bulundu, döngüden çık
            }
         }
    }


    if (!foundArticle) {
        showToast('Makale bulunamadı!', 'Hata', 'error');
        showHomepage(); // Makale yoksa ana sayfaya yönlendir
        return;
    }

    currentArticleId = articleId; // Makale seçimini güncelle
    currentCategoryId = articleCategoryId; // Kategori seçimini güncelle

    // URL'yi güncelle (makale ID'si ile)
    window.history.pushState({}, foundArticle.title, `/yardim/${articleId}`);

    // Sayfa başlığını güncelle
    document.title = `${sanitizeHTML(foundArticle.title)} | Yardım Merkezi`;

    // Sol sidebar kategori seçimini güncelle
    updateCategoriesList();

     // Sağ sidebar: İlgili makaleleri güncelle
    updateRelatedArticles(articleId, articleCategoryId);
     // Sağ sidebar: Popüler makaleleri göster (isteğe bağlı, zaten gösteriliyor olabilir)
    updatePopularArticles();

    // Arama sonuçlarını gizle
    const searchResultsEl = document.getElementById('searchResults');
    if (searchResultsEl) {
        searchResultsEl.style.display = 'none';
    }

    // Görüntülenme sayısını arttır (sadece backend'de yapılmalı, frontend'de geçici olarak)
    // Bu kısım normalde backend'e bir istek göndererek yapılmalı
    foundArticle.views = (foundArticle.views || 0) + 1;
    console.log(`"${foundArticle.title}" görüntülenme sayısı (frontend): ${foundArticle.views}`);
    // Backend'e bildirim gönderilebilir: sendArticleView(articleId);


    // Makale içeriğini oluştur
    let articleHTML = `
        <nav aria-label="breadcrumb" class="mb-4">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="/yardim" class="home-link">Yardım Merkezi</a></li>
                <li class="breadcrumb-item"><a href="/yardim/${articleCategoryId}" class="category-link" data-category-id="${articleCategoryId}">${sanitizeHTML(categoryData.title)}</a></li>
                <li class="breadcrumb-item active" aria-current="page">${sanitizeHTML(foundArticle.title)}</li>
            </ol>
        </nav>

        <article class="article-content">
            <div class="article-header mb-4 border-bottom pb-3">
                <h1 class="display-6 mb-3">${sanitizeHTML(foundArticle.title)}</h1>
                <div class="article-meta d-flex flex-wrap gap-3 text-muted small">
                    <div class="meta-item" title="Kategori">
                        <i class="fas fa-folder me-1"></i> ${sanitizeHTML(categoryData.title)}
                    </div>
                    <div class="meta-item" title="Görüntülenme">
                        <i class="fas fa-eye me-1"></i> ${foundArticle.views || 0}
                    </div>
                    <div class="meta-item" title="Beğeni">
                        <i class="fas fa-thumbs-up me-1"></i> <span id="articleLikesCount">${foundArticle.likes || 0}</span>
                    </div>
                    <div class="meta-item" title="Son Güncelleme">
                        <i class="fas fa-calendar-alt me-1"></i> ${foundArticle.updatedAt || 'Belirtilmemiş'}
                    </div>
                </div>
            </div>

            ${foundArticle.summary ? `
            <div class="article-summary alert alert-secondary p-3 mb-4">
                <p class="lead mb-0">${sanitizeHTML(foundArticle.summary)}</p>
            </div>
            ` : ''}

            <div class="article-body">
                ${sanitizeHTML(foundArticle.content)}
            </div>

            ${foundArticle.tags && foundArticle.tags.length > 0 ? `
            <div class="article-tags mt-4">
                <strong class="me-2"><i class="fas fa-tags me-1"></i>Etiketler:</strong>
                ${foundArticle.tags.map(tag => `
                    <span class="badge bg-light text-dark me-1">${sanitizeHTML(tag)}</span>
                `).join('')}
            </div>
            ` : ''}
        </article>
    `;

    // İçeriği güncelle
    helpContentEl.innerHTML = articleHTML;

    // Geri bildirim bölümünü ve navigasyonu göster
    const articleFeedback = document.getElementById('articleFeedback');
    const articleNavContainer = document.getElementById('articleNavContainer');
    if (articleFeedback) {
        articleFeedback.style.display = 'block';
        // Feedback formunu sıfırla
        resetFeedbackForm();
    }
     if (articleNavContainer) {
         articleNavContainer.style.display = 'block';
     }


    // Breadcrumb bağlantılarına tıklama olayı ekle
    helpContentEl.querySelector('.home-link')?.addEventListener('click', function(e) {
        e.preventDefault();
        showHomepage();
    });

    helpContentEl.querySelector('.category-link')?.addEventListener('click', function(e) {
        e.preventDefault();
        const catId = this.dataset.categoryId;
        showCategory(catId);
    });

    // Önceki-sonraki makale navigasyonunu ayarla
    setupArticleNavigation(articleId, articleCategoryId);
}


// Arama işlevselliğini başlat
function initSearchFunctionality() {
    const searchInput = document.getElementById('helpSearchInput');
    const searchButton = document.getElementById('helpSearchButton');
    const clearSearchBtn = document.getElementById('clearSearchBtn'); // Temizleme butonu için ID varsayımı

    if (!searchInput) {
         console.warn("Arama input elementi (helpSearchInput) bulunamadı.");
         return; // Input yoksa devam etme
    }

    // Arama butonu olmasa bile Enter ile çalışabilir
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            performSearch(searchInput.value);
        });
    }

    // Enter tuşuna basılınca arama yap
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Form submit'i engelle (varsa)
            performSearch(this.value);
        }
    });

    // Arama temizleme butonu (varsa)
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            searchInput.value = '';
            const searchResultsEl = document.getElementById('searchResults');
            if (searchResultsEl) {
                searchResultsEl.style.display = 'none';
            }

            // Önceki içeriği göster (arama temizlenince)
            if (currentArticleId) {
                showArticle(currentArticleId);
            } else if (currentCategoryId) {
                showCategory(currentCategoryId);
            } else {
                showHomepage();
            }
        });
    }

     // Input'a yazarken temizle butonunu göster/gizle (opsiyonel)
     if (clearSearchBtn) {
         searchInput.addEventListener('input', function() {
             clearSearchBtn.style.display = this.value.length > 0 ? 'inline-block' : 'none';
         });
         // Başlangıç durumunu ayarla
         clearSearchBtn.style.display = searchInput.value.length > 0 ? 'inline-block' : 'none';
     }
}


// Arama işlemini gerçekleştir
function performSearch(searchTerm) {
    const trimmedSearchTerm = searchTerm.trim();
    if (!trimmedSearchTerm || !helpContent || !helpContent.categories) {
         showToast('Lütfen aramak için bir terim girin.', 'Bilgi', 'info');
        return; // Boş arama yapma
    }

    console.log(`Arama yapılıyor: "${trimmedSearchTerm}"`);

    const searchTermDisplay = document.getElementById('searchTermDisplay');
    const searchResultsList = document.getElementById('searchResultsList');
    const searchResultsContainer = document.getElementById('searchResults'); // Arama sonuçlarını içeren ana div
    const helpContentEl = document.getElementById('helpContent'); // Ana içerik alanı
    const searchResultsCount = document.getElementById('searchResultsCount'); // Sonuç sayısını gösteren element

    if (!searchResultsList || !searchResultsContainer || !helpContentEl) {
         console.error("Arama sonuçları için gerekli HTML elementleri bulunamadı.");
         return;
     }

    // Arama terimini göster (varsa)
    if (searchTermDisplay) {
        searchTermDisplay.textContent = `"${trimmedSearchTerm}"`;
    }

    // Arama sonuçlarını bul
    const results = [];
    const lowerSearchTerm = trimmedSearchTerm.toLowerCase();

    // Her kategorideki makaleleri ara
    helpContent.categories.forEach(category => {
         if(Array.isArray(category.articles)) {
            category.articles.forEach(article => {
                const titleMatch = article.title?.toLowerCase().includes(lowerSearchTerm);
                const contentMatch = article.content?.toLowerCase().includes(lowerSearchTerm);
                const summaryMatch = article.summary?.toLowerCase().includes(lowerSearchTerm);
                const tagsMatch = Array.isArray(article.tags) && article.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm));

                // Eşleşme varsa ve aynı makale daha önce eklenmediyse ekle
                if (titleMatch || contentMatch || summaryMatch || tagsMatch) {
                    // Alakalılık skoru (örnek: başlık=3, özet/etiket=2, içerik=1)
                     let relevance = 0;
                     if (titleMatch) relevance += 3;
                     if (summaryMatch || tagsMatch) relevance += 2;
                     if (contentMatch) relevance += 1;

                    // Makaleyi sadece bir kere ekle
                    if (!results.some(r => r.id === article.id)) {
                        results.push({
                            id: article.id,
                            title: article.title,
                            summary: article.summary || article.content?.substring(0, 150) + '...' || '', // Özet yoksa içerikten al
                            category: {
                                id: category.id,
                                title: category.title
                            },
                            relevance: relevance
                        });
                    }
                }
            });
        }
    });

    // Alakalılığa göre sırala
    results.sort((a, b) => b.relevance - a.relevance);

     // Sonuç sayısını göster (varsa)
     if(searchResultsCount) {
         searchResultsCount.textContent = results.length;
     }

    // Sonuçları göster
    searchResultsList.innerHTML = ''; // Önceki sonuçları temizle
    if (results.length === 0) {
        searchResultsList.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i> Aramanızla eşleşen sonuç bulunamadı. Farklı anahtar kelimeler deneyebilir veya kategorileri inceleyebilirsiniz.
            </div>
        `;
    } else {
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'card mb-3 search-result-item';
            resultItem.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title mb-1">
                         <a href="/yardim/${result.id}" class="search-result-link stretched-link" data-article-id="${result.id}">${sanitizeHTML(result.title)}</a>
                     </h5>
                    <h6 class="card-subtitle mb-2 text-muted small">
                        <i class="fas fa-folder me-1"></i> ${sanitizeHTML(result.category.title)}
                    </h6>
                    <p class="card-text small">${sanitizeHTML(result.summary)}</p>
                </div>
            `;

            searchResultsList.appendChild(resultItem);
        });

        // Arama sonuçlarındaki bağlantılara tıklama olayı ekle
        searchResultsList.querySelectorAll('.search-result-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const articleId = this.dataset.articleId;
                showArticle(articleId);
            });
        });
    }

    // Ana içeriği gizle, arama sonuçlarını göster
    helpContentEl.style.display = 'none';
    searchResultsContainer.style.display = 'block';

    // Arama sonuçları bölümüne scroll yap (opsiyonel)
    searchResultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// Önceki-sonraki makale navigasyonunu ayarla
function setupArticleNavigation(articleId, categoryId) {
    const articleNav = document.getElementById('articleNav'); // Navigasyonun ana div'i
    const prevArticleElement = document.getElementById('prevArticle'); // Önceki link için placeholder
    const nextArticleElement = document.getElementById('nextArticle'); // Sonraki link için placeholder

    // Elementler yoksa veya içerik yüklenmediyse işlemi durdur
    if (!articleNav || !prevArticleElement || !nextArticleElement || !helpContent || !helpContent.categories) {
        console.warn("Makale navigasyon elementleri veya yardım içeriği bulunamadı.");
         // Navigasyonu gizleyebiliriz
         if(articleNav) articleNav.style.display = 'none';
        return;
    }


    // İlgili kategoriyi bul
    const category = helpContent.categories.find(c => c.id === categoryId);
    if (!category || !Array.isArray(category.articles)) {
        // Kategori veya makaleler yoksa navigasyonu gizle
        articleNav.style.display = 'none';
        return;
    }

    // Makalenin kategorideki indeksini bul
    const currentIndex = category.articles.findIndex(a => a.id === articleId);
    if (currentIndex === -1) {
         // Makale kategoride bulunamazsa (beklenmedik durum), navigasyonu gizle
         articleNav.style.display = 'none';
        return;
     }

    // Önceki ve sonraki makale verilerini bul
    const previousArticleData = currentIndex > 0 ? category.articles[currentIndex - 1] : null;
    const nextArticleData = currentIndex < category.articles.length - 1 ? category.articles[currentIndex + 1] : null;

    // Navigasyon butonlarını güncelle
    prevArticleElement.innerHTML = previousArticleData ? `
        <a href="/yardim/${previousArticleData.id}" class="btn btn-outline-secondary article-nav-link w-100 text-start" data-article-id="${previousArticleData.id}">
            <div class="d-flex align-items-center">
                 <i class="fas fa-arrow-left me-2"></i>
                 <div>
                     <small class="d-block text-muted">Önceki Makale</small>
                     <span>${sanitizeHTML(previousArticleData.title)}</span>
                 </div>
             </div>
        </a>
    ` : '<div class="invisible"></div>'; // Boşluk bırakmak için görünmez div

    nextArticleElement.innerHTML = nextArticleData ? `
        <a href="/yardim/${nextArticleData.id}" class="btn btn-outline-primary article-nav-link w-100 text-end" data-article-id="${nextArticleData.id}">
             <div class="d-flex align-items-center justify-content-end">
                 <div>
                     <small class="d-block text-muted">Sonraki Makale</small>
                     <span>${sanitizeHTML(nextArticleData.title)}</span>
                 </div>
                 <i class="fas fa-arrow-right ms-2"></i>
             </div>
        </a>
    ` : '<div class="invisible"></div>'; // Boşluk bırakmak için görünmez div

    // Navigasyon bölümünü göster (eğer en az bir link varsa)
    articleNav.style.display = (previousArticleData || nextArticleData) ? 'flex' : 'none';

    // Navigasyon butonlarına tıklama olayı ekle (Event delegation daha iyi olabilir)
    articleNav.querySelectorAll('.article-nav-link').forEach(link => {
        // Önceki olay dinleyicilerini kaldır (varsa) - yeniden eklenmeyi önlemek için
        // link.replaceWith(link.cloneNode(true)); // Bu yöntem basit ama iç içe elementlerde sorun çıkarabilir
        // Alternatif: Bir işaretçi ile kontrol et veya doğrudan eklemeden önce kaldır

        link.addEventListener('click', function navigateArticle(e) {
            e.preventDefault();
            const targetArticleId = this.dataset.articleId;
            showArticle(targetArticleId);
            // Olay dinleyicisini kaldır (tek kullanımlık gibi davranması için veya showArticle içinde tekrar ekleneceği için)
            // link.removeEventListener('click', navigateArticle);
        });
    });
}


// Makale geri bildirim formunu başlat
function initArticleFeedback() {
    const feedbackContainer = document.getElementById('articleFeedback');
    if (!feedbackContainer) return; // Geri bildirim bölümü yoksa çık

    const helpfulBtn = feedbackContainer.querySelector('#helpfulBtn');
    const notHelpfulBtn = feedbackContainer.querySelector('#notHelpfulBtn');
    const feedbackForm = feedbackContainer.querySelector('#feedbackForm');
    const feedbackText = feedbackContainer.querySelector('#feedbackText');
    const submitFeedbackBtn = feedbackContainer.querySelector('#submitFeedbackBtn');
    const feedbackThankYou = feedbackContainer.querySelector('#feedbackThankYou');
    const feedbackQuestion = feedbackContainer.querySelector('#feedbackQuestion'); // Soru metni

    if (!helpfulBtn || !notHelpfulBtn || !feedbackForm || !feedbackText || !submitFeedbackBtn || !feedbackThankYou || !feedbackQuestion) {
        console.warn("Geri bildirim bölümündeki bazı HTML elementleri bulunamadı.");
        return;
    }

    // Yardımcı oldu butonu
    helpfulBtn.addEventListener('click', function() {
        // Beğeni sayısını arttır (sadece frontend, backend'e de gönderilmeli)
        if (currentArticleId && helpContent) {
            let articleFound = false;
            helpContent.categories.forEach(category => {
                if(Array.isArray(category.articles)) {
                    const article = category.articles.find(a => a.id === currentArticleId);
                    if (article) {
                        article.likes = (article.likes || 0) + 1;
                        articleFound = true;
                         // Backend'e beğeni bilgisini gönder
                        // sendFeedback(currentArticleId, true, null);
                        console.log(`"${article.title}" beğenildi (frontend): ${article.likes}`);
                         // Beğeni sayısını anında güncelle
                         const likesCountEl = document.getElementById('articleLikesCount');
                         if(likesCountEl) likesCountEl.textContent = article.likes;
                    }
                }
            });

            if (articleFound) {
                // Teşekkür mesajını göster, soru ve butonları gizle
                feedbackQuestion.style.display = 'none';
                feedbackForm.style.display = 'none';
                feedbackThankYou.textContent = "Geri bildiriminiz için teşekkürler!";
                feedbackThankYou.style.display = 'block';

                // Butonları devre dışı bırak veya gizle
                helpfulBtn.disabled = true;
                notHelpfulBtn.disabled = true;
                helpfulBtn.classList.add('btn-success'); // Görsel onay

                // Belirli bir süre sonra eski haline döndürme (opsiyonel)
                // setTimeout(resetFeedbackForm, 5000);
            }
        }
    });

    // Yardımcı olmadı butonu
    notHelpfulBtn.addEventListener('click', function() {
        // Geri bildirim formunu göster, soru ve diğer butonları gizle
        feedbackQuestion.style.display = 'none';
        feedbackForm.style.display = 'block';
        feedbackThankYou.style.display = 'none';
        helpfulBtn.disabled = true; // Diğer butonu da kilitle
        notHelpfulBtn.disabled = true;
        notHelpfulBtn.classList.add('btn-danger'); // Görsel onay
        feedbackText.focus();
    });

    // Geri bildirim gönder butonu
    submitFeedbackBtn.addEventListener('click', function() {
        const feedback = feedbackText.value.trim();
        if (!feedback) {
            showToast('Lütfen geri bildirim yazın.', 'Uyarı', 'warning');
            feedbackText.focus();
            return;
        }

        // Burada geri bildirimi sunucuya gönderecek kod olacak
        console.log(`Makale ID: ${currentArticleId}, Geri bildirim:`, feedback);
        // sendFeedback(currentArticleId, false, feedback);

        // Formu gizle, teşekkür mesajını göster
        feedbackForm.style.display = 'none';
        feedbackThankYou.textContent = "Detaylı geri bildiriminiz için teşekkür ederiz!";
        feedbackThankYou.style.display = 'block';

        // Butonlar zaten devre dışı bırakılmıştı.
        // helpfulBtn.disabled = true;
        // notHelpfulBtn.disabled = true;

         // Belirli bir süre sonra eski haline döndürme (opsiyonel)
        // setTimeout(resetFeedbackForm, 5000);
    });
}

// Geri bildirim formunu sıfırlayan yardımcı fonksiyon
function resetFeedbackForm() {
    const feedbackContainer = document.getElementById('articleFeedback');
    if (!feedbackContainer) return;

    const helpfulBtn = feedbackContainer.querySelector('#helpfulBtn');
    const notHelpfulBtn = feedbackContainer.querySelector('#notHelpfulBtn');
    const feedbackForm = feedbackContainer.querySelector('#feedbackForm');
    const feedbackText = feedbackContainer.querySelector('#feedbackText');
    const feedbackThankYou = feedbackContainer.querySelector('#feedbackThankYou');
    const feedbackQuestion = feedbackContainer.querySelector('#feedbackQuestion');

    if (feedbackQuestion) feedbackQuestion.style.display = 'block';
    if (feedbackThankYou) feedbackThankYou.style.display = 'none';
    if (feedbackForm) feedbackForm.style.display = 'none';
    if (feedbackText) feedbackText.value = ''; // Textarea'yı temizle

    if (helpfulBtn) {
        helpfulBtn.disabled = false;
        helpfulBtn.classList.remove('btn-success');
    }
    if (notHelpfulBtn) {
        notHelpfulBtn.disabled = false;
        notHelpfulBtn.classList.remove('btn-danger');
    }
}


// --- ÖRNEK İÇERİK (API ÇALIŞMAZSA KULLANILIR) ---
// Örnek yardım içeriği oluştur (gerçek uygulamada JSON dosyasını oku veya API'den al)
function createSampleHelpContent() {
    helpContent = {
        categories: [
            {
                id: "baslangic",
                title: "Başlangıç Rehberi",
                icon: "fas fa-rocket",
                description: "Platformumuzu kullanmaya başlarken bilmeniz gerekenler.",
                articles: [
                    {
                        id: "baslangic-kayit",
                        title: "Kayıt ve Giriş",
                        summary: "Platformumuza nasıl kayıt olacağınız ve giriş yapacağınız hakkında bilgiler.",
                        content: `<h2>Kayıt Olma</h2>
                        <p>Platformumuza kayıt olmak için ana sayfadaki "Kayıt Ol" butonuna tıklayarak gerekli bilgileri doldurmanız yeterlidir. E-posta adresinizi ve güçlü bir şifre belirleyerek hesabınızı oluşturabilirsiniz.</p>

                        <h2>Giriş Yapma</h2>
                        <p>Kayıt olduktan sonra, ana sayfadaki "Giriş Yap" butonunu kullanarak e-posta ve şifrenizle giriş yapabilirsiniz. "Beni Hatırla" seçeneğini işaretlerseniz, tarayıcınız kapansa bile bir sonraki ziyaretinizde otomatik olarak giriş yapabilirsiniz.</p>

                        <h2>Şifremi Unuttum</h2>
                        <p>Şifrenizi unuttuysanız, giriş sayfasındaki "Şifremi Unuttum" bağlantısını kullanarak şifre sıfırlama talimatlarını içeren bir e-posta alabilirsiniz.</p>`,
                        views: 120,
                        likes: 45,
                        updatedAt: "15.03.2025",
                         tags: ["kayıt", "giriş", "hesap", "şifre"]
                    },
                    {
                        id: "baslangic-profil",
                        title: "Profil Ayarları",
                        summary: "Profil bilgilerinizi nasıl güncelleyeceğiniz ve hesap ayarlarınızı nasıl yöneteceğiniz.",
                        content: `<h2>Profil Bilgilerinizi Düzenleme</h2>
                        <p>Profil bilgilerinizi düzenlemek için sağ üst köşedeki profil resminize tıklayarak açılan menüden "Profil Ayarları"nı seçin. Burada adınız, soyadınız, profil resminiz ve diğer bilgilerinizi güncelleyebilirsiniz.</p>

                        <h2>Şifre Değiştirme</h2>
                        <p>Şifrenizi değiştirmek için Profil Ayarları sayfasındaki "Güvenlik" sekmesine gidin ve "Şifre Değiştir" butonuna tıklayın. Mevcut şifrenizi ve yeni şifrenizi girerek değişikliği onaylayabilirsiniz.</p>

                        <h2>Bildirim Ayarları</h2>
                        <p>Hangi durumlar için bildirim almak istediğinizi seçmek için "Bildirim Ayarları" sekmesini kullanabilirsiniz. E-posta, uygulama içi ve SMS bildirimleri için ayrı ayrı tercihler belirleyebilirsiniz.</p>`,
                        views: 85,
                        likes: 32,
                        updatedAt: "20.03.2025",
                        tags: ["profil", "ayarlar", "şifre", "bildirim"]
                    },
                    {
                        id: "baslangic-arayuz",
                        title: "Kullanıcı Arayüzü",
                        summary: "Platformumuzun arayüzünü tanıyın ve gezinmeyi öğrenin.",
                        content: `<h2>Ana Sayfa</h2>
                        <p>Ana sayfa, platformdaki en güncel ve popüler şikayetleri görüntüleyebileceğiniz yerdir. Üst kısımda kategorilere göre filtreleme yapabilir, arama çubuğunu kullanarak belirli şikayetleri bulabilirsiniz.</p>

                        <h2>Navigasyon Çubuğu</h2>
                        <p>Ekranın üst kısmındaki navigasyon çubuğu, platformun farklı bölümlerine hızlıca erişmenizi sağlar. "Anasayfa", "Keşfet", "Markalar" ve "Yardım" gibi seçenekler bulunur.</p>

                        <h2>Profil Menüsü</h2>
                        <p>Sağ üst köşedeki profil resminize tıklayarak açılan menüden "Profilim", "Şikayetlerim", "Bildirimler" ve "Çıkış" gibi seçeneklere ulaşabilirsiniz.</p>`,
                        views: 67,
                        likes: 28,
                        updatedAt: "25.03.2025",
                        tags: ["arayüz", "navigasyon", "menü", "kullanım"]
                    }
                ]
            },
            {
                id: "sikayet-yonetimi",
                title: "Şikayet Yönetimi",
                icon: "fas fa-clipboard-list",
                description: "Şikayetlerinizi nasıl oluşturacağınız ve yöneteceğiniz hakkında bilgiler.",
                articles: [
                    {
                        id: "sikayet-olusturma",
                        title: "Şikayet Nasıl Oluşturulur?",
                        summary: "Etkili bir şikayet oluşturmak için adım adım kılavuz.",
                        content: `<h2>Şikayet Oluşturma Adımları</h2>
                        <p>Yeni bir şikayet oluşturmak için şu adımları izleyebilirsiniz:</p>

                        <ol>
                            <li>Ana sayfada veya herhangi bir sayfada bulunan "Şikayet Yaz" butonuna tıklayın.</li>
                            <li>Açılan formda şikayetinizle ilgili temel bilgileri girin (başlık, marka adı, kategori).</li>
                            <li>"İleri" butonuna tıklayarak bir sonraki adıma geçin.</li>
                            <li>Şikayetinizin detaylarını yazın ve isterseniz ilgili görselleri ekleyin.</li>
                            <li>Son adımda deneyiminizi puanlayın ve şikayeti gönderin.</li>
                        </ol>

                        <h2>Etkili Bir Şikayet Nasıl Yazılır?</h2>
                        <p>Etkili bir şikayet yazmak için şu noktalara dikkat edin:</p>

                        <ul>
                            <li>Başlık kısa ve açıklayıcı olmalıdır.</li>
                            <li>Şikayet metni açık, net ve anlaşılır olmalıdır.</li>
                            <li>Yaşadığınız sorunu kronolojik sırayla anlatın.</li>
                            <li>Mümkünse kanıt olabilecek görseller ekleyin.</li>
                            <li>Beklentinizi açıkça belirtin.</li>
                        </ul>`,
                        views: 145,
                        likes: 67,
                        updatedAt: "10.03.2025",
                         tags: ["şikayet", "oluşturma", "yazma", "adım adım"]
                    },
                    {
                        id: "sikayet-takibi",
                        title: "Şikayet Takibi",
                        summary: "Gönderdiğiniz şikayetlerin durumunu nasıl takip edeceğiniz.",
                        content: `<h2>Şikayet Durumları</h2>
                        <p>Platformumuzda şikayetler şu durumlarda olabilir:</p>

                        <ul>
                            <li><strong>Beklemede</strong>: Şikayetiniz henüz incelenmemiş.</li>
                            <li><strong>Açık</strong>: Şikayetiniz onaylanmış ve yayında.</li>
                            <li><strong>Çözüldü</strong>: Şikayetiniz marka tarafından çözülmüş.</li>
                            <li><strong>Kapalı</strong>: Şikayetiniz kapanmış (çözülmüş veya başka bir nedenle).</li>
                        </ul>

                        <h2>Şikayetlerinizi Takip Etme</h2>
                        <p>Gönderdiğiniz şikayetleri takip etmek için profilinizdeki "Şikayetlerim" bölümünü kullanabilirsiniz. Burada tüm şikayetlerinizi durumlarına göre görüntüleyebilir ve detaylarına erişebilirsiniz.</p>

                        <h2>Bildirimler</h2>
                        <p>Şikayetinizle ilgili herhangi bir güncelleme olduğunda (durum değişikliği, yorum, vb.) size bildirim gönderilir. Bildirimleri profilinizdeki "Bildirimler" bölümünden takip edebilirsiniz.</p>`,
                        views: 98,
                        likes: 42,
                        updatedAt: "12.03.2025",
                         tags: ["şikayet", "takip", "durum", "bildirim"]
                    },
                    {
                        id: "sikayet-yorumlari",
                        title: "Şikayet Yorumları",
                        summary: "Şikayetlere nasıl yorum yapacağınız ve yorumları nasıl yöneteceğiniz.",
                        content: `<h2>Yorum Yapma</h2>
                        <p>Herhangi bir şikayete yorum yapmak için, şikayet detay sayfasının altındaki yorum formunu kullanabilirsiniz. Yorumunuzu yazın ve "Gönder" butonuna tıklayın.</p>

                        <h2>Yorumlara Yanıt Verme</h2>
                        <p>Bir yoruma yanıt vermek için, ilgili yorumun altındaki "Yanıtla" butonuna tıklayın. Yanıtınızı yazın ve "Gönder" butonuna tıklayın. Yanıtlar, ilgili yorumun altında iç içe görüntülenir.</p>

                        <h2>Kendi Yorumlarınızı Düzenleme</h2>
                        <p>Kendi yorumlarınızı düzenlemek veya silmek için, yorumunuzun sağ üst köşesindeki "..." simgesine tıklayın ve açılan menüden istediğiniz işlemi seçin.</p>`,
                        views: 75,
                        likes: 31,
                        updatedAt: "15.03.2025",
                         tags: ["şikayet", "yorum", "yanıt", "düzenleme"]
                    }
                ]
            },
            {
                id: "markalar",
                title: "Markalar ve Şirketler",
                icon: "fas fa-building",
                description: "Markalar nasıl yanıt verir ve marka profillerini nasıl görüntülersiniz?",
                articles: [
                    {
                        id: "marka-profilleri",
                        title: "Marka Profilleri",
                        summary: "Marka profil sayfalarını nasıl kullanacağınız ve yorumlayacağınız.",
                        content: `<h2>Marka Profil Sayfaları Nedir?</h2>
                        <p>Marka profil sayfaları, platformumuzdaki her markanın kendine ait özel bir sayfasıdır. Bu sayfalarda markanın genel performansı, şikayet çözüm oranları, yanıt süreleri ve kullanıcı değerlendirmeleri gibi bilgileri bulabilirsiniz.</p>

                        <h2>Marka Profillerinde Neler Var?</h2>
                        <ul>
                            <li><strong>Genel Performans</strong>: Markanın genel değerlendirme puanı ve çözüm oranı.</li>
                            <li><strong>Şikayet İstatistikleri</strong>: Toplam şikayet sayısı, çözülen şikayet sayısı ve ortalama yanıt süresi.</li>
                            <li><strong>Kategori Dağılımı</strong>: Markaya gelen şikayetlerin kategorilere göre dağılımı.</li>
                            <li><strong>Puan Dağılımı</strong>: Kullanıcıların markaya verdikleri puanların dağılımı.</li>
                            <li><strong>Zaman İçindeki Gelişim</strong>: Markanın performansının zaman içindeki değişimi.</li>
                            <li><strong>Şikayet Listesi</strong>: Markaya ait tüm şikayetler ve durumları.</li>
                        </ul>

                        <h2>Marka Profillerini Nasıl Kullanabilirsiniz?</h2>
                        <p>Marka profillerini şu amaçlar için kullanabilirsiniz:</p>

                        <ul>
                            <li>Bir markayla ilgili genel memnuniyet durumunu öğrenmek.</li>
                            <li>Markanın hangi konularda daha çok şikayet aldığını görmek.</li>
                            <li>Markanın şikayetlere nasıl yanıt verdiğini incelemek.</li>
                            <li>Marka ile ilgili karar vermeden önce kullanıcı deneyimlerini okumak.</li>
                        </ul>`,
                        views: 110,
                        likes: 52,
                        updatedAt: "18.03.2025",
                         tags: ["marka", "profil", "istatistik", "performans"]
                    },
                    {
                        id: "marka-siralamasi",
                        title: "Marka Sıralaması",
                        summary: "Markaları performanslarına göre nasıl sıralayacağınız ve karşılaştıracağınız.",
                        content: `<h2>Marka Sıralaması Nedir?</h2>
                        <p>Marka sıralaması, platformumuzdaki markaları çeşitli performans metriklerine göre karşılaştırmanızı sağlayan bir özelliktir. Bu özellik sayesinde en iyi hizmeti veren markaları kolayca bulabilir ve karşılaştırabilirsiniz.</p>

                        <h2>Sıralama Kriterleri</h2>
                        <p>Markaları şu kriterlere göre sıralayabilirsiniz:</p>

                        <ul>
                            <li><strong>Genel Skor</strong>: Çözüm oranı, puan ve yanıt süresinin ağırlıklı ortalaması.</li>
                            <li><strong>Çözüm Oranı</strong>: Markanın çözdüğü şikayetlerin toplam şikayetlere oranı.</li>
                            <li><strong>Yanıt Süresi</strong>: Markanın şikayetlere ortalama yanıt verme süresi.</li>
                            <li><strong>Ortalama Puan</strong>: Kullanıcıların markaya verdikleri puanların ortalaması.</li>
                            <li><strong>Şikayet Sayısı</strong>: Markaya gelen toplam şikayet sayısı.</li>
                        </ul>

                        <h2>Filtreleme Seçenekleri</h2>
                        <p>Sıralama sonuçlarını şu filtrelere göre daraltabilirsiniz:</p>

                        <ul>
                            <li><strong>Kategori</strong>: Belirli bir kategoride faaliyet gösteren markalar.</li>
                            <li><strong>Minimum Şikayet Sayısı</strong>: Belirlediğiniz sayıdan fazla şikayeti olan markalar.</li>
                            <li><strong>Arama</strong>: Belirli bir marka adına göre arama.</li>
                        </ul>`,
                        views: 95,
                        likes: 48,
                        updatedAt: "20.03.2025",
                         tags: ["marka", "sıralama", "karşılaştırma", "filtre"]
                    },
                    {
                        id: "marka-cozumleri",
                        title: "Marka Çözümleri",
                        summary: "Markalar şikayetleri nasıl çözer ve siz nasıl takip edersiniz?",
                        content: `<h2>Şikayet Çözüm Süreci</h2>
                        <p>Platformumuzda bir şikayet oluşturduğunuzda, ilgili markaya bildirim gönderilir. Markanın şikayeti çözmek için izlediği adımlar şunlardır:</p>

                        <ol>
                            <li>Marka, şikayeti inceler ve gerekirse ek bilgi ister.</li>
                            <li>Sorunun çözümü için gerekli işlemleri yapar.</li>
                            <li>Şikayete resmi bir yanıt yazar.</li>
                            <li>Çözüm sağlandığında şikayeti "Çözüldü" olarak işaretler.</li>
                        </ol>

                        <h2>Çözüm Onayı</h2>
                        <p>Marka bir şikayeti "Çözüldü" olarak işaretlediğinde, size bir bildirim gönderilir. Bu durumda iki seçeneğiniz vardır:</p>

                        <ul>
                            <li><strong>Çözümü Onaylamak</strong>: Sorun gerçekten çözüldüyse, çözümü onaylayabilirsiniz.</li>
                            <li><strong>Çözümü Reddetmek</strong>: Sorun halen devam ediyorsa, çözümü reddedebilir ve gerekçenizi belirtebilirsiniz.</li>
                        </ul>

                        <h2>Çözüm Sürelerini Takip Etme</h2>
                        <p>Her markanın ortalama çözüm süresini marka profil sayfasında görebilirsiniz. Ayrıca, marka sıralaması sayfasında markaları çözüm sürelerine göre karşılaştırabilirsiniz.</p>`,
                        views: 87,
                        likes: 39,
                        updatedAt: "22.03.2025",
                         tags: ["marka", "çözüm", "süreç", "onay"]
                    }
                ]
            },
            {
                id: "sss",
                title: "Sık Sorulan Sorular",
                icon: "fas fa-question-circle",
                description: "En çok sorulan sorular ve yanıtları.",
                articles: [
                    {
                        id: "sss-uyelik",
                        title: "Üyelik ve Hesap Soruları",
                        summary: "Hesap oluşturma, giriş yapma ve hesap ayarları hakkında sık sorulan sorular.",
                        content: `<h2>Üyelik Ücretsiz mi?</h2>
                        <p>Evet, platformumuza üye olmak tamamen ücretsizdir. Temel özelliklerin tümünü ücretsiz olarak kullanabilirsiniz. Ayrıca, daha fazla özellik için premium üyelik seçeneklerimiz de bulunmaktadır.</p>

                        <h2>Şifremi Unuttum, Ne Yapmalıyım?</h2>
                        <p>Şifrenizi unuttuysanız, giriş sayfasındaki "Şifremi Unuttum" bağlantısını kullanarak şifre sıfırlama talimatlarını içeren bir e-posta alabilirsiniz. E-postadaki bağlantıya tıklayarak yeni bir şifre oluşturabilirsiniz.</p>

                        <h2>E-posta Adresimi Değiştirebilir miyim?</h2>
                        <p>Evet, profil ayarlarınızdan e-posta adresinizi değiştirebilirsiniz. Ancak, yeni e-posta adresinizi doğrulamanız gerekecektir. Bunun için, yeni e-posta adresinize bir doğrulama bağlantısı gönderilecektir.</p>

                        <h2>Hesabımı Nasıl Silebilirim?</h2>
                        <p>Hesabınızı silmek için profil ayarlarınızdaki "Hesap" sekmesine gidin ve "Hesabı Sil" butonuna tıklayın. Hesabınızı silmeden önce, tüm verilerinizin kalıcı olarak silineceğini ve bu işlemin geri alınamayacağını unutmayın.</p>`,
                        views: 130,
                        likes: 62,
                        updatedAt: "25.03.2025",
                        tags: ["sss", "üyelik", "hesap", "şifre", "silme"]
                    },
                    {
                        id: "sss-sikayet",
                        title: "Şikayet Süreci Soruları",
                        summary: "Şikayet oluşturma, takip etme ve çözümleme hakkında sık sorulan sorular.",
                        content: `<h2>Şikayetim Ne Kadar Sürede Yayınlanır?</h2>
                        <p>Şikayetiniz, gönderildikten sonra içerik kurallarımıza uygunluğu kontrol edilir. Bu inceleme genellikle 24 saat içinde tamamlanır. İnceleme sonucunda şikayetiniz onaylanırsa hemen yayınlanır.</p>

                        <h2>Şikayetimi Düzenleyebilir miyim?</h2>
                        <p>Şikayetiniz henüz onaylanmamışsa düzenleyebilirsiniz. Onaylandıktan sonra ana içeriği düzenleyemezsiniz, ancak ek bilgiler ekleyebilir veya yorumlar yapabilirsiniz.</p>

                        <h2>Şikayetime Yanıt Gelmezse Ne Yapmalıyım?</h2>
                        <p>Markaların şikayetlere yanıt verme süreleri değişebilir. Şikayetiniz yayınlandıktan sonra 14 gün içinde yanıt almazsanız, "Yanıt Hatırlatması Gönder" butonunu kullanarak markaya bir hatırlatma gönderebilirsiniz.</p>

                        <h2>Şikayetimi Silebilir miyim?</h2>
                        <p>Evet, şikayetinizi istediğiniz zaman silebilirsiniz. Ancak, şikayetinize yanıt verilmiş veya çözüm sağlanmışsa, şikayetinizin silinmesi yerine "Kapalı" durumuna getirilmesini öneririz.</p>`,
                        views: 125,
                        likes: 58,
                        updatedAt: "27.03.2025",
                         tags: ["sss", "şikayet", "süre", "yanıt", "düzenleme", "silme"]
                    },
                    {
                        id: "sss-gizlilik",
                        title: "Gizlilik ve Güvenlik Soruları",
                        summary: "Veri güvenliği, gizlilik politikası ve kişisel bilgiler hakkında sık sorulan sorular.",
                        content: `<h2>Kişisel Bilgilerim Güvende mi?</h2>
                        <p>Evet, kişisel bilgilerinizin güvenliği bizim için çok önemlidir. En güncel güvenlik önlemlerini kullanarak verilerinizi koruyoruz. Detaylı bilgi için Gizlilik Politikamızı inceleyebilirsiniz.</p>

                        <h2>Şikayetlerim Herkese Açık mı?</h2>
                        <p>Evet, platformumuzda paylaştığınız şikayetler (kişisel bilgileriniz hariç) herkese açıktır. Şikayet oluştururken isminizi gizleme seçeneğiniz bulunmaktadır.</p>

                        <h2>Şikayetlerimde Adımı Gizleyebilir miyim?</h2>
                        <p>Evet, şikayet oluştururken "İsmimi Gizle" seçeneğini işaretleyerek adınızı gizleyebilirsiniz. Bu durumda, şikayetiniz "Anonim Kullanıcı" olarak görüntülenir.</p>

                        <h2>Platformunuz KVKK'ya Uyumlu mu?</h2>
                        <p>Evet, platformumuz Kişisel Verilerin Korunması Kanunu (KVKK) ile tam uyumludur. Veri işleme politikalarımız ve haklarınız hakkında detaylı bilgi için Gizlilik Politikamızı inceleyebilirsiniz.</p>`,
                        views: 115,
                        likes: 53,
                        updatedAt: "30.03.2025",
                         tags: ["sss", "gizlilik", "güvenlik", "kvkk", "anonim"]
                    }
                    // Daha fazla SSS eklenebilir...
                ]
            },
            {
                id: "teknik",
                title: "Teknik Destek",
                icon: "fas fa-cogs",
                description: "Teknik sorunlar ve çözümleri hakkında yardım içeriği.",
                articles: [
                    {
                        id: "teknik-tarayici",
                        title: "Tarayıcı Uyumluluğu ve Sorunları",
                        summary: "Hangi tarayıcıları kullanabilirsiniz ve tarayıcı sorunlarını nasıl çözersiniz?",
                        content: `<h2>Desteklenen Tarayıcılar</h2>
                        <p>Platformumuz aşağıdaki tarayıcıların güncel sürümleriyle en iyi şekilde çalışır:</p>
                        <ul><li>Google Chrome</li><li>Mozilla Firefox</li><li>Safari</li><li>Microsoft Edge</li><li>Opera</li></ul>
                        <p>En iyi deneyim için tarayıcınızı güncel tutmanızı öneririz.</p>
                        <h2>Tarayıcı Önbelleğini Temizleme</h2>
                        <p>Platform ile ilgili görsel veya işlevsel sorunlar yaşıyorsanız, tarayıcınızın önbelleğini temizlemek sorunu çözebilir. Bu işlem genellikle tarayıcı ayarlarının "Geçmiş" veya "Gizlilik ve Güvenlik" bölümünden yapılır.</p>
                        <h3>Chrome:</h3> <p>Ayarlar > Gizlilik ve güvenlik > Tarama verilerini temizle > "Önbelleğe alınmış resimler ve dosyalar" seçeneğini işaretleyip "Verileri temizle" butonuna tıklayın.</p>
                        <h3>Firefox:</h3> <p>Ayarlar > Gizlilik ve Güvenlik > Çerezler ve site verileri > "Verileri Temizle..." > "Önbelleğe alınmış web içeriği" seçeneğini işaretleyip "Temizle" butonuna tıklayın.</p>
                        <h2>Çerezleri Etkinleştirme</h2>
                        <p>Platformumuz, oturumunuzu yönetmek ve tercihlerinizi hatırlamak için çerezleri kullanır. Tarayıcınızda çerezler devre dışı bırakılmışsa, giriş yapma ve diğer özellikleri kullanma konusunda sorunlar yaşayabilirsiniz. Çerezlerin genellikle tarayıcı ayarlarının "Gizlilik ve Güvenlik" bölümünden etkinleştirildiğinden emin olun.</p>`,
                        views: 85,
                        likes: 37,
                        updatedAt: "02.04.2025",
                         tags: ["teknik", "tarayıcı", "chrome", "firefox", "önbellek", "çerez"]
                    },
                    {
                        id: "teknik-mobil",
                        title: "Mobil Kullanım",
                        summary: "Mobil cihazlarda platformu nasıl kullanacağınız ve mobil sorunları nasıl çözeceğiniz.",
                        content: `<h2>Mobil Tarayıcı Kullanımı</h2>
                        <p>Platformumuz, mobil tarayıcılar için optimize edilmiştir (responsive tasarım). Cihazınızdaki güncel bir mobil tarayıcı (Chrome, Safari, vb.) ile platformumuza sorunsuz bir şekilde erişebilirsiniz.</p>
                        <h2>Mobil Uygulama</h2>
                        <p>Şu anda resmi bir mobil uygulamamız bulunmamaktadır. Platformumuza mobil tarayıcınız üzerinden erişebilirsiniz.</p>
                        <h2>Mobil Sorunu Bildirme</h2>
                        <p>Mobil cihazınızda platformumuzu kullanırken herhangi bir sorunla karşılaşırsanız, lütfen sorunun detaylarını (cihaz modeli, tarayıcı, işletim sistemi, sorunun ekran görüntüsü vb.) destek ekibimize bildirin.</p>`,
                        views: 72,
                        likes: 31,
                        updatedAt: "05.04.2025",
                         tags: ["teknik", "mobil", "telefon", "tablet", "uygulama"]
                    },
                    {
                        id: "teknik-hatalar",
                        title: "Hata Kodları ve Çözümleri",
                        summary: "Karşılaşabileceğiniz hata kodları ve çözüm yöntemleri.",
                        content: `<h2>Genel Hata Kodları</h2>
                        <p>Platformumuzda karşılaşabileceğiniz bazı genel HTTP hata kodları ve olası anlamları:</p>
                        <ul>
                        <li><strong>Hata 401 (Unauthorized):</strong> Oturumunuz sona ermiş veya giriş yapmanız gerekiyor. Tekrar giriş yapmayı deneyin.</li>
                        <li><strong>Hata 403 (Forbidden):</strong> Bu sayfaya veya içeriğe erişim yetkiniz yok.</li>
                        <li><strong>Hata 404 (Not Found):</strong> Ulaşmaya çalıştığınız sayfa mevcut değil veya kaldırılmış. URL'yi kontrol edin veya ana sayfaya dönün.</li>
                        <li><strong>Hata 500 (Internal Server Error):</strong> Sunucu tarafında beklenmedik bir sorun oluştu. Sayfayı yenileyin, sorun devam ederse bir süre sonra tekrar deneyin veya destek ekibimize bildirin.</li>
                        </ul>
                        <h2>İçerik Yükleme Sorunları</h2>
                        <p>Sayfalar veya içerikler düzgün yüklenmiyorsa, internet bağlantınızı kontrol edin, sayfayı yenileyin (Ctrl+F5 ile zorla yenileme yapabilirsiniz) ve tarayıcı önbelleğini temizlemeyi deneyin.</p>
                        <h2>Görsel Yükleme Hataları</h2>
                        <p>Görsel yüklerken hata alıyorsanız, görselin desteklenen bir formatta (genellikle JPG, PNG, GIF) ve izin verilen boyut sınırları içinde olduğundan emin olun.</p>`,
                        views: 98,
                        likes: 45,
                        updatedAt: "08.04.2025",
                         tags: ["teknik", "hata", "kod", "404", "500", "sorun"]
                    }
                ]
            }
        ]
    };

    console.log('Örnek yardım içeriği oluşturuldu:', helpContent);
}