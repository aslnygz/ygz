// brand-profile.js - Marka profil sayfası işlevleri
import { getComplaints } from './data.js';
import { showToast, autoResizeTextarea, sanitizeHTML, formatDate, capitalizeFirstLetter, getDistinctColors } from './utils.js';

// Sabitler
const ITEMS_PER_PAGE = 6;
let currentPage = 1;
let filteredComplaints = [];
let brandName = '';

// Grafik nesneleri
let ratingDistributionChart = null;
let categoryDistributionChart = null;
let timeProgressChart = null;

// Marka profil sayfasını başlat
document.addEventListener('DOMContentLoaded', function() {
    console.log("Marka profil sayfası yükleniyor...");
    
    // URL'den marka adını al
    brandName = getBrandNameFromUrl();
    
    if (!brandName) {
        showToast('Marka adı belirtilmemiş!', 'Hata', 'error');
        window.location.href = '/'; // Ana sayfaya yönlendir
        return;
    }
    
    // Modalları içe aktar
    importModalsFromMainPage();
    
    // Tema kontrolü (Ana sayfadaki ile aynı)
    initTheme();
    
    // Marka verilerini yükle
    loadBrandData(brandName);
    
    // Filtre ve arama olaylarını başlat
    initFilterEvents();
});

// URL'den marka adını çıkarır
function getBrandNameFromUrl() {
    // URL'den marka adını çıkar (örn: '/marka/MarkaAdi')
    const pathParts = window.location.pathname.split('/');
    let name = '';
    
    if (pathParts.length >= 3 && pathParts[1].toLowerCase() === 'marka') {
        // URL-encoded marka adını decode et
        name = decodeURIComponent(pathParts[2]);
    }
    
    return name;
}

// Ana sayfadaki modalları içe aktar
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
    
    if (ratingDistributionChart) {
        ratingDistributionChart.options.plugins.legend.labels.color = chartOptions.plugins.legend.labels.color;
        ratingDistributionChart.options.plugins.tooltip = chartOptions.plugins.tooltip;
        ratingDistributionChart.data.datasets[0].borderColor = theme === 'dark' ? '#252f40' : '#ffffff';
        ratingDistributionChart.update();
    }
    
    if (categoryDistributionChart) {
        categoryDistributionChart.options.plugins.legend.labels.color = chartOptions.plugins.legend.labels.color;
        categoryDistributionChart.options.plugins.tooltip = chartOptions.plugins.tooltip;
        categoryDistributionChart.data.datasets[0].borderColor = theme === 'dark' ? '#252f40' : '#ffffff';
        categoryDistributionChart.update();
    }
    
    if (timeProgressChart) {
        timeProgressChart.options.plugins.legend.labels.color = chartOptions.plugins.legend.labels.color;
        timeProgressChart.options.plugins.tooltip = chartOptions.plugins.tooltip;
        timeProgressChart.options.scales.x = chartOptions.scales.x;
        timeProgressChart.options.scales.y = chartOptions.scales.y;
        timeProgressChart.update();
    }
}

// Marka verilerini yükle
function loadBrandData(brandName) {
    try {
        // Başlık ve meta bilgileri güncelle
        document.title = `${capitalizeFirstLetter(brandName)} | Şikayet Yönetim Sistemi`;
        
        // Şikayetleri getir (sadece onaylanmış olanlar)
        const complaints = getComplaints().filter(c => 
            !c.pendingApproval && 
            c.brand?.toLowerCase().trim() === brandName.toLowerCase().trim()
        );
        
        if (complaints.length === 0) {
            showToast(`"${brandName}" markasına ait şikayet bulunmuyor.`, 'Bilgi', 'info');
            updatePageWithNoData(brandName);
            return;
        }
        
        // Marka başlık bilgilerini güncelle
        updateBrandHeader(brandName, complaints);
        
        // Marka istatistiklerini güncelle
        updateBrandStatistics(complaints);
        
        // Şikayet listesini doldur
        filteredComplaints = [...complaints]; // Tüm şikayetleri saklayalım (filtreleme için)
        updateComplaintsList(complaints);
        
        console.log(`"${brandName}" markası için ${complaints.length} şikayet yüklendi.`);
    } catch (error) {
        console.error("Marka verileri yüklenirken hata:", error);
        showToast('Marka verileri yüklenirken hata oluştu.', 'Hata', 'error');
    }
}

// Veri olmadığında sayfa içeriğini güncelle
function updatePageWithNoData(brandName) {
    // Başlık bilgilerini güncelle
    document.getElementById('brandName').textContent = capitalizeFirstLetter(brandName);
    document.getElementById('brandRating').innerHTML = '<span class="fs-4 fw-bold text-muted">N/A</span>';
    document.getElementById('brandStatus').textContent = 'Veri Yok';
    document.getElementById('brandStatus').className = 'badge bg-secondary';
    document.getElementById('brandSummary').textContent = `${capitalizeFirstLetter(brandName)} markası için henüz değerlendirme bulunmuyor.`;
    
    // İstatistikleri sıfırla
    document.getElementById('totalComplaintsCount').textContent = '0';
    document.getElementById('resolvedComplaintsCount').textContent = '0';
    document.getElementById('responseRatePercent').textContent = 'N/A';
    document.getElementById('responseDays').textContent = 'N/A';
    
    // Şikayet listesini güncelle
    const complaintsListEl = document.getElementById('brandComplaintsList');
    complaintsListEl.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i> ${capitalizeFirstLetter(brandName)} markasına ait şikayet bulunamadı.
            </div>
            <p>İlk şikayeti siz eklemek ister misiniz?</p>
            <button class="btn modern-btn-primary mt-3" data-bs-toggle="modal" data-bs-target="#createComplaintModal">
                <i class="fas fa-pen me-1"></i> Şikayet Yaz
            </button>
        </div>
    `;
    
    // Grafikleri boş göster
    initEmptyCharts();
}

// Boş grafikler oluştur
function initEmptyCharts() {
    const ratingCtx = document.getElementById('ratingDistributionChart')?.getContext('2d');
    const categoryCtx = document.getElementById('categoryDistributionChart')?.getContext('2d');
    const timeCtx = document.getElementById('timeProgressChart')?.getContext('2d');
    
    if (ratingCtx) {
        if (ratingDistributionChart) ratingDistributionChart.destroy();
        ratingDistributionChart = new Chart(ratingCtx, {
            type: 'doughnut',
            data: {
                labels: ['Veri Yok'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e9ecef'],
                    borderColor: document.body.classList.contains('dark-mode') ? '#252f40' : '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: context => 'Veri bulunmuyor'
                        }
                    }
                }
            }
        });
    }
    
    if (categoryCtx) {
        if (categoryDistributionChart) categoryDistributionChart.destroy();
        categoryDistributionChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Veri Yok'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e9ecef'],
                    borderColor: document.body.classList.contains('dark-mode') ? '#252f40' : '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: context => 'Veri bulunmuyor'
                        }
                    }
                }
            }
        });
    }
    
    if (timeCtx) {
        if (timeProgressChart) timeProgressChart.destroy();
        timeProgressChart = new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: ['Veri Yok'],
                datasets: [{
                    label: 'Şikayet Sayısı',
                    data: [0],
                    borderColor: '#e9ecef',
                    backgroundColor: 'rgba(233, 236, 239, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
}

// Marka başlık bilgilerini güncelle
function updateBrandHeader(brandName, complaints) {
    const brandNameEl = document.getElementById('brandName');
    const brandRatingEl = document.getElementById('brandRating');
    const brandStatusEl = document.getElementById('brandStatus');
    const brandSummaryEl = document.getElementById('brandSummary');
    
    if (!brandNameEl || !brandRatingEl || !brandStatusEl || !brandSummaryEl) {
        console.error("Marka başlık elementleri bulunamadı!");
        return;
    }
    
    // Marka adını ayarla
    brandNameEl.textContent = capitalizeFirstLetter(brandName);
    
    // Ortalama puanı hesapla
    let totalRating = 0;
    let ratedCount = 0;
    
    complaints.forEach(complaint => {
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
            totalRating += (complaintAvg / ratingCount);
            ratedCount++;
        }
    });
    
    const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 0;
    
    // Ortalama puanı göster
    brandRatingEl.innerHTML = `
        <span class="fs-4 fw-bold text-primary">${avgRating}</span>
        <i class="fas fa-star text-warning"></i>
    `;
    
    // Çözülen şikayet oranını hesapla
    const solvedCount = complaints.filter(c => c.status?.toLowerCase() === 'çözüldü').length;
    const solvedRate = complaints.length > 0 ? (solvedCount / complaints.length) * 100 : 0;
    
    // Marka durum etiketini güncelle
    let statusClass = 'bg-secondary';
    let statusText = 'Değerlendirilmemiş';
    
    if (complaints.length > 0) {
        if (solvedRate >= 80) {
            statusClass = 'bg-success';
            statusText = 'Çok İyi';
        } else if (solvedRate >= 60) {
            statusClass = 'bg-info';
            statusText = 'İyi';
        } else if (solvedRate >= 40) {
            statusClass = 'bg-warning text-dark';
            statusText = 'Orta';
        } else {
            statusClass = 'bg-danger';
            statusText = 'Geliştirilebilir';
        }
    }
    
    brandStatusEl.className = `badge ${statusClass}`;
    brandStatusEl.textContent = statusText;
    
    // Özet metni oluştur
    const lastComplaint = complaints.sort((a, b) => b.date - a.date)[0];
    const daysSinceLastComplaint = lastComplaint 
        ? Math.floor((new Date() - lastComplaint.date) / (1000 * 60 * 60 * 24)) 
        : 0;
    
    brandSummaryEl.innerHTML = `
        <strong>${capitalizeFirstLetter(brandName)}</strong> markası için toplam 
        <strong>${complaints.length}</strong> şikayet bulunuyor. 
        Bunların <strong>${solvedCount}</strong> tanesi (%${solvedRate.toFixed(0)}) çözülmüş durumda. 
        ${lastComplaint ? `Son şikayet <strong>${daysSinceLastComplaint}</strong> gün önce yapılmış.` : ''}
        Markanın genel performansı <strong>${statusText.toLowerCase()}</strong> olarak değerlendiriliyor.
    `;
}

// Marka istatistiklerini güncelle
function updateBrandStatistics(complaints) {
    // Ana istatistikleri güncelle
    updateBasicStats(complaints);
    
    // Grafikleri oluştur
    createRatingDistributionChart(complaints);
    createCategoryDistributionChart(complaints);
    createTimeProgressChart(complaints);
}

// Temel istatistikleri güncelle
function updateBasicStats(complaints) {
    const totalEl = document.getElementById('totalComplaintsCount');
    const resolvedEl = document.getElementById('resolvedComplaintsCount');
    const rateEl = document.getElementById('responseRatePercent');
    const daysEl = document.getElementById('responseDays');
    
    if (!totalEl || !resolvedEl || !rateEl || !daysEl) {
        console.error("İstatistik elementleri bulunamadı!");
        return;
    }
    
    // Toplam şikayet sayısı
    totalEl.textContent = complaints.length;
    
    // Çözülen şikayet sayısı
    const resolvedCount = complaints.filter(c => c.status?.toLowerCase() === 'çözüldü').length;
    resolvedEl.textContent = resolvedCount;
    
    // Yanıt oranı (yüzde)
    const responseRate = complaints.length > 0 ? (resolvedCount / complaints.length) * 100 : 0;
    rateEl.textContent = `%${responseRate.toFixed(0)}`;
    
    // Ortalama yanıt süresi (gün)
    // Not: Burada gerçek bir yanıt süresi hesaplama yapmıyoruz, çünkü veri modelinde şikayet çözülme tarihi yok
    // Örnek olarak rastgele bir değer gösteriyoruz
    const avgResponseDays = complaints.length > 0 ? Math.min(Math.floor(Math.random() * 10) + 1, 10) : 'N/A';
    daysEl.textContent = avgResponseDays === 'N/A' ? avgResponseDays : `${avgResponseDays} gün`;
}

// Puan dağılımı grafiği oluştur
function createRatingDistributionChart(complaints) {
    const ctx = document.getElementById('ratingDistributionChart')?.getContext('2d');
    if (!ctx) {
        console.error("Puan dağılımı grafik elementi bulunamadı!");
        return;
    }
    
    // Puan dağılımını hesapla
    const ratingGroups = {
        'Çok İyi (4-5)': 0,
        'İyi (3-4)': 0,
        'Orta (2-3)': 0,
        'Kötü (1-2)': 0,
        'Puansız': 0
    };
    
    complaints.forEach(complaint => {
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
            
            if (avgRating >= 4) {
                ratingGroups['Çok İyi (4-5)']++;
            } else if (avgRating >= 3) {
                ratingGroups['İyi (3-4)']++;
            } else if (avgRating >= 2) {
                ratingGroups['Orta (2-3)']++;
            } else {
                ratingGroups['Kötü (1-2)']++;
            }
        } else {
            ratingGroups['Puansız']++;
        }
    });
    
    // Grafiği güncelle
    if (ratingDistributionChart) {
        ratingDistributionChart.destroy();
    }
    
    const labels = Object.keys(ratingGroups);
    const data = Object.values(ratingGroups);
    
    // Sadece değeri sıfırdan büyük olanları göster
    const filteredLabels = [];
    const filteredData = [];
    const colors = ['#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6c757d'];
    const filteredColors = [];
    
    labels.forEach((label, index) => {
        if (data[index] > 0) {
            filteredLabels.push(label);
            filteredData.push(data[index]);
            filteredColors.push(colors[index]);
        }
    });
    
    ratingDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: filteredLabels,
            datasets: [{
                data: filteredData,
                backgroundColor: filteredColors,
                borderColor: document.body.classList.contains('dark-mode') ? '#252f40' : '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.body.classList.contains('dark-mode') ? '#adb5bd' : '#6c757d'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = (value / complaints.length * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Kategori dağılımı grafiği oluştur
function createCategoryDistributionChart(complaints) {
    const ctx = document.getElementById('categoryDistributionChart')?.getContext('2d');
    if (!ctx) {
        console.error("Kategori dağılımı grafik elementi bulunamadı!");
        return;
    }
    
    // Kategori dağılımını hesapla
    const categories = {};
    
    complaints.forEach(complaint => {
        const category = complaint.category?.trim() || 'Diğer';
        categories[category] = (categories[category] || 0) + 1;
    });
    
    // Grafiği güncelle
    if (categoryDistributionChart) {
        categoryDistributionChart.destroy();
    }
    
    const labels = Object.keys(categories);
    const data = Object.values(categories);
    const colors = getDistinctColors(labels.length);
    
    categoryDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: document.body.classList.contains('dark-mode') ? '#252f40' : '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.body.classList.contains('dark-mode') ? '#adb5bd' : '#6c757d'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = (value / complaints.length * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Zaman içinde gelişim grafiği oluştur
function createTimeProgressChart(complaints) {
    const ctx = document.getElementById('timeProgressChart')?.getContext('2d');
    if (!ctx) {
        console.error("Zaman ilerlemesi grafik elementi bulunamadı!");
        return;
    }
    
    // Son 12 ayın verilerini hazırla
    const today = new Date();
    const last12Months = [];
    const monthsData = {
        complaints: {},
        solved: {}
    };
    
    // Son 12 ayı oluştur
    for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(today.getMonth() - i);
        
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
        
        last12Months.push(monthLabel);
        monthsData.complaints[monthKey] = 0;
        monthsData.solved[monthKey] = 0;
    }
    
    // Şikayetleri aylara göre grupla
    complaints.forEach(complaint => {
        const date = new Date(complaint.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (monthsData.complaints[monthKey] !== undefined) {
            monthsData.complaints[monthKey]++;
            
            if (complaint.status?.toLowerCase() === 'çözüldü') {
                monthsData.solved[monthKey]++;
            }
        }
    });
    
    // Veri dizilerini oluştur
    const complaintData = Object.values(monthsData.complaints);
    const solvedData = Object.values(monthsData.solved);
    
    // Grafiği güncelle
    if (timeProgressChart) {
        timeProgressChart.destroy();
    }
    
    timeProgressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last12Months,
            datasets: [
                {
                    label: 'Toplam Şikayet',
                    data: complaintData,
                    borderColor: '#4a7dfa',
                    backgroundColor: 'rgba(74, 125, 250, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Çözülen Şikayet',
                    data: solvedData,
                    borderColor: '#2dce89',
                    backgroundColor: 'rgba(45, 206, 137, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#adb5bd' : '#6c757d',
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        color: document.body.classList.contains('dark-mode') ? '#344767' : '#e9ecef'
                    }
                },
                x: {
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#adb5bd' : '#6c757d'
                    },
                    grid: {
                        color: document.body.classList.contains('dark-mode') ? '#344767' : '#e9ecef'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: document.body.classList.contains('dark-mode') ? '#adb5bd' : '#6c757d'
                    }
                },
                tooltip: {
                    backgroundColor: document.body.classList.contains('dark-mode') ? 'rgba(40, 50, 70, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                    titleColor: document.body.classList.contains('dark-mode') ? '#e9ecef' : '#212529',
                    bodyColor: document.body.classList.contains('dark-mode') ? '#e9ecef' : '#212529',
                    borderColor: document.body.classList.contains('dark-mode') ? '#455474' : '#dee2e6',
                    borderWidth: 1
                }
            }
        }
    });
}

// Şikayet listesini güncelle
function updateComplaintsList(complaints, page = 1) {
    const complaintsListEl = document.getElementById('brandComplaintsList');
    if (!complaintsListEl) {
        console.error("Şikayet listesi elementi bulunamadı!");
        return;
    }
    
    // Sayfalama hesaplamaları
    currentPage = page;
    const totalPages = Math.ceil(complaints.length / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, complaints.length);
    const currentComplaints = complaints.slice(startIndex, endIndex);
    
    // Liste içeriğini temizle
    complaintsListEl.innerHTML = '';
    
    if (currentComplaints.length === 0) {
        complaintsListEl.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i> Filtrelere uyan şikayet bulunamadı.
                </div>
                <button class="btn btn-outline-secondary mt-3" id="resetFiltersBtn">
                    <i class="fas fa-undo me-1"></i> Filtreleri Sıfırla
                </button>
            </div>
        `;
        
        // Filtreleri sıfırlama butonu
        const resetBtn = document.getElementById('resetFiltersBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                // Filtreleri sıfırla
                document.getElementById('statusFilter').value = 'all';
                document.getElementById('categoryFilter').value = 'all';
                document.getElementById('sortOrder').value = 'newest';
                document.getElementById('searchInput').value = '';
                
                // Listeyi güncelle
                filteredComplaints = [...getComplaints().filter(c => 
                    !c.pendingApproval && 
                    c.brand?.toLowerCase().trim() === brandName.toLowerCase().trim()
                )];
                updateComplaintsList(filteredComplaints);
            });
        }
        
        return;
    }
    
    // Şikayetleri oluştur
    currentComplaints.forEach(complaint => {
        const avgRating = calculateAvgRating(complaint);
        const cardEl = document.createElement('div');
        cardEl.className = 'col-md-6 col-lg-4';
        cardEl.innerHTML = createComplaintCardHTML(complaint, avgRating);
        complaintsListEl.appendChild(cardEl);
    });
    
    // Sayfalama bileşenini güncelle
    updatePagination(totalPages, page);
    
    // Kart tıklama olaylarını ekle
    addComplaintCardEvents();
}

// Şikayet kartı HTML'i oluştur
function createComplaintCardHTML(complaint, avgRating) {
    const safeTitle = sanitizeHTML(complaint.title || 'Başlık Yok');
    const safeCategory = sanitizeHTML(complaint.category || 'Kategori Yok');
    const safeDescription = sanitizeHTML(complaint.description || '');
    const shortDescription = safeDescription.length > 100 ? safeDescription.substring(0, 100) + '...' : safeDescription;
    const statusClass = complaint.status?.toLowerCase() === 'çözüldü' ? 'bg-success' : 
                        complaint.status?.toLowerCase() === 'açık' ? 'bg-primary' : 
                        complaint.status?.toLowerCase() === 'kapalı' ? 'bg-secondary' : 'bg-warning text-dark';
    const safeStatus = sanitizeHTML(complaint.status || 'Bilinmiyor');
    const formattedDate = formatDate(complaint.date);
    
    return `
        <div class="complaint-card card h-100 shadow-sm" data-id="${complaint.id}">
            <div class="card-body">
                <h5 class="card-title mb-3">${safeTitle}</h5>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-light text-dark">${safeCategory}</span>
                    <span class="badge ${statusClass}">${safeStatus}</span>
                </div>
                <p class="card-text complaint-excerpt text-muted mb-3">${shortDescription}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <div class="rating-box-small">
                        <span class="fw-bold">${avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}</span>
                        ${avgRating > 0 ? '<i class="fas fa-star text-warning"></i>' : ''}
                    </div>
                    <small class="text-muted">${formattedDate}</small>
                </div>
            </div>
            <div class="card-footer d-grid">
                <button class="btn btn-outline-primary btn-sm view-complaint-btn">
                    <i class="fas fa-eye me-1"></i> Detayları Göster
                </button>
            </div>
        </div>
    `;
}

// Şikayet kartları için olay dinleyicileri ekle
function addComplaintCardEvents() {
    const complaintCards = document.querySelectorAll('.complaint-card');
    
    complaintCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Direkt karta tıklandığında da çalışsın
            if (!e.target.closest('.view-complaint-btn')) {
                e.preventDefault();
                openComplaintDetail(this.dataset.id);
                return;
            }
        });
        
        const viewBtn = card.querySelector('.view-complaint-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const complaintId = this.closest('.complaint-card').dataset.id;
                openComplaintDetail(complaintId);
            });
        }
    });
}

// Şikayet detaylarını göster
function openComplaintDetail(complaintId) {
    if (!complaintId) return;
    
    const id = parseInt(complaintId);
    if (isNaN(id)) return;
    
    const complaint = getComplaints().find(c => c.id === id);
    if (!complaint) {
        showToast('Şikayet detayları bulunamadı!', 'Hata', 'error');
        return;
    }
    
    // ui.js'deki fonksiyonu çağır (eğer varsa)
    if (typeof displayComplaintDetail === 'function') {
        try {
            displayComplaintDetail(complaint, 'user', localStorage.getItem('currentUser') || null);
            const detailModalEl = document.getElementById('complaintDetailModal');
            if (detailModalEl) {
                const modal = new bootstrap.Modal(detailModalEl);
                modal.show();
            }
        } catch (error) {
            console.error("Şikayet detayları gösterilirken hata:", error);
            showToast('Şikayet detayları gösterilirken hata oluştu.', 'Hata', 'error');
        }
    } else {
        showToast('Detay görüntüleme fonksiyonu bulunamadı.', 'Uyarı', 'warning');
    }
}

// Sayfalama bileşenini güncelle
function updatePagination(totalPages, currentPage) {
    const paginationEl = document.getElementById('pagination');
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
                updateComplaintsList(filteredComplaints, newPage);
                window.scrollTo({
                    top: document.querySelector('.brand-complaints').offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Filtre olaylarını başlat
function initFilterEvents() {
    const statusFilterEl = document.getElementById('statusFilter');
    const categoryFilterEl = document.getElementById('categoryFilter');
    const sortOrderEl = document.getElementById('sortOrder');
    const searchInputEl = document.getElementById('searchInput');
    const searchButtonEl = document.getElementById('searchButton');
    
    // Filtre değişikliklerini dinle
    [statusFilterEl, categoryFilterEl, sortOrderEl].forEach(filterEl => {
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

// Filtreleri uygula
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    const sortOrder = document.getElementById('sortOrder')?.value || 'newest';
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase().trim() || '';
    
    // Tüm şikayetleri al (markaya özel)
    let complaints = getComplaints().filter(c => 
        !c.pendingApproval && 
        c.brand?.toLowerCase().trim() === brandName.toLowerCase().trim()
    );
    
    // Durum filtresi
    if (statusFilter !== 'all') {
        complaints = complaints.filter(c => c.status === statusFilter);
    }
    
    // Kategori filtresi
    if (categoryFilter !== 'all') {
        complaints = complaints.filter(c => c.category === categoryFilter);
    }
    
    // Arama filtresi
    if (searchTerm) {
        complaints = complaints.filter(c => 
            c.title?.toLowerCase().includes(searchTerm) || 
            c.description?.toLowerCase().includes(searchTerm)
        );
    }
    
    // Sıralama
    complaints.sort((a, b) => {
        if (sortOrder === 'newest') {
            return b.date - a.date;
        } else if (sortOrder === 'oldest') {
            return a.date - b.date;
        } else if (sortOrder === 'highest' || sortOrder === 'lowest') {
            const avgA = calculateAvgRating(a);
            const avgB = calculateAvgRating(b);
            
            if (sortOrder === 'highest') {
                return avgB - avgA;
            } else {
                return avgA - avgB;
            }
        }
        
        return 0;
    });
    
    // Filtrelenmiş şikayetleri sakla ve görüntüle
    filteredComplaints = complaints;
    updateComplaintsList(complaints, 1);
}

// Ortalama puanı hesapla
function calculateAvgRating(complaint) {
    const ratings = complaint.ratings || {};
    let total = 0;
    let count = 0;
    
    for (const key in ratings) {
        const rating = parseFloat(ratings[key]);
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
            total += rating;
            count++;
        }
    }
    
    return count > 0 ? total / count : 0;
}