// help-article.js - Yardım merkezi makale sayfası işlevleri
import { showToast, sanitizeHTML } from './utils.js';

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    console.log("Yardım makalesi sayfası yükleniyor...");
    
    // URL'den makale ID'sini al
    const articleId = getArticleIdFromUrl();
    
    if (!articleId) {
        showToast('Makale kimliği bulunamadı!', 'Hata', 'error');
        // Yardım merkezine yönlendir
        window.location.href = '/yardim';
        return;
    }
    
    // Tema kontrolü
    initTheme();
    
    // Makale içeriğini yükle
    loadArticle(articleId);
    
    // İlgili makaleleri yükle
    loadRelatedArticles(articleId);
    
    // Diğer olayları başlat
    initEvents();
});

// URL'den makale ID'sini çıkarır
function getArticleIdFromUrl() {
    // URL'den makale ID'sini çıkar (örn: '/yardim/makale/etkin-sikayet-yazmak')
    const pathParts = window.location.pathname.split('/');
    let articleId = '';
    
    if (pathParts.length >= 4 && pathParts[1].toLowerCase() === 'yardim' && pathParts[2].toLowerCase() === 'makale') {
        // URL-encoded makale ID'sini decode et
        articleId = decodeURIComponent(pathParts[3]);
    }
    
    return articleId;
}

// Makale verilerini yükle
async function loadArticle(articleId) {
    const articleContainer = document.getElementById('articleContainer');
    const articleTitle = document.getElementById('articleTitle');
    const breadcrumbArticleTitle = document.getElementById('breadcrumbArticleTitle');
    const articleContent = document.getElementById('articleContent');
    const articleDate = document.getElementById('articleDate');
    const articleCategory = document.getElementById('articleCategory');
    const categoryLink = document.getElementById('categoryLink');
    
    if (!articleContainer || !articleTitle || !breadcrumbArticleTitle || !articleContent || !articleDate || !articleCategory || !categoryLink) {
        console.error("Makale gösterim elementleri bulunamadı!");
        return;
    }
    
    try {
        // Yardım içeriğini fetch et
        const response = await fetch('/api/help-content.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const helpContent = await response.json();
        
        // Makaleyi bul
        let foundArticle = null;
        let foundCategory = null;
        
        // Tüm kategorileri ve makaleleri kontrol et
        for (const category of helpContent.categories) {
            const article = category.articles.find(a => a.id === articleId);
            if (article) {
                foundArticle = article;
                foundCategory = category;
                break;
            }
        }
        
        if (!foundArticle || !foundCategory) {
            throw new Error('Makale bulunamadı');
        }
        
        // Sayfa başlığını güncelle
        document.title = `${foundArticle.title} | Yardım Merkezi`;
        
        // Makale içeriğini doldur
        articleTitle.textContent = foundArticle.title;
        breadcrumbArticleTitle.textContent = foundArticle.title;
        articleContent.innerHTML = sanitizeHTML(foundArticle.content);
        
        // Kategori ve tarih bilgisini doldur
        articleCategory.textContent = foundCategory.title;
        categoryLink.href = `/yardim/kategori/${foundCategory.id}`;
        
        // Tarih bilgisini doldur
        const lastUpdated = foundArticle.lastUpdated ? new Date(foundArticle.lastUpdated) : new Date();
        articleDate.textContent = lastUpdated.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // İçerik yükleme ekranını gizle
        const loadingSpinner = document.getElementById('articleLoadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
        // Makale içeriğini göster
        articleContainer.style.display = 'block';
        
        // İçindekiler tablosunu oluştur
        createTableOfContents();
        
        console.log(`"${foundArticle.title}" makalesi başarıyla yüklendi.`);
    } catch (error) {
        console.error("Makale yüklenirken hata:", error);
        showToast('Makale yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', 'Hata', 'error');
        
        // Hata mesajını göster
        articleContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                <strong>Hata!</strong> Makale yüklenirken bir sorun oluştu. 
                <a href="/yardim" class="alert-link">Yardım ana sayfasına dönün</a>.
            </div>
        `;
        articleContainer.style.display = 'block';
        
        // Yükleme ekranını gizle
        const loadingSpinner = document.getElementById('articleLoadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
    }
}

// İlgili makaleleri yükle
async function loadRelatedArticles(currentArticleId) {
    const relatedArticlesContainer = document.getElementById('relatedArticles');
    
    if (!relatedArticlesContainer) {
        console.error("İlgili makaleler konteyneri bulunamadı!");
        return;
    }
    
    try {
        // Yardım içeriğini fetch et
        const response = await fetch('/api/help-content.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const helpContent = await response.json();
        
        // Mevcut makaleyi ve kategorisini bul
        let currentArticle = null;
        let currentCategory = null;
        
        for (const category of helpContent.categories) {
            const article = category.articles.find(a => a.id === currentArticleId);
            if (article) {
                currentArticle = article;
                currentCategory = category;
                break;
            }
        }
        
        if (!currentArticle || !currentCategory) {
            throw new Error('Mevcut makale bulunamadı');
        }
        
        // İlgili makaleleri topla (aynı kategorideki diğer makaleler)
        let relatedArticles = currentCategory.articles
            .filter(article => article.id !== currentArticleId) // Mevcut makaleyi hariç tut
            .slice(0, 4); // En fazla 4 tane göster
        
        // Yeterli ilgili makale yoksa, farklı kategorilerden popüler makaleleri ekle
        if (relatedArticles.length < 4) {
            const neededCount = 4 - relatedArticles.length;
            const otherArticles = [];
            
            helpContent.categories.forEach(category => {
                if (category.id !== currentCategory.id) {
                    category.articles.forEach(article => {
                        if (article.popular) {
                            otherArticles.push({
                                ...article,
                                categoryId: category.id,
                                categoryTitle: category.title
                            });
                        }
                    });
                }
            });
            
            // Popüler makalelerden rastgele ekle
            if (otherArticles.length > 0) {
                otherArticles.sort(() => 0.5 - Math.random()); // Rastgele karıştır
                relatedArticles = [...relatedArticles, ...otherArticles.slice(0, neededCount)];
            }
        }
        
        // İlgili makaleleri göster
        if (relatedArticles.length > 0) {
            relatedArticlesContainer.innerHTML = '';
            
            relatedArticles.forEach(article => {
                const isFromSameCategory = !article.categoryTitle; // categoryTitle varsa farklı kategoriden
                
                const articleElement = document.createElement('div');
                articleElement.className = 'col-md-6 col-lg-3';
                articleElement.innerHTML = `
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">
                                <a href="/yardim/makale/${article.id}" class="text-decoration-none">${sanitizeHTML(article.title)}</a>
                            </h5>
                            <p class="card-text small text-muted">
                                ${isFromSameCategory 
                                    ? `<span class="badge bg-primary">${sanitizeHTML(currentCategory.title)}</span>` 
                                    : `<span class="badge bg-secondary">${sanitizeHTML(article.categoryTitle)}</span>`}
                            </p>
                        </div>
                    </div>
                `;
                relatedArticlesContainer.appendChild(articleElement);
            });
        } else {
            relatedArticlesContainer.innerHTML = `
                <div class="col-12">
                    <p class="text-muted text-center">Bu kategoride başka makale bulunmuyor.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("İlgili makaleler yüklenirken hata:", error);
        relatedArticlesContainer.innerHTML = `
            <div class="col-12">
                <p class="text-muted text-center">İlgili makaleler yüklenirken bir sorun oluştu.</p>
            </div>
        `;
    }
}

// İçindekiler tablosunu oluştur
function createTableOfContents() {
    const articleContent = document.getElementById('articleContent');
    const tocContainer = document.getElementById('tableOfContents');
    
    if (!articleContent || !tocContainer) return;
    
    // H2 ve H3 başlıklarını bul
    const headings = articleContent.querySelectorAll('h2, h3');
    
    if (headings.length === 0) {
        tocContainer.closest('.card').style.display = 'none';
        return;
    }
    
    // İçindekiler listesini oluştur
    const tocList = document.createElement('ul');
    tocList.className = 'list-unstyled mb-0';
    
    headings.forEach((heading, index) => {
        // Her başlık için benzersiz bir ID oluştur (yoksa)
        if (!heading.id) {
            heading.id = `heading-${index}`;
        }
        
        // Başlık seviyesine göre stil ayarla
        const isSubHeading = heading.tagName.toLowerCase() === 'h3';
        
        // Liste ögesi oluştur
        const listItem = document.createElement('li');
        listItem.className = isSubHeading ? 'ms-3 mt-1' : 'mt-2';
        
        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.className = 'text-decoration-none d-flex align-items-center';
        link.innerHTML = `
            ${isSubHeading ? '<i class="fas fa-angle-right me-1 text-muted small"></i>' : ''}
            <span class="${isSubHeading ? 'small' : 'fw-medium'}">${heading.textContent}</span>
        `;
        
        // Tıklama olayı (smooth scroll)
        link.addEventListener('click', function(e) {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth' });
        });
        
        listItem.appendChild(link);
        tocList.appendChild(listItem);
    });
    
    tocContainer.innerHTML = '';
    tocContainer.appendChild(tocList);
}

// Tema kontrolü
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
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
                localStorage.setItem('theme', 'light');
            }
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

// Diğer olayları başlat
function initEvents() {
    // Arama formu
    const searchForm = document.getElementById('helpSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchTerm = document.getElementById('helpSearchInput').value.trim();
            if (searchTerm) {
                window.location.href = `/yardim/arama?q=${encodeURIComponent(searchTerm)}`;
            }
        });
    }
    
    // Faydalı butonları
    const helpfulButtons = document.querySelectorAll('.helpful-btn');
    helpfulButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Aktif sınıfını kaldır veya ekle
            button.classList.toggle('active');
            const otherButtonId = button.id === 'helpfulYesBtn' ? 'helpfulNoBtn' : 'helpfulYesBtn';
            const otherButton = document.getElementById(otherButtonId);
            
            if (otherButton && otherButton.classList.contains('active')) {
                otherButton.classList.remove('active');
            }
            
            // Sunucuya gönderilecek veri (localstorage'da saklayabiliriz şimdilik)
            const articleId = getArticleIdFromUrl();
            const isHelpful = button.id === 'helpfulYesBtn';
            
            if (articleId) {
                // LocalStorage'a kaydet
                const helpfulData = JSON.parse(localStorage.getItem('helpfulArticles') || '{}');
                helpfulData[articleId] = isHelpful;
                localStorage.setItem('helpfulArticles', JSON.stringify(helpfulData));
                
                // Kullanıcıya bildirim
                showToast(`Geri bildiriminiz için teşekkürler!`, 'Başarılı', 'success');
            }
        });
    });
    
    // Sayfa yüklendiğinde önceki tercih varsa işaretle
    const articleId = getArticleIdFromUrl();
    if (articleId) {
        const helpfulData = JSON.parse(localStorage.getItem('helpfulArticles') || '{}');
        if (articleId in helpfulData) {
            const buttonId = helpfulData[articleId] ? 'helpfulYesBtn' : 'helpfulNoBtn';
            const button = document.getElementById(buttonId);
            if (button) {
                button.classList.add('active');
            }
        }
    }
}