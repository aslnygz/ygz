// brand-rankings.js - Marka sıralama sayfası işlevleri
import { getComplaints } from './data.js';
import { showToast, sanitizeHTML, formatDate, capitalizeFirstLetter, getDistinctColors } from './utils.js';

// Sabitler
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let filteredBrands = [];
let allBrandMetrics = [];

// Grafik nesneleri
let categoryResolutionChart = null;
let categoryRatingChart = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    console.log("Marka sıralama sayfası yükleniyor...");
    
    // Modalları içe aktar
    importModalsFromMainPage();
    
    // Tema kontrolü (Ana sayfadaki ile aynı)
    initTheme();
    
    // Marka verilerini yükle
    loadAllBrandData();
    
    // Filtre ve arama olaylarını başlat
    initFilterEvents();
    
    // Kategori liderleri seçici olayını başlat
    initCategoryLeaderSelector();
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
                
                modalIds.forEach(id => {
                    const modal = doc.getElementById(id);
                    if (modal) {
                        modalContainer.appendChild(modal.cloneNode(true));
                    }
                });
                
                // Tema değiştirme ve diğer olayları yeniden başlat
                if (typeof window.appEvents !== 'undefined' && window.appEvents.initEventListeners) {
                    window.appEvents.initEventListeners();
                }
                
                console.log("Modallar başarıyla içe aktarıldı.");
            })
            .catch(error => {
                console.error("Modallar içe aktarılırken hata:", error);
                showToast('Bazı sayfa bileşenleri yüklenemedi.', 'Uyarı', 'warning');
            });
    } catch (error) {
        console.error("Modallar içe aktarılırken hata:", error);
    }
}

// Tema kontrolü (brand-profile.js'deki fonksiyonun aynısı)
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
            
            // Grafikleri güncelle
            updateChartTheme(newTheme);
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

// Grafik temasını güncelle
function updateChartTheme(theme) {
    const chartOptions = {
        plugins: {
            legend: { 
                labels: { 
                    color: theme === 'dark' ? '#adb5bd' : '#6c757d'
                }
            },
            tooltip: {
                bodyColor: theme === 'dark' ? '#e9ecef' : '#212529',
                titleColor: theme === 'dark' ? '#e9ecef' : '#212529',
                backgroundColor: theme === 'dark' ? 'rgba(40, 50, 70, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                borderColor: theme === 'dark' ? '#455474' : '#dee2e6'
            }
        },
        scales: {
            x: { 
                ticks: { color: theme === 'dark' ? '#adb5bd' : '#6c757d' }, 
                grid: { color: theme === 'dark' ? '#344767' : '#e9ecef' }
            },
            y: { 
                ticks: { color: theme === 'dark' ? '#adb5bd' : '#6c757d' }, 
                grid: { color: theme === 'dark' ? '#344767' : '#e9ecef' } 
            }
        }
    };
    
    if (categoryResolutionChart) {
        categoryResolutionChart.options.plugins.legend.labels.color = chartOptions.plugins.legend.labels.color;
        categoryResolutionChart.options.plugins.tooltip = chartOptions.plugins.tooltip;
        categoryResolutionChart.options.scales.x = chartOptions.scales.x;
        categoryResolutionChart.options.scales.y = chartOptions.scales.y;
        categoryResolutionChart.update();
    }
    
    if (categoryRatingChart) {
        categoryRatingChart.options.plugins.legend.labels.color = chartOptions.plugins.legend.labels.color;
        categoryRatingChart.options.plugins.tooltip = chartOptions.plugins.tooltip;
        categoryRatingChart.options.scales.x = chartOptions.scales.x;
        categoryRatingChart.options.scales.y = chartOptions.scales.y;
        categoryRatingChart.update();
    }
}

// Marka verilerini yükle
function loadAllBrandData() {
    try {
        // Şikayetleri getir (sadece onaylanmış olanlar)
        const complaints = getComplaints().filter(c => !c.pendingApproval);
        
        if (complaints.length === 0) {
            showToast('Şikayet verisi bulunamadı.', 'Bilgi', 'info');
            updateTablesWithNoData();
            return;
        }
        
        // Marka bazlı metrikleri hesapla
        allBrandMetrics = calculateBrandMetrics(complaints);
        
        if (allBrandMetrics.length === 0) {
            showToast('İşlenecek marka verisi bulunamadı.', 'Bilgi', 'info');
            updateTablesWithNoData();
            return;
        }
        
        // Sonuçları varsayılan sıralamaya göre sırala (genel skor)
        filteredBrands = [...allBrandMetrics].sort((a, b) => b.overallScore - a.overallScore);
        
        // Özet istatistikleri güncelle
        updateSummaryStats(complaints, allBrandMetrics);
        
        // Ana tabloyu doldur
        updateBrandRankingsTable(filteredBrands);
        
        // En iyi 5 markayı göster
        updateTopBrandsTable(filteredBrands.slice(0, 5));
        
        // Kategori grafiklerini oluştur
        createCategoryCharts(complaints, allBrandMetrics);
        
        // Kategori liderlerini güncelle (varsayılan kategori: Müşteri Hizmetleri)
        updateCategoryLeaders('Müşteri Hizmetleri');
        
        console.log(`Toplam ${allBrandMetrics.length} marka için veriler yüklendi.`);
    } catch (error) {
        console.error("Marka verileri yüklenirken hata:", error);
        showToast('Marka verileri yüklenirken hata oluştu.', 'Hata', 'error');
        updateTablesWithNoData();
    }
}

// Veri olmadığında tabloları güncelle
function updateTablesWithNoData() {
    // Top Brands tablosu
    const topBrandsTable = document.getElementById('topBrandsTable');
    if (topBrandsTable) {
        topBrandsTable.querySelector('tbody').innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i> Gösterilecek marka verisi bulunamadı.
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Ana sıralama tablosu
    const rankingsTable = document.getElementById('brandRankingsTable');
    if (rankingsTable) {
        rankingsTable.querySelector('tbody').innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i> Gösterilecek marka verisi bulunamadı.
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Kategori liderleri tablosu
    const leadersTable = document.getElementById('categoryLeadersTable');
    if (leadersTable) {
        leadersTable.querySelector('tbody').innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i> Gösterilecek kategori verisi bulunamadı.
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Özet istatistiklerini güncelle
    document.getElementById('bestCategoryName').textContent = 'Veri yok';
    document.getElementById('bestCategoryRate').textContent = '-%';
    document.getElementById('fastestSectorName').textContent = 'Veri yok';
    document.getElementById('fastestSectorRate').textContent = '- gün';
    document.getElementById('topComplaintCategoryName').textContent = 'Veri yok';
    document.getElementById('topComplaintCategoryCount').textContent = '-';
    
    // Ortalama çözüm oranı çubuğunu güncelle
    const progressBar = document.getElementById('avgResolutionRateProgress');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
    }
    
    // Boş grafikler oluştur
    initEmptyCharts();
    
    // Sayfalamayı gizle
    const paginationEl = document.getElementById('rankingPagination');
    if (paginationEl) {
        paginationEl.style.display = 'none';
    }
}

// Boş grafikler oluştur
function initEmptyCharts() {
    const ctxResolution = document.getElementById('categoryResolutionChart')?.getContext('2d');
    const ctxRating = document.getElementById('categoryRatingChart')?.getContext('2d');
    
    if (ctxResolution) {
        if (categoryResolutionChart) categoryResolutionChart.destroy();
        categoryResolutionChart = new Chart(ctxResolution, {
            type: 'bar',
            data: {
                labels: ['Veri Yok'],
                datasets: [{
                    label: 'Çözüm Oranı',
                    data: [0],
                    backgroundColor: 'rgba(74, 125, 250, 0.2)',
                    borderColor: 'rgba(74, 125, 250, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    if (ctxRating) {
        if (categoryRatingChart) categoryRatingChart.destroy();
        categoryRatingChart = new Chart(ctxRating, {
            type: 'bar',
            data: {
                labels: ['Veri Yok'],
                datasets: [{
                    label: 'Ortalama Puan',
                    data: [0],
                    backgroundColor: 'rgba(45, 206, 137, 0.2)',
                    borderColor: 'rgba(45, 206, 137, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
}

// Marka metriklerini hesapla
function calculateBrandMetrics(complaints) {
    // Marka bazlı istatistikleri topla
    const brandStats = {};
    
    // Her şikayet için metrikleri topla
    complaints.forEach(complaint => {
        const brand = complaint.brand?.trim();
        if (!brand) return; // Markası olmayan şikayetleri atla
        
        const brandKey = brand.toLowerCase();
        
        // Marka için ilk kez işleme alınıyorsa başlangıç verilerini ayarla
        if (!brandStats[brandKey]) {
            brandStats[brandKey] = {
                name: capitalizeFirstLetter(brand),
                totalComplaints: 0,
                resolvedComplaints: 0,
                totalRatingSum: 0,
                ratedComplaints: 0,
                // Kategoriye göre metrikler
                categories: {},
                // Yanıt süresi: simüle edilecek (gerçek veri yok)
                responseDays: 0,
                totalResponseScore: 0, // Yanıt hızlığı skoru için toplam
                // Son şikayet tarihi
                lastComplaintDate: null
            };
        }
        
        // Temel metrikler
        brandStats[brandKey].totalComplaints++;
        
        if (complaint.status?.toLowerCase() === 'çözüldü') {
            brandStats[brandKey].resolvedComplaints++;
        }
        
        // Şikayet tarihi
        const complaintDate = new Date(complaint.date);
        if (!brandStats[brandKey].lastComplaintDate || 
            complaintDate > brandStats[brandKey].lastComplaintDate) {
            brandStats[brandKey].lastComplaintDate = complaintDate;
        }
        
        // Puanlama
        const ratings = complaint.ratings || {};
        let complaintAvg = 0;
        let ratingCount = 0;
        
        for (const key in ratings) {
            const rating = parseFloat(ratings[key]);
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
                complaintAvg += rating;
                ratingCount++;
            }
        }
        
        if (ratingCount > 0) {
            const avgRating = complaintAvg / ratingCount;
            brandStats[brandKey].totalRatingSum += avgRating;
            brandStats[brandKey].ratedComplaints++;
        }
        
        // Kategoriye göre istatistikler
        const category = complaint.category || 'Diğer';
        if (!brandStats[brandKey].categories[category]) {
            brandStats[brandKey].categories[category] = {
                total: 0,
                resolved: 0,
                ratingSum: 0,
                ratedCount: 0
            };
        }
        
        brandStats[brandKey].categories[category].total++;
        
        if (complaint.status?.toLowerCase() === 'çözüldü') {
            brandStats[brandKey].categories[category].resolved++;
        }
        
        if (ratingCount > 0) {
            const avgRating = complaintAvg / ratingCount;
            brandStats[brandKey].categories[category].ratingSum += avgRating;
            brandStats[brandKey].categories[category].ratedCount++;
        }
        
        // Yanıt süresi simülasyonu (gerçek veri olmadığı için)
        // Her marka için 1-10 gün arası rastgele değer
        const responseSpeed = Math.floor(Math.random() * 10) + 1;
        brandStats[brandKey].totalResponseScore += responseSpeed;
    });
    
    // İstatistikleri hesaplanmış metrikler haline getir
    const brandMetrics = [];
    
    for (const brandKey in brandStats) {
        const stats = brandStats[brandKey];
        
        // Eğer toplam şikayet sayısı 0 ise bu markayı atla
        if (stats.totalComplaints === 0) continue;
        
        // Yanıt hızı (1-10 arası, düşük daha iyi)
        const avgResponseDays = stats.totalResponseScore / stats.totalComplaints;
        
        // Çözüm oranı (%)
        const resolutionRate = stats.totalComplaints > 0 ? (stats.resolvedComplaints / stats.totalComplaints) * 100 : 0;
        
        // Ortalama puan (1-5 arası)
        const avgRating = stats.ratedComplaints > 0 ? stats.totalRatingSum / stats.ratedComplaints : 0;
        
        // Kategori bazlı metrikler
        const categoryMetrics = {};
        for (const category in stats.categories) {
            const catStats = stats.categories[category];
            const catResolutionRate = catStats.total > 0 ? (catStats.resolved / catStats.total) * 100 : 0;
            const catAvgRating = catStats.ratedCount > 0 ? catStats.ratingSum / catStats.ratedCount : 0;
            
            categoryMetrics[category] = {
                total: catStats.total,
                resolved: catStats.resolved,
                resolutionRate: catResolutionRate,
                avgRating: catAvgRating,
                // Kategori skoru: Çözüm oranı ve puanın ağırlıklı ortalaması
                score: (catResolutionRate * 0.7) + (catAvgRating * 20 * 0.3) // 0-100 ölçeğinde
            };
        }
        
        // Genel skor hesaplama: 
        // - Çözüm oranı: %60 ağırlık
        // - Ortalama puan: %30 ağırlık (5 üzerinden)
        // - Yanıt süresi: %10 ağırlık (ters orantılı, 10 gün = 0 puan, 1 gün = 10 puan)
        const responseScore = 10 - avgResponseDays; // 10 gün = 0 puan, 1 gün = 9 puan
        const overallScore = (
            (resolutionRate * 0.6) + 
            (avgRating * 20 * 0.3) + // 5 üzerinden puanı 100 üzerinden ölçeğe çevir
            (responseScore * 10 * 0.1) // 0-10 arası yanıt skorunu 100 üzerinden ölçeğe çevir
        );
        
        brandMetrics.push({
            name: stats.name,
            totalComplaints: stats.totalComplaints,
            resolvedComplaints: stats.resolvedComplaints,
            resolutionRate: resolutionRate,
            avgRating: avgRating,
            responseSpeed: avgResponseDays,
            overallScore: overallScore,
            lastComplaintDate: stats.lastComplaintDate,
            categories: categoryMetrics
        });
    }
    
    return brandMetrics;
}

// Özet istatistikleri güncelle
function updateSummaryStats(complaints, brandMetrics) {
    // En yüksek çözüm oranına sahip kategoriyi bul
    const categoryStats = {};
    
    // Şikayetleri kategoriye göre grupla
    complaints.forEach(complaint => {
        const category = complaint.category || 'Diğer';
        
        if (!categoryStats[category]) {
            categoryStats[category] = {
                total: 0,
                resolved: 0
            };
        }
        
        categoryStats[category].total++;
        
        if (complaint.status?.toLowerCase() === 'çözüldü') {
            categoryStats[category].resolved++;
        }
    });
    
    // Kategori çözüm oranlarını hesapla
    let bestCategory = null;
    let bestCategoryRate = 0;
    
    for (const category in categoryStats) {
        const stats = categoryStats[category];
        if (stats.total < 5) continue; // Az şikayeti olan kategorileri dikkate alma
        
        const resolutionRate = (stats.resolved / stats.total) * 100;
        
        if (resolutionRate > bestCategoryRate) {
            bestCategoryRate = resolutionRate;
            bestCategory = category;
        }
    }
    
    // Kategori bilgilerini güncelle
    document.getElementById('bestCategoryName').textContent = bestCategory || 'Veri yok';
    document.getElementById('bestCategoryRate').textContent = bestCategoryRate ? `%${bestCategoryRate.toFixed(0)}` : '-%';
    
    // En hızlı yanıt veren sektörü bul (bu örnekte kategoriler sektör olarak kullanılıyor)
    let fastestCategory = null;
    let fastestResponseDays = 999;
    
    // Her kategori için marka yanıt hızlarını topla ve ortalamasını al
    const categorySpeeds = {};
    
    brandMetrics.forEach(brand => {
        for (const category in brand.categories) {
            if (!categorySpeeds[category]) {
                categorySpeeds[category] = {
                    totalSpeed: 0,
                    count: 0
                };
            }
            
            // Her markanın yanıt süresi o kategori için katkıda bulunur
            // (Gerçek veri olmadığı için marka genel yanıt hızını kullan)
            categorySpeeds[category].totalSpeed += brand.responseSpeed;
            categorySpeeds[category].count++;
        }
    });
    
    // En hızlı kategoriyi bul
    for (const category in categorySpeeds) {
        const stats = categorySpeeds[category];
        if (stats.count < 3) continue; // Az veri olan kategorileri dikkate alma
        
        const avgSpeed = stats.totalSpeed / stats.count;
        
        if (avgSpeed < fastestResponseDays) {
            fastestResponseDays = avgSpeed;
            fastestCategory = category;
        }
    }
    
    // En hızlı sektör bilgilerini güncelle
    document.getElementById('fastestSectorName').textContent = fastestCategory || 'Veri yok';
    document.getElementById('fastestSectorRate').textContent = fastestResponseDays !== 999 ? `${fastestResponseDays.toFixed(1)} gün` : '- gün';
    
    // En çok şikayet edilen kategoriyi bul
    let topComplaintCategory = null;
    let topComplaintCount = 0;
    
    for (const category in categoryStats) {
        const stats = categoryStats[category];
        
        if (stats.total > topComplaintCount) {
            topComplaintCount = stats.total;
            topComplaintCategory = category;
        }
    }
    
    // En çok şikayet edilen kategori bilgilerini güncelle
    document.getElementById('topComplaintCategoryName').textContent = topComplaintCategory || 'Veri yok';
    document.getElementById('topComplaintCategoryCount').textContent = topComplaintCount || '-';
    
    // Ortalama çözüm oranı
    let totalResolved = 0;
    let totalComplaints = 0;
    
    for (const category in categoryStats) {
        totalResolved += categoryStats[category].resolved;
        totalComplaints += categoryStats[category].total;
    }
    
    const avgResolutionRate = totalComplaints > 0 ? (totalResolved / totalComplaints) * 100 : 0;
    
    // Ortalama çözüm oranı çubuğunu güncelle
    const progressBar = document.getElementById('avgResolutionRateProgress');
    if (progressBar) {
        progressBar.style.width = `${avgResolutionRate}%`;
        progressBar.textContent = `%${avgResolutionRate.toFixed(0)}`;
        progressBar.setAttribute('aria-valuenow', avgResolutionRate.toFixed(0));
        
        // Renk sınıflarını temizle ve yeni sınıfı ekle
        progressBar.classList.remove('bg-success', 'bg-warning', 'bg-danger');
        
        if (avgResolutionRate >= 70) {
            progressBar.classList.add('bg-success');
        } else if (avgResolutionRate >= 40) {
            progressBar.classList.add('bg-warning');
        } else {
            progressBar.classList.add('bg-danger');
        }
    }
}

// Top 5 Markalar tablosunu güncelle
function updateTopBrandsTable(topBrands) {
    const tableBody = document.getElementById('topBrandsTable')?.querySelector('tbody');
    if (!tableBody) return;
    
    if (topBrands.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i> Gösterilecek marka verisi bulunamadı.
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    topBrands.forEach((brand, index) => {
        const row = document.createElement('tr');
        row.className = 'brand-row';
        row.setAttribute('data-brand', brand.name);
        
        // Skor rengi belirleme
        let scoreColorClass;
        if (brand.overallScore >= 80) {
            scoreColorClass = 'text-success fw-bold';
        } else if (brand.overallScore >= 60) {
            scoreColorClass = 'text-primary fw-bold';
        } else if (brand.overallScore >= 40) {
            scoreColorClass = 'text-warning fw-bold';
        } else {
            scoreColorClass = 'text-danger fw-bold';
        }
        
        row.innerHTML = `
            <td class="text-center"><span class="badge bg-primary rounded-pill">${index + 1}</span></td>
            <td><strong>${sanitizeHTML(brand.name)}</strong></td>
            <td class="text-center ${scoreColorClass}">${brand.overallScore.toFixed(1)}</td>
            <td class="text-center">${brand.resolutionRate.toFixed(0)}%</td>
            <td class="text-center">${brand.responseSpeed.toFixed(1)} gün</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Marka adına tıklama olayı
    tableBody.querySelectorAll('.brand-row').forEach(row => {
        row.addEventListener('click', function() {
            const brandName = this.getAttribute('data-brand');
            if (brandName) {
                window.location.href = `/marka/${encodeURIComponent(brandName)}`;
            }
        });
        
        // Fare üzerine gelince imleç değiştir
        row.style.cursor = 'pointer';
    });
}

// Ana sıralama tablosunu güncelle
function updateBrandRankingsTable(brands, page = 1) {
    const tableBody = document.getElementById('brandRankingsTable')?.querySelector('tbody');
    if (!tableBody) return;
    
    if (brands.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i> Filtreye uygun marka bulunamadı.
                    </div>
                </td>
            </tr>
        `;
        
        // Sayfalamayı gizle
        const paginationEl = document.getElementById('rankingPagination');
        if (paginationEl) {
            paginationEl.style.display = 'none';
        }
        
        return;
    }
    
    // Sayfalama hesaplamaları
    currentPage = page;
    const totalPages = Math.ceil(brands.length / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, brands.length);
    const currentBrands = brands.slice(startIndex, endIndex);
    
    // Tabloyu temizle ve doldur
    tableBody.innerHTML = '';
    
    currentBrands.forEach((brand, index) => {
        const row = document.createElement('tr');
        row.className = 'brand-row';
        row.setAttribute('data-brand', brand.name);
        
        // Skor rengi belirleme
        let scoreColorClass;
        if (brand.overallScore >= 80) {
            scoreColorClass = 'text-success fw-bold';
        } else if (brand.overallScore >= 60) {
            scoreColorClass = 'text-primary fw-bold';
        } else if (brand.overallScore >= 40) {
            scoreColorClass = 'text-warning fw-bold';
        } else {
            scoreColorClass = 'text-danger fw-bold';
        }
        
        // Puan yıldızları
        const ratingStars = brand.avgRating > 0 ? 
            `<div class="d-flex align-items-center justify-content-center">
                <span class="me-1">${brand.avgRating.toFixed(1)}</span>
                <i class="fas fa-star text-warning small"></i>
            </div>` : 
            '<span class="text-muted">-</span>';
        
        const actualRank = startIndex + index + 1;
        
        row.innerHTML = `
            <td class="ps-3"><span class="badge bg-primary rounded-pill">${actualRank}</span></td>
            <td><strong>${sanitizeHTML(brand.name)}</strong></td>
            <td class="text-center ${scoreColorClass}">${brand.overallScore.toFixed(1)}</td>
            <td class="text-center">${brand.totalComplaints}</td>
            <td class="text-center">${ratingStars}</td>
            <td class="text-center">${brand.resolutionRate.toFixed(0)}%</td>
            <td class="text-center">${brand.responseSpeed.toFixed(1)} gün</td>
            <td class="text-end pe-3">
                <a href="/marka/${encodeURIComponent(brand.name)}" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Sayfalamayı güncelle
    updatePagination(totalPages, page);
    
    // Marka adına tıklama olayı
    tableBody.querySelectorAll('.brand-row').forEach(row => {
        row.addEventListener('click', function(e) {
            // Sadece detay butonuna tıklanmadıysa
            if (!e.target.closest('.btn')) {
                const brandName = this.getAttribute('data-brand');
                if (brandName) {
                    window.location.href = `/marka/${encodeURIComponent(brandName)}`;
                }
            }
        });
        
        // Fare üzerine gelince imleç değiştir
        row.style.cursor = 'pointer';
    });
}

// Kategori grafiklerini oluştur
function createCategoryCharts(complaints, brandMetrics) {
    // Kategori bazlı istatistikleri topla
    const categoryStats = {};
    
    complaints.forEach(complaint => {
        const category = complaint.category || 'Diğer';
        
        if (!categoryStats[category]) {
            categoryStats[category] = {
                total: 0,
                resolved: 0,
                totalRating: 0,
                ratedCount: 0
            };
        }
        
        categoryStats[category].total++;
        
        if (complaint.status?.toLowerCase() === 'çözüldü') {
            categoryStats[category].resolved++;
        }
        
        // Ortalama puanı hesapla
        const ratings = complaint.ratings || {};
        let complaintAvg = 0;
        let ratingCount = 0;
        
        for (const key in ratings) {
            const rating = parseFloat(ratings[key]);
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
                complaintAvg += rating;
                ratingCount++;
            }
        }
        
        if (ratingCount > 0) {
            const avgRating = complaintAvg / ratingCount;
            categoryStats[category].totalRating += avgRating;
            categoryStats[category].ratedCount++;
        }
    });
    
    // Çözüm oranları grafiği
    const resolutionCtx = document.getElementById('categoryResolutionChart')?.getContext('2d');
    if (resolutionCtx && Object.keys(categoryStats).length > 0) {
        const categories = [];
        const resolutionRates = [];
        const colors = [];
        
        // En az 3 şikayeti olan kategorileri dahil et
        for (const category in categoryStats) {
            const stats = categoryStats[category];
            if (stats.total < 3) continue;
            
            const resolutionRate = (stats.resolved / stats.total) * 100;
            categories.push(category);
            resolutionRates.push(resolutionRate.toFixed(1));
            
            // Renk belirleme
            if (resolutionRate >= 70) {
                colors.push('rgba(45, 206, 137, 0.7)'); // Yeşil
            } else if (resolutionRate >= 40) {
                colors.push('rgba(251, 99, 64, 0.7)'); // Turuncu
            } else {
                colors.push('rgba(245, 54, 92, 0.7)'); // Kırmızı
            }
        }
        
        if (categoryResolutionChart) categoryResolutionChart.destroy();
        
        categoryResolutionChart = new Chart(resolutionCtx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Çözüm Oranı',
                    data: resolutionRates,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: document.body.classList.contains('dark-mode') ? '#344767' : '#e9ecef'
                        },
                        ticks: {
                            color: document.body.classList.contains('dark-mode') ? '#adb5bd' : '#6c757d',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: document.body.classList.contains('dark-mode') ? '#344767' : '#e9ecef'
                        },
                        ticks: {
                            color: document.body.classList.contains('dark-mode') ? '#adb5bd' : '#6c757d'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const category = context.label;
                                const stats = categoryStats[category];
                                return [
                                    `Çözüm Oranı: ${context.raw}%`,
                                    `Çözülen: ${stats.resolved} / ${stats.total}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Ortalama puanlar grafiği
    const ratingCtx = document.getElementById('categoryRatingChart')?.getContext('2d');
    if (ratingCtx && Object.keys(categoryStats).length > 0) {
        const categories = [];
        const avgRatings = [];
        const colors = [];
        
        // En az 3 puanlı şikayeti olan kategorileri dahil et
        for (const category in categoryStats) {
            const stats = categoryStats[category];
            if (stats.ratedCount < 3) continue;
            
            const avgRating = stats.totalRating / stats.ratedCount;
            categories.push(category);
            avgRatings.push(avgRating.toFixed(1));
            
            // Renk belirleme
            if (avgRating >= 4) {
                colors.push('rgba(45, 206, 137, 0.7)'); // Yeşil
            } else if (avgRating >= 3) {
                colors.push('rgba(251, 99, 64, 0.7)'); // Turuncu
            } else {
                colors.push('rgba(245, 54, 92, 0.7)'); // Kırmızı
            }
        }
        
        if (categoryRatingChart) categoryRatingChart.destroy();
        
        categoryRatingChart = new Chart(ratingCtx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Ortalama Puan',
                    data: avgRatings,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        grid: {
                            color: document.body.classList.contains('dark-mode') ? '#344767' : '#e9ecef'
                        },
                        ticks: {
                            color: document.body.classList.contains('dark-mode') ? '#adb5bd' : '#6c757d',
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            color: document.body.classList.contains('dark-mode') ? '#344767' : '#e9ecef'
                        },
                        ticks: {
                            color: document.body.classList.contains('dark-mode') ? '#adb5bd' : '#6c757d'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const category = context.label;
                                const stats = categoryStats[category];
                                return [
                                    `Ortalama Puan: ${context.raw}/5`,
                                    `Puanlanan Şikayet: ${stats.ratedCount}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
}

// Kategori liderlerini güncelle
function updateCategoryLeaders(category) {
    const tableBody = document.getElementById('categoryLeadersTable')?.querySelector('tbody');
    if (!tableBody) return;
    
    // Sadece seçilen kategoride şikayeti olan markaları filtrele
    const brandsInCategory = allBrandMetrics.filter(brand => 
        brand.categories[category] && brand.categories[category].total >= 3 // En az 3 şikayet
    );
    
    if (brandsInCategory.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i> Bu kategoride yeterli veri bulunamadı.
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Kategori skoruna göre sırala
    const sortedBrands = [...brandsInCategory].sort((a, b) => 
        (b.categories[category]?.score || 0) - (a.categories[category]?.score || 0)
    );
    
    // En iyi 5 markayı al
    const topBrands = sortedBrands.slice(0, 5);
    
    // Tabloyu doldur
    tableBody.innerHTML = '';
    
    topBrands.forEach((brand, index) => {
        const categoryStats = brand.categories[category];
        const row = document.createElement('tr');
        row.className = 'brand-row';
        row.setAttribute('data-brand', brand.name);
        
        // Kategori skoru rengi
        let scoreColorClass;
        if (categoryStats.score >= 80) {
            scoreColorClass = 'text-success fw-bold';
        } else if (categoryStats.score >= 60) {
            scoreColorClass = 'text-primary fw-bold';
        } else if (categoryStats.score >= 40) {
            scoreColorClass = 'text-warning fw-bold';
        } else {
            scoreColorClass = 'text-danger fw-bold';
        }
        
        // Puan yıldızları
        const ratingStars = categoryStats.avgRating > 0 ? 
            `<div class="d-flex align-items-center justify-content-center">
                <span class="me-1">${categoryStats.avgRating.toFixed(1)}</span>
                <i class="fas fa-star text-warning small"></i>
            </div>` : 
            '<span class="text-muted">-</span>';
        
        row.innerHTML = `
            <td><span class="badge bg-primary rounded-pill">${index + 1}</span></td>
            <td><strong>${sanitizeHTML(brand.name)}</strong></td>
            <td class="text-center ${scoreColorClass}">${categoryStats.score.toFixed(1)}</td>
            <td class="text-center">${categoryStats.total}</td>
            <td class="text-center">${categoryStats.resolutionRate.toFixed(0)}%</td>
            <td class="text-center">${ratingStars}</td>
            <td class="text-end">
                <a href="/marka/${encodeURIComponent(brand.name)}" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Marka adına tıklama olayı
    tableBody.querySelectorAll('.brand-row').forEach(row => {
        row.addEventListener('click', function(e) {
            // Sadece detay butonuna tıklanmadıysa
            if (!e.target.closest('.btn')) {
                const brandName = this.getAttribute('data-brand');
                if (brandName) {
                    window.location.href = `/marka/${encodeURIComponent(brandName)}`;
                }
            }
        });
        
        // Fare üzerine gelince imleç değiştir
        row.style.cursor = 'pointer';
    });
}

// Sayfalama bileşenini güncelle
function updatePagination(totalPages, currentPage) {
    const paginationEl = document.getElementById('rankingPagination');
    if (!paginationEl) return;
    
    paginationEl.innerHTML = '';
    
    if (totalPages <= 1) {
        paginationEl.style.display = 'none';
        return;
    }
    
    paginationEl.style.display = 'flex';
    
    // Önceki sayfa butonu
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Önceki">
            <span aria-hidden="true">&laquo;</span>
        </a>
    `;
    paginationEl.appendChild(prevLi);
    
    // Sayfa numaraları
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Başlangıç sayfasını ayarla
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // İlk sayfa ve "..." (gerekirse)
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = '<a class="page-link" href="#">1</a>';
        paginationEl.appendChild(firstLi);
        
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = '<span class="page-link">...</span>';
            paginationEl.appendChild(ellipsisLi);
        }
    }
    
    // Görünür sayfalar
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        paginationEl.appendChild(pageLi);
    }
    
    // Son sayfa ve "..." (gerekirse)
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = '<span class="page-link">...</span>';
            paginationEl.appendChild(ellipsisLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="#">${totalPages}</a>`;
        paginationEl.appendChild(lastLi);
    }
    
    // Sonraki sayfa butonu
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Sonraki">
            <span aria-hidden="true">&raquo;</span>
        </a>
    `;
    paginationEl.appendChild(nextLi);
    
    // Sayfalama butonlarına tıklama olayları ekle
    paginationEl.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            let newPage = currentPage;
            
            if (this.textContent === '«') {
                newPage = currentPage - 1;
            } else if (this.textContent === '»') {
                newPage = currentPage + 1;
            } else if (!isNaN(parseInt(this.textContent))) {
                newPage = parseInt(this.textContent);
            }
            
            if (newPage !== currentPage && newPage >= 1 && newPage <= totalPages) {
                updateBrandRankingsTable(filteredBrands, newPage);
                window.scrollTo({
                    top: document.querySelector('.brand-rankings').offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Filtre olaylarını başlat
function initFilterEvents() {
    const categoryFilterEl = document.getElementById('categoryFilter');
    const complaintCountFilterEl = document.getElementById('complaintCountFilter');
    const sortMethodEl = document.getElementById('sortMethod');
    const searchInputEl = document.getElementById('brandSearchInput');
    const searchButtonEl = document.getElementById('brandSearchButton');
    
    // Filtre değişikliklerini dinle
    [categoryFilterEl, complaintCountFilterEl, sortMethodEl].forEach(filterEl => {
        if (filterEl) {
            filterEl.addEventListener('change', applyFilters);
        }
    });
    
    // Arama butonuna tıklama
    if (searchButtonEl) {
        searchButtonEl.addEventListener('click', applyFilters);
    }
    
    // Enter tuşu ile arama
    if (searchInputEl) {
        searchInputEl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyFilters();
            }
        });
    }
}

// Kategori liderleri seçici olayını başlat
function initCategoryLeaderSelector() {
    const selector = document.getElementById('categoryLeadersSelector');
    if (selector) {
        selector.addEventListener('change', function() {
            updateCategoryLeaders(this.value);
        });
    }
}

// Filtreleri uygula
function applyFilters() {
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    const complaintCountFilter = parseInt(document.getElementById('complaintCountFilter')?.value || '0');
    const sortMethod = document.getElementById('sortMethod')?.value || 'overallScore';
    const searchTerm = document.getElementById('brandSearchInput')?.value?.toLowerCase().trim() || '';
    
    let filtered = [...allBrandMetrics];
    
    // Kategori filtresi
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(brand => 
            brand.categories[categoryFilter] && brand.categories[categoryFilter].total > 0
        );
    }
    
    // Şikayet sayısı filtresi
    if (complaintCountFilter > 0) {
        filtered = filtered.filter(brand => brand.totalComplaints >= complaintCountFilter);
    }
    
    // Arama filtresi
    if (searchTerm) {
        filtered = filtered.filter(brand => 
            brand.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Sıralama
    switch (sortMethod) {
        case 'resolveRate':
            filtered.sort((a, b) => b.resolutionRate - a.resolutionRate);
            break;
        case 'responseTime':
            // Yanıt süresi - küçük olan önce (daha hızlı)
            filtered.sort((a, b) => a.responseSpeed - b.responseSpeed);
            break;
        case 'avgRating':
            filtered.sort((a, b) => b.avgRating - a.avgRating);
            break;
        case 'complaintCount':
            filtered.sort((a, b) => b.totalComplaints - a.totalComplaints);
            break;
        case 'overallScore':
        default:
            filtered.sort((a, b) => b.overallScore - a.overallScore);
            break;
    }
    
    // Filtrelenmiş markaları sakla ve göster
    filteredBrands = filtered;
    updateBrandRankingsTable(filtered, 1);
    
    // Filtreleme sonucunu göster
    if (filtered.length === 0) {
        showToast('Filtreye uygun marka bulunamadı.', 'Bilgi', 'info');
    } else if (filtered.length === 1) {
        showToast('Filtreye uyan 1 marka bulundu.', 'Bilgi', 'info');
    } else {
        showToast(`Filtreye uyan ${filtered.length} marka bulundu.`, 'Bilgi', 'info');
    }
}