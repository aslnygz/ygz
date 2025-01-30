        const complaints = {};
        const adminPassword = "123456";
        const currentUserId = 'currentUserId'; // Example user ID
        const userRatings = {}; // To track user ratings

        // Modal Açma ve Kapatma İşlemleri
        document.getElementById('openComplaintModal').addEventListener('click', () => {
            const complaintModal = new bootstrap.Modal(document.getElementById('complaintModal'));
            complaintModal.show();
        });

        document.getElementById('openAdminPanel').addEventListener('click', () => {
            const password = prompt("Admin şifresini giriniz:");
            if (password !== adminPassword) {
                showToast("Şifre yanlış!", "error");
                return;
            }
            const adminPanelModal = new bootstrap.Modal(document.getElementById('adminPanelModal'));
            adminPanelModal.show();
            updateAdminTable();
        });

        document.getElementById('openFilterModal').addEventListener('click', () => {
            const filterModal = new bootstrap.Modal(document.getElementById('filterModal'));
            filterModal.show();
        });

        // Toast Bildirimi Gösterme
        function showToast(message, type = "success") {
            const toast = new bootstrap.Toast(document.getElementById('liveToast'));

            const toastBody = toast._element.querySelector('.toast-body');

            if (type === "error") {
                toast._element.classList.replace("bg-success", "bg-danger");
            } else {
                toast._element.classList.replace("bg-danger", "bg-success");
            }

            toastBody.textContent = message;
            toast.show();
        }

        // Şikayet Listesi Güncelleme
        function updateComplaintList() {
            const complaintList = document.getElementById('complaintList');
            complaintList.innerHTML = Object.entries(complaints).map(([id, complaint]) => `
                <li class="list-group-item fade-in bg-white p-4 rounded shadow">
                    <div>
                        <strong class="text-xl">${complaint.title}</strong> - <em class="text-gray-600">${complaint.status}</em> - <span class="badge bg-secondary">${complaint.category}</span>
                        <small class="text-gray-500 d-block">Şikayet Tarihi: ${complaint.date}</small>
                        ${complaint.imageFile ? `<img src="${complaint.imageFile}" alt="Şikayet Görseli" class="img-fluid rounded mt-2">` : ''}
                        <p class="mt-2">${complaint.description}</p>
                        ${complaint.solvedDate ? `<small class="text-gray-500 d-block">Çözüldüğü Tarih: ${complaint.solvedDate}</small>` : ''}
                        <div class="star-rating flex mt-2" data-id="${id}">
                            ${[...Array(5)].map((_, i) => `<span class="star ${i < complaint.rating ? 'filled' : 'unfilled'}" data-value="${i + 1}">&#9733;</span>`).join('')}
                        </div>
                        <small class="text-gray-500 d-block mt-1">Puan: ${complaint.rating}/5</small>
                        <button class="btn-comment btn mt-2 text-blue-500" data-id="${id}"><i class="fas fa-comments"></i> Yorumlar <span class="comment-count">(${complaint.comments.length})</span></button>
                        <div class="comments-section mt-3" id="comments-${id}" style="display: none;">
                            <div class="comment-box mt-2">
                                <textarea class="form-control" rows="2" placeholder="Yorumunuzu yazın..."></textarea>
                                <button class="btn btn-primary btn-sm add-comment-user" data-id="${id}">Ekle</button>
                            </div>
                            <div class="comment-list mt-3"></div>
                        </div>
                    </div>
                </li>
            `).join('');
            document.querySelectorAll('.star-rating .star').forEach(star => {
                star.addEventListener('click', (e) => {
                    const id = e.target.closest('.star-rating').dataset.id;
                    const rating = e.target.dataset.value;
                    if (!userRatings[id]) {
                        userRatings[id] = {};
                    }
                    if (!userRatings[id][currentUserId]) {
                        complaints[id].rating = parseInt(rating);
                        userRatings[id][currentUserId] = true;
                        updateComplaintList();
                    } else {
                        showToast("Zaten puan verdiniz.", "error");
                    }
                });
            });

            document.querySelectorAll('.btn-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id || e.target.parentElement.dataset.id;
                    const commentsSection = document.getElementById(`comments-${id}`);
                    commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
                    updateComments(id);
                });
            });

            document.querySelectorAll('.add-comment-user').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const textarea = e.target.previousElementSibling;
                    const commentText = textarea.value.trim();
                    if (!commentText) {
                        showToast("Yorum boş olamaz!", "error");
                        return;
                    }
                    const comment = { text: commentText, date: new Date().toLocaleString(), isAdmin: false, likes: 0, dislikes: 0, likedBy: [], dislikedBy: [] };
                    if (!complaints[id].comments) {
                        complaints[id].comments = [];
                    }
                    complaints[id].comments.push(comment);
                    updateComments(id);
                    textarea.value = '';
                    showToast("Yorum başarıyla eklendi.");
                });
            });
        }

        // Şikayet Önizlemesi
        document.getElementById('previewComplaint').addEventListener('click', () => {
            const title = document.getElementById('complaintTitle').value.trim();
            const description = document.getElementById('complaintDescription').value.trim();
            const category = document.getElementById('complaintCategory').value;
            const imageInput = document.getElementById('complaintImage');
            const imageFile = imageInput.files.length > 0 ? URL.createObjectURL(imageInput.files[0]) : null;

            // Önizleme için başlık ve açıklama kontrolü
            if (!title || !description) {
                showToast("Başlık ve açıklama boş olamaz!", "error");
                return;
            }

            document.getElementById('previewTitle').textContent = `Başlık: ${title}`;
            document.getElementById('previewDescription').textContent = `Açıklama: ${description}`;
            document.getElementById('previewCategory').textContent = `Kategori: ${category}`;
            if (imageFile) {
                document.getElementById('previewImage').src = imageFile;
                document.getElementById('previewImage').style.display = 'block';
            } else {
                document.getElementById('previewImage').style.display = 'none';
            }

            document.getElementById('complaintPreview').style.display = 'block';
        });
        
// Filtreleme ve Sıralama İşlemleri
        document.getElementById('applyFilters').addEventListener('click', filterComplaints);
        document.getElementById('searchInput').addEventListener('input', filterComplaints);
        document.getElementById('categoryFilter').addEventListener('change', filterComplaints);
        document.getElementById('statusFilter').addEventListener('change', filterComplaints);
        document.getElementById('sortFilter').addEventListener('change', filterComplaints);

        function filterComplaints() {
            const searchInput = document.getElementById('searchInput').value.toLowerCase();
            const categoryFilter = document.getElementById('categoryFilter').value;
            const statusFilter = document.getElementById('statusFilter').value;
            const sortFilter = document.getElementById('sortFilter').value;

            const filteredComplaints = Object.entries(complaints).filter(([id, complaint]) => {
                return (
                    (!categoryFilter || complaint.category === categoryFilter) &&
                    (!statusFilter || complaint.status === statusFilter) &&
                    (complaint.title.toLowerCase().includes(searchInput) || complaint.description.toLowerCase().includes(searchInput))
                );
            });

            if (sortFilter === 'newest') {
                filteredComplaints.sort((a, b) => new Date(b[1].date) - new Date(a[1].date));
            } else if (sortFilter === 'oldest') {
                filteredComplaints.sort((a, b) => new Date(a[1].date) - new Date(b[1].date));
            } else if (sortFilter === 'alphabetical') {
                filteredComplaints.sort((a, b) => a[1].title.localeCompare(b[1].title));
            } else if (sortFilter === 'rating') {
                filteredComplaints.sort((a, b) => b[1].rating - a[1].rating);
            }

            document.getElementById('complaintList').innerHTML = filteredComplaints.map(([id, complaint]) => `
                <li class="list-group-item fade-in bg-white p-4 rounded shadow">
                    <div>
                        <strong class="text-xl">${complaint.title}</strong> - <em class="text-gray-600">${complaint.status}</em> - <span class="badge bg-secondary">${complaint.category}</span>
                        <small class="text-gray-500 d-block">Şikayet Tarihi: ${complaint.date}</small>
                        ${complaint.imageFile ? `<img src="${complaint.imageFile}" alt="Şikayet Görseli" class="img-fluid rounded mt-2">` : ''}
                        <p class="mt-2">${complaint.description}</p>
                        ${complaint.solvedDate ? `<small class="text-gray-500 d-block">Çözüldüğü Tarih: ${complaint.solvedDate}</small>` : ''}
                        <div class="star-rating flex mt-2" data-id="${id}">
                            ${[...Array(5)].map((_, i) => `<span class="star ${i < complaint.rating ? 'filled' : 'unfilled'}" data-value="${i + 1}">&#9733;</span>`).join('')}
                        </div>
                        <small class="text-gray-500 d-block mt-1">Puan: ${complaint.rating}/5</small>
                        <button class="btn-comment btn mt-2 text-blue-500" data-id="${id}"><i class="fas fa-comments"></i> Yorumlar <span class="comment-count">(${complaint.comments.length})</span></button>
                        <div class="comments-section mt-3" id="comments-${id}" style="display: none;">
                            <div class="comment-box mt-2">
                                <textarea class="form-control" rows="2" placeholder="Yorumunuzu yazın..."></textarea>
                                <button class="btn btn-primary btn-sm add-comment-user" data-id="${id}">Ekle</button>
                            </div>
                            <div class="comment-list mt-3"></div>
                        </div>
                    </div>
                </li>
            `).join('');

            document.querySelectorAll('.star-rating .star').forEach(star => {
                star.addEventListener('click', (e) => {
                    const id = e.target.closest('.star-rating').dataset.id;
                    const rating = e.target.dataset.value;
                    if (!userRatings[id]) {
                        userRatings[id] = {};
                    }
                    if (!userRatings[id][currentUserId]) {
                        complaints[id].rating = parseInt(rating);
                        userRatings[id][currentUserId] = true;
                        updateComplaintList();
                    } else {
                        showToast("Zaten puan verdiniz.", "error");
                    }
                });
            });

            document.querySelectorAll('.btn-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id || e.target.parentElement.dataset.id;
                    const commentsSection = document.getElementById(`comments-${id}`);
                    commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
                    updateComments(id);
                });
            });

            document.querySelectorAll('.add-comment-user').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const textarea = e.target.previousElementSibling;
                    const commentText = textarea.value.trim();
                    if (!commentText) {
                        showToast("Yorum boş olamaz!", "error");
                        return;
                    }
                    const comment = { text: commentText, date: new Date().toLocaleString(), isAdmin: false, likes: 0, dislikes: 0, likedBy: [], dislikedBy: [] };
                    if (!complaints[id].comments) {
                        complaints[id].comments = [];
                    }
                    complaints[id].comments.push(comment);
                    updateComments(id);
                    textarea.value = '';
                    showToast("Yorum başarıyla eklendi.");

                    // Update comment count
                    const commentCountSpan = document.querySelector(`.btn-comment[data-id="${id}"] .comment-count`);
                    commentCountSpan.textContent = `(${complaints[id].comments.length})`;
                });
            });

            // Close the filter modal
            bootstrap.Modal.getInstance(document.getElementById('filterModal')).hide();
        }

        // Admin Panelini Güncelleme
        function updateAdminTable() {
            const adminTable = document.getElementById('adminComplaintTable');
            adminTable.innerHTML = Object.entries(complaints).map(([id, complaint]) => `
                <tr>
                    <td class="px-4 py-2">${complaint.title}</td>
                    <td class="px-4 py-2">${complaint.category}</td>
                    <td class="px-4 py-2">
                        <select class="form-select" data-id="${id}">
                            <option value="Açık" ${complaint.status === 'Açık' ? 'selected' : ''}>Açık</option>
                            <option value="Çözüldü" ${complaint.status === 'Çözüldü' ? 'selected' : ''}>Çözüldü</option>
                            <option value="Beklemede" ${complaint.status === 'Beklemede' ? 'selected' : ''}>Beklemede</option>
                        </select>
                    </td>
                    <td class="px-4 py-2">${complaint.date}</td>
                    <td class="px-4 py-2">
                        <button class="btn btn-sm btn-primary update-complaint" data-id="${id}">Güncelle</button>
                    </td>
                    <td class="px-4 py-2">
                        <button class="btn btn-sm btn-success add-comment" data-id="${id}">Yorum Ekle</button>
                    </td>
                </tr>
            `).join('');

            // Admin panelindeki durum güncelleme
            adminTable.querySelectorAll('.update-complaint').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const select = adminTable.querySelector(`select[data-id="${id}"]`);
                    const newStatus = select.value;

                    const complaint = complaints[id];
                    if (!complaint.statusHistory) {
                        complaint.statusHistory = [];
                    }
                    complaint.statusHistory.push({ status: newStatus, date: new Date().toLocaleString() });
                    complaint.status = newStatus;

                    if (newStatus === 'Çözüldü' && !complaint.solvedDate) {
                        complaint.solvedDate = new Date().toLocaleString();
                    }

                    // Bildirim Göster
                    showToast(`Şikayet (${id}) durumu "${newStatus}" olarak güncellendi.`);
                    
                    updateComplaintList();
                    updateSummary();
                });
            });

            // Admin panelinden yorum ekleme
            adminTable.querySelectorAll('.add-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const commentText = prompt("Admin yorumu giriniz:");
                    if (!commentText) {
                        showToast("Yorum boş olamaz!", "error");
                        return;
                    }

                    const comment = { text: commentText, date: new Date().toLocaleString(), isAdmin: true, likes: 0, dislikes: 0, likedBy: [], dislikedBy: [] };
                    if (!complaints[id].comments) {
                        complaints[id].comments = [];
                    }
                    complaints[id].comments.push(comment);
                    updateComments(id);
                    showToast("Admin yorumu başarıyla eklendi.");
                });
            });
        }

        // Yorumları Güncelleme
        function updateComments(complaintId) {
            const commentsSection = document.getElementById(`comments-${complaintId}`);
            const comments = complaints[complaintId].comments || [];
            commentsSection.querySelector('.comment-list').innerHTML = comments.map((comment, index) => `
                <div class="comment fade-in">
                    <div class="comment-body ${comment.isAdmin ? 'admin' : ''} p-4 rounded">
                        <p>${comment.text} <small class="text-muted">(${comment.date})</small></p>
                        <div class="comment-actions">
                            ${(comment.isAdmin && complaints[complaintId].userId === currentUserId) ? `<button class="btn btn-sm btn-primary reply-comment" data-id="${complaintId}" data-index="${index}">Yanıtla</button>` : ''}
                            ${(comment.isAdmin && complaints[complaintId].userId !== currentUserId) ? '' : `<button class="btn btn-sm btn-primary edit-comment" data-id="${complaintId}" data-index="${index}">Düzenle</button>`}
                            <button class="btn btn-sm btn-danger delete-comment" data-id="${complaintId}" data-index="${index}">Sil</button>
                        </div>
                        ${!comment.isAdmin ? `
                        <div class="like-dislike">
                            <button class="like-comment" data-id="${complaintId}" data-index="${index}" ${comment.likedBy.includes(currentUserId) ? 'disabled' : ''}><i class="fas fa-thumbs-up"></i> ${comment.likes}</button>
                            <button class="dislike-comment" data-id="${complaintId}" data-index="${index}" ${comment.dislikedBy.includes(currentUserId) ? 'disabled' : ''}><i class="fas fa-thumbs-down"></i> ${comment.dislikes}</button>
                        </div>
                        ` : ''}
                        <div class="replies mt-3">
                            ${(comment.replies || []).map(reply => `
                                <div class="reply p-2 bg-light rounded mt-2">
                                    <p>${reply.text} <small class="text-muted">(${reply.date})</small></p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="comment-divider"></div>
                </div>
            `).join('');

            // Yorum yanıtla butonlarının işleyicisi
            commentsSection.querySelectorAll('.reply-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const index = e.target.dataset.index;
                    const replyText = prompt("Yanıtınızı giriniz:");
                    if (!replyText) {
                        showToast("Yanıt boş olamaz!", "error");
                        return;
                    }

                    const comment = complaints[id].comments[index];
                    if (!comment.replies) {
                        comment.replies = [];
                    }
                    comment.replies.push({ text: replyText, date: new Date().toLocaleString() });

                    updateComments(id);
                    showToast("Yanıt başarıyla eklendi.");
                });
            });

            // Yorum düzenle butonlarının işleyicisi
            commentsSection.querySelectorAll('.edit-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const index = e.target.dataset.index;
                    const comment = complaints[id].comments[index];
                    const newText = prompt("Yorumunuzu düzenleyin:", comment.text);
                    if (!newText) {
                        showToast("Yorum boş olamaz!", "error");
                        return;
                    }

                    comment.text = newText;
                    comment.date = new Date().toLocaleString();

                    updateComments(id);
                    showToast("Yorum başarıyla düzenlendi.");
                });
            });

            // Yorum sil butonlarının işleyicisi
            commentsSection.querySelectorAll('.delete-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const index = e.target.dataset.index;

                    if (confirm("Bu yorumu silmek istediğinizden emin misiniz?")) {
                        complaints[id].comments.splice(index, 1);
                        updateComments(id);
                        showToast("Yorum başarıyla silindi.");
                    }
                });
            });

            // Beğenme ve beğenmeme butonlarının işleyicisi
            commentsSection.querySelectorAll('.like-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const index = e.target.dataset.index;
                    const comment = complaints[id].comments[index];

                    if (!comment.likedBy.includes(currentUserId)) {
                        comment.likes += 1;
                        comment.likedBy.push(currentUserId);

                        // Beğenmeyi kaldır, beğenmeme varsa
                        if (comment.dislikedBy.includes(currentUserId)) {
                            comment.dislikes -= 1;
                            comment.dislikedBy = comment.dislikedBy.filter(userId => userId !== currentUserId);
                        }
                    }
                    updateComments(id);
                });
            });

            commentsSection.querySelectorAll('.dislike-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const index = e.target.dataset.index;
                    const comment = complaints[id].comments[index];

                    if (!comment.dislikedBy.includes(currentUserId)) {
                        comment.dislikes += 1;
                        comment.dislikedBy.push(currentUserId);

                        // Beğenmeyi kaldır, beğenme varsa
                        if (comment.likedBy.includes(currentUserId)) {
                            comment.likes -= 1;
                            comment.likedBy = comment.likedBy.filter(userId => userId !== currentUserId);
                        }
                    }
                    updateComments(id);
                });
            });

            // Yorumlar için zaman kontrolü
            comments.forEach((comment, index) => {
                const commentDate = new Date(comment.date);
                const now = new Date();
                const diffMinutes = Math.floor((now - commentDate) / 60000);

                if (diffMinutes > 5) {
                    const editButton = commentsSection.querySelector(`.edit-comment[data-id="${complaintId}"][data-index="${index}"]`);
                    const deleteButton = commentsSection.querySelector(`.delete-comment[data-id="${complaintId}"][data-index="${index}"]`);
                    if (editButton) editButton.remove();
                    if (deleteButton) deleteButton.remove();
                }
            });

            // Update comment count
            const commentCountSpan = document.querySelector(`.btn-comment[data-id="${complaintId}"] .comment-count`);
            commentCountSpan.textContent = `(${comments.length})`;
        }

        // Şikayet Özeti Güncelleme
        function updateSummary() {
            const summary = { Ürün: { total: 0, solved: 0 }, Hizmet: { total: 0, solved: 0 }, Diğer: { total: 0, solved: 0 } };

            Object.values(complaints).forEach(complaint => {
                summary[complaint.category].total++;
                if (complaint.status === 'Çözüldü') {
                    summary[complaint.category].solved++;
                }
            });

            document.getElementById('summaryÜrün').textContent = `Ürün: ${summary.Ürün.total} şikayet, ${summary.Ürün.solved} çözüldü`;
            document.getElementById('summaryHizmet').textContent = `Hizmet: ${summary.Hizmet.total} şikayet, ${summary.Hizmet.solved} çözüldü`;
            document.getElementById('summaryDiğer').textContent = `Diğer: ${summary.Diğer.total} şikayet, ${summary.Diğer.solved} çözüldü`;
        }

        // Şikayet Ekleme
        document.getElementById('addComplaint').addEventListener('click', () => {
            const title = document.getElementById('complaintTitle').value.trim();
            const description = document.getElementById('complaintDescription').value.trim();
            const category = document.getElementById('complaintCategory').value;
            const imageInput = document.getElementById('complaintImage');
            const imageFile = imageInput.files.length > 0 ? URL.createObjectURL(imageInput.files[0]) : null;
            const date = new Date().toLocaleString();

            if (!title || !description) {
                showToast("Başlık ve açıklama boş olamaz!", "error");
                return;
            }

            const id = `cmp-${Date.now()}`;
            complaints[id] = { userId: currentUserId, title, description, category, status: 'Açık', imageFile, date, solvedDate: null, rating: 0, comments: [] };

            updateComplaintList();
            updateSummary();

            showToast("Şikayet başarıyla eklendi.");

            document.getElementById('complaintTitle').value = '';
document.getElementById('complaintPreview').style.display = 'none';

            bootstrap.Modal.getInstance(document.getElementById('complaintModal')).hide();
        });

        // Admin Panelini Güncelleme
        function updateAdminTable() {
            const adminTable = document.getElementById('adminComplaintTable');
            adminTable.innerHTML = Object.entries(complaints).map(([id, complaint]) => `
                <tr>
                    <td class="px-4 py-2">${complaint.title}</td>
                    <td class="px-4 py-2">${complaint.category}</td>
                    <td class="px-4 py-2">
                        <select class="form-select" data-id="${id}">
                            <option value="Açık" ${complaint.status === 'Açık' ? 'selected' : ''}>Açık</option>
                            <option value="Çözüldü" ${complaint.status === 'Çözüldü' ? 'selected' : ''}>Çözüldü</option>
                            <option value="Beklemede" ${complaint.status === 'Beklemede' ? 'selected' : ''}>Beklemede</option>
                        </select>
                    </td>
                    <td class="px-4 py-2">${complaint.date}</td>
                    <td class="px-4 py-2">
                        <button class="btn btn-sm btn-primary update-complaint" data-id="${id}">Güncelle</button>
                    </td>
                    <td class="px-4 py-2">
                        <button class="btn btn-sm btn-success add-comment" data-id="${id}">Yorum Ekle</button>
                    </td>
                </tr>
            `).join('');

            // Admin panelindeki durum güncelleme
            adminTable.querySelectorAll('.update-complaint').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const select = adminTable.querySelector(`select[data-id="${id}"]`);
                    const newStatus = select.value;

                    const complaint = complaints[id];
                    if (!complaint.statusHistory) {
                        complaint.statusHistory = [];
                    }
                    complaint.statusHistory.push({ status: newStatus, date: new Date().toLocaleString() });
                    complaint.status = newStatus;

                    if (newStatus === 'Çözüldü' && !complaint.solvedDate) {
                        complaint.solvedDate = new Date().toLocaleString();
                    }

                    // Bildirim Göster
                    showToast(`Şikayet (${id}) durumu "${newStatus}" olarak güncellendi.`);
                    
                    updateComplaintList();
                    updateSummary();
                });
            });

            // Admin panelinden yorum ekleme
            adminTable.querySelectorAll('.add-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const commentText = prompt("Admin yorumu giriniz:");
                    if (!commentText) {
                        showToast("Yorum boş olamaz!", "error");
                        return;
                    }

                    const comment = { text: commentText, date: new Date().toLocaleString(), isAdmin: true, likes: 0, dislikes: 0, likedBy: [], dislikedBy: [] };
                    if (!complaints[id].comments) {
                        complaints[id].comments = [];
                    }
                    complaints[id].comments.push(comment);
                    updateComments(id);
                    showToast("Admin yorumu başarıyla eklendi.");
                });
            });
        }

        // Yorumları Güncelleme
        function updateComments(complaintId) {
            const commentsSection = document.getElementById(`comments-${complaintId}`);
            const comments = complaints[complaintId].comments || [];
            commentsSection.querySelector('.comment-list').innerHTML = comments.map((comment, index) => `
                <div class="comment fade-in">
                    <div class="comment-body ${comment.isAdmin ? 'admin' : ''} p-4 rounded">
                        <p>${comment.text} <small class="text-muted">(${comment.date})</small></p>
                        <div class="comment-actions">
                            ${(comment.isAdmin && complaints[complaintId].userId === currentUserId) ? `<button class="btn btn-sm btn-primary reply-comment" data-id="${complaintId}" data-index="${index}">Yanıtla</button>` : ''}
                            ${(comment.isAdmin && complaints[complaintId].userId !== currentUserId) ? '' : `<button class="btn btn-sm btn-primary edit-comment" data-id="${complaintId}" data-index="${index}">Düzenle</button>`}
                            <button class="btn btn-sm btn-danger delete-comment" data-id="${complaintId}" data-index="${index}">Sil</button>
                        </div>
                        ${!comment.isAdmin ? `
                        <div class="like-dislike">
                            <button class="like-comment" data-id="${complaintId}" data-index="${index}" ${comment.likedBy.includes(currentUserId) ? 'disabled' : ''}><i class="fas fa-thumbs-up"></i> ${comment.likes}</button>
                            <button class="dislike-comment" data-id="${complaintId}" data-index="${index}" ${comment.dislikedBy.includes(currentUserId) ? 'disabled' : ''}><i class="fas fa-thumbs-down"></i> ${comment.dislikes}</button>
                        </div>
                        ` : ''}
                        <div class="replies mt-3">
                            ${(comment.replies || []).map(reply => `
                                <div class="reply p-2 bg-light rounded mt-2">
                                    <p>${reply.text} <small class="text-muted">(${reply.date})</small></p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="comment-divider"></div>
                </div>
            `).join('');

            // Yorum yanıtla butonlarının işleyicisi
            commentsSection.querySelectorAll('.reply-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const index = e.target.dataset.index;
                    const replyText = prompt("Yanıtınızı giriniz:");
                    if (!replyText) {
                        showToast("Yanıt boş olamaz!", "error");
                        return;
                    }

                    const comment = complaints[id].comments[index];
                    if (!comment.replies) {
                        comment.replies = [];
                    }
                    comment.replies.push({ text: replyText, date: new Date().toLocaleString() });

                    updateComments(id);
                    showToast("Yanıt başarıyla eklendi.");
                });
            });

            // Yorum düzenle butonlarının işleyicisi
            commentsSection.querySelectorAll('.edit-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const index = e.target.dataset.index;
                    const comment = complaints[id].comments[index];
                    const newText = prompt("Yorumunuzu düzenleyin:", comment.text);
                    if (!newText) {
                        showToast("Yorum boş olamaz!", "error");
                        return;
                    }

                    comment.text = newText;
                    comment.date = new Date().toLocaleString();

                    updateComments(id);
                    showToast("Yorum başarıyla düzenlendi.");
                });
            });

            // Yorum sil butonlarının işleyicisi
            commentsSection.querySelectorAll('.delete-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const index = e.target.dataset.index;

                    if (confirm("Bu yorumu silmek istediğinizden emin misiniz?")) {
                        complaints[id].comments.splice(index, 1);
                        updateComments(id);
                        showToast("Yorum başarıyla silindi.");
                    }
                });
            });

            // Beğenme ve beğenmeme butonlarının işleyicisi
            commentsSection.querySelectorAll('.like-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const index = e.target.dataset.index;
                    const comment = complaints[id].comments[index];

                    if (!comment.likedBy.includes(currentUserId)) {
                        comment.likes += 1;
                        comment.likedBy.push(currentUserId);

                        // Beğenmeyi kaldır, beğenmeme varsa
                        if (comment.dislikedBy.includes(currentUserId)) {
                            comment.dislikes -= 1;
                            comment.dislikedBy = comment.dislikedBy.filter(userId => userId !== currentUserId);
                        }
                    }
                    updateComments(id);
                });
            });

            commentsSection.querySelectorAll('.dislike-comment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const index = e.target.dataset.index;
                    const comment = complaints[id].comments[index];

                    if (!comment.dislikedBy.includes(currentUserId)) {
                        comment.dislikes += 1;
                        comment.dislikedBy.push(currentUserId);

                        // Beğenmeyi kaldır, beğenme varsa
                        if (comment.likedBy.includes(currentUserId)) {
                            comment.likes -= 1;
                            comment.likedBy = comment.likedBy.filter(userId => userId !== currentUserId);
                        }
                    }
                    updateComments(id);
                });
            });

            // Yorumlar için zaman kontrolü
            comments.forEach((comment, index) => {
                const commentDate = new Date(comment.date);
                const now = new Date();
                const diffMinutes = Math.floor((now - commentDate) / 60000);

                if (diffMinutes > 5) {
                    const editButton = commentsSection.querySelector(`.edit-comment[data-id="${complaintId}"][data-index="${index}"]`);
                    const deleteButton = commentsSection.querySelector(`.delete-comment[data-id="${complaintId}"][data-index="${index}"]`);
                    if (editButton) editButton.remove();
                    if (deleteButton) deleteButton.remove();
                }
            });

            // Update comment count
            const commentCountSpan = document.querySelector(`.btn-comment[data-id="${complaintId}"] .comment-count`);
            commentCountSpan.textContent = `(${comments.length})`;
        }

        // Şikayet Özeti Güncelleme
        function updateSummary() {
            const summary = { Ürün: { total: 0, solved: 0 }, Hizmet: { total: 0, solved: 0 }, Diğer: { total: 0, solved: 0 } };

            Object.values(complaints).forEach(complaint => {
                summary[complaint.category].total++;
                if (complaint.status === 'Çözüldü') {
                    summary[complaint.category].solved++;
                }
            });

            document.getElementById('summaryÜrün').textContent = `Ürün: ${summary.Ürün.total} şikayet, ${summary.Ürün.solved} çözüldü`;
            document.getElementById('summaryHizmet').textContent = `Hizmet: ${summary.Hizmet.total} şikayet, ${summary.Hizmet.solved} çözüldü`;
            document.getElementById('summaryDiğer').textContent = `Diğer: ${summary.Diğer.total} şikayet, ${summary.Diğer.solved} çözüldü`;
        }

        // Şikayet Ekleme
        document.getElementById('addComplaint').addEventListener('click', () => {
            const title = document.getElementById('complaintTitle').value.trim();
            const description = document.getElementById('complaintDescription').value.trim();
            const category = document.getElementById('complaintCategory').value;
            const imageInput = document.getElementById('complaintImage');
            const imageFile = imageInput.files.length > 0 ? URL.createObjectURL(imageInput.files[0]) : null;
            const date = new Date().toLocaleString();

            if (!title || !description) {
                showToast("Başlık ve açıklama boş olamaz!", "error");
                return;
            }

            const id = `cmp-${Date.now()}`;
            complaints[id] = { userId: currentUserId, title, description, category, status: 'Açık', imageFile, date, solvedDate: null, rating: 0, comments: [] };

            updateComplaintList();
            updateSummary();

            showToast("Şikayet başarıyla eklendi.");

            document.getElementById('complaintTitle').value = '';
            document.getElementById('complaintDescription').value = '';
            document.getElementById('complaintImage').value = '';
            document.getElementById('complaintCategory').value = 'Ürün';
            document.getElementById('complaintPreview').style.display = 'none';

            bootstrap.Modal.getInstance(document.getElementById('complaintModal')).hide();
        });

        updateComplaintList();
        updateSummary();
 