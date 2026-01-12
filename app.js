/**
 * X/Twitter Takipçi Analiz Uygulaması
 * Tüm işlemler tarayıcıda gerçekleşir, veri sunucuya gönderilmez.
 */

// ===== State =====
let currentData = {
    followers: [],
    following: [],
    notFollowingBack: [],
    youDontFollow: [],
    mutual: []
};

// ===== DOM Elements =====
const elements = {
    uploadSection: document.getElementById('upload-section'),
    loadingSection: document.getElementById('loading-section'),
    resultsSection: document.getElementById('results-section'),
    snapshotsSection: document.getElementById('snapshots-section'),
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    searchInput: document.getElementById('search-input'),
    snapshotSelect: document.getElementById('snapshot-select'),
    changesSummary: document.getElementById('changes-summary'),
    changesList: document.getElementById('changes-list'),
    bookmarkletLink: document.getElementById('bookmarklet-link'),
    menuBtn: document.getElementById('menu-btn'),
    mobileNav: document.getElementById('mobile-nav'),
    toastContainer: document.getElementById('toast-container')
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeUpload();
    initializeTabs();
    initializeSearch();
    initializeButtons();
    initializeBookmarklet();
    initializeMobileMenu();
    checkForBookmarkletData();
    loadSnapshots();
});

// ===== Toast Notifications =====
function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    elements.toastContainer.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'toastSlide 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);

    return toast;
}

// ===== Mobile Menu =====
function initializeMobileMenu() {
    if (!elements.menuBtn || !elements.mobileNav) return;

    elements.menuBtn.addEventListener('click', () => {
        elements.mobileNav.classList.toggle('show');

        // Update icon
        const isOpen = elements.mobileNav.classList.contains('show');
        elements.menuBtn.innerHTML = isOpen
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <line x1="18" y1="6" x2="6" y2="18"/>
                   <line x1="6" y1="6" x2="18" y2="18"/>
               </svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <line x1="3" y1="6" x2="21" y2="6"/>
                   <line x1="3" y1="12" x2="21" y2="12"/>
                   <line x1="3" y1="18" x2="21" y2="18"/>
               </svg>`;
    });

    // Close menu when clicking a link
    elements.mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            elements.mobileNav.classList.remove('show');
            elements.menuBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            `;
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.mobileNav.contains(e.target) &&
            !elements.menuBtn.contains(e.target) &&
            elements.mobileNav.classList.contains('show')) {
            elements.mobileNav.classList.remove('show');
            elements.menuBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            `;
        }
    });
}

// ===== File Upload =====
function initializeUpload() {
    const { uploadArea, fileInput } = elements;

    // Drag & Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.zip')) {
            processZipFile(file);
        } else {
            showToast('Lütfen bir ZIP dosyası yükleyin.', 'error');
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            processZipFile(file);
        }
    });

    // Click to upload
    uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            fileInput.click();
        }
    });
}

// ===== ZIP Processing =====
async function processZipFile(file) {
    showLoading();
    showToast('Dosya işleniyor...', 'info');

    try {
        const zip = await JSZip.loadAsync(file);

        // Find follower and following files
        let followerData = null;
        let followingData = null;

        for (const [filename, zipEntry] of Object.entries(zip.files)) {
            if (filename.includes('follower') && filename.endsWith('.js')) {
                const content = await zipEntry.async('string');
                followerData = parseTwitterJS(content, 'follower');
            }
            if (filename.includes('following') && filename.endsWith('.js')) {
                const content = await zipEntry.async('string');
                followingData = parseTwitterJS(content, 'following');
            }
        }

        if (!followerData || !followingData) {
            throw new Error('Takipçi veya takip edilen verileri bulunamadı. Doğru ZIP dosyasını yüklediğinizden emin olun.');
        }

        currentData.followers = followerData;
        currentData.following = followingData;

        analyzeData();
        showResults();
        showToast('Analiz tamamlandı! 🎉', 'success');

    } catch (error) {
        console.error('ZIP işleme hatası:', error);
        showToast(error.message || 'Dosya işlenirken bir hata oluştu.', 'error');
        hideLoading();
    }
}

// ===== Parse Twitter JS Files =====
function parseTwitterJS(content, type) {
    try {
        // Twitter JS format: window.YTD.follower.part0 = [...]
        const jsonStart = content.indexOf('[');
        const jsonEnd = content.lastIndexOf(']') + 1;
        const jsonStr = content.substring(jsonStart, jsonEnd);
        const data = JSON.parse(jsonStr);

        // Extract account IDs
        return data.map(item => {
            const entry = item[type] || item;
            return {
                accountId: entry.accountId,
                userLink: entry.userLink || `https://twitter.com/intent/user?user_id=${entry.accountId}`
            };
        });
    } catch (error) {
        console.error(`Parse hatası (${type}):`, error);
        return [];
    }
}

// ===== Data Analysis =====
function analyzeData() {
    const followerIds = new Set(currentData.followers.map(f => f.accountId));
    const followingIds = new Set(currentData.following.map(f => f.accountId));

    // Takip ettiğin ama seni takip etmeyenler
    currentData.notFollowingBack = currentData.following.filter(
        f => !followerIds.has(f.accountId)
    );

    // Seni takip eden ama takip etmediklerin
    currentData.youDontFollow = currentData.followers.filter(
        f => !followingIds.has(f.accountId)
    );

    // Karşılıklı takip
    currentData.mutual = currentData.followers.filter(
        f => followingIds.has(f.accountId)
    );
}

// ===== UI Updates =====
function showLoading() {
    elements.uploadSection.classList.add('hidden');
    elements.loadingSection.classList.remove('hidden');
    elements.resultsSection.classList.add('hidden');
}

function hideLoading() {
    elements.loadingSection.classList.add('hidden');
    elements.uploadSection.classList.remove('hidden');
}

function showResults() {
    elements.loadingSection.classList.add('hidden');
    elements.uploadSection.classList.add('hidden');
    elements.resultsSection.classList.remove('hidden');

    // Update stats with animation
    animateNumber('total-followers', currentData.followers.length);
    animateNumber('total-following', currentData.following.length);
    animateNumber('not-following-back', currentData.notFollowingBack.length);
    animateNumber('mutual-count', currentData.mutual.length);

    // Update tab counts
    document.getElementById('tab-not-following-count').textContent = currentData.notFollowingBack.length;
    document.getElementById('tab-you-dont-follow-count').textContent = currentData.youDontFollow.length;
    document.getElementById('tab-mutual-count').textContent = currentData.mutual.length;

    // Render lists
    renderUserList('list-not-following', currentData.notFollowingBack);
    renderUserList('list-you-dont-follow', currentData.youDontFollow);
    renderUserList('list-mutual', currentData.mutual);

    // Show snapshots if available
    updateSnapshotsUI();

    // Scroll to results
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Number animation for stats
function animateNumber(elementId, target) {
    const element = document.getElementById(elementId);
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        const current = Math.round(start + (target - start) * easeProgress);

        element.textContent = current.toLocaleString('tr-TR');

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function renderUserList(containerId, users, searchQuery = '') {
    const container = document.getElementById(containerId);

    const filteredUsers = searchQuery
        ? users.filter(u => u.accountId.toLowerCase().includes(searchQuery.toLowerCase()))
        : users;

    if (filteredUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 15h8M9 9h.01M15 9h.01"/>
                </svg>
                <p>${searchQuery ? 'Arama sonucu bulunamadı' : 'Bu listede kimse yok'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredUsers.map((user, index) => `
        <div class="user-item" style="animation-delay: ${index * 0.03}s">
            <div class="user-avatar">${getInitial(user.accountId)}</div>
            <div class="user-info">
                <div class="user-id">@${user.accountId}</div>
                <div class="user-link">ID: ${user.accountId}</div>
            </div>
            <div class="user-actions">
                <a href="${user.userLink}" target="_blank" rel="noopener">Profili Gör</a>
            </div>
        </div>
    `).join('');
}

function getInitial(id) {
    return id.charAt(0).toUpperCase();
}

// ===== Tabs =====
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Add active to clicked
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            document.getElementById(`content-${tabId}`).classList.add('active');
        });
    });
}

// ===== Search =====
function initializeSearch() {
    let debounceTimer;

    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = e.target.value;
            renderUserList('list-not-following', currentData.notFollowingBack, query);
            renderUserList('list-you-dont-follow', currentData.youDontFollow, query);
            renderUserList('list-mutual', currentData.mutual, query);
        }, 200);
    });
}

// ===== Buttons =====
function initializeButtons() {
    document.getElementById('save-snapshot-btn').addEventListener('click', saveSnapshot);
    document.getElementById('export-btn').addEventListener('click', exportData);
}

// ===== Snapshots =====
function saveSnapshot() {
    if (currentData.followers.length === 0) {
        showToast('Önce veri yüklemeniz gerekiyor.', 'warning');
        return;
    }

    const snapshots = JSON.parse(localStorage.getItem('xFollowerSnapshots') || '[]');

    const newSnapshot = {
        id: Date.now(),
        date: new Date().toISOString(),
        displayDate: new Date().toLocaleString('tr-TR'),
        followers: currentData.followers.map(f => f.accountId),
        following: currentData.following.map(f => f.accountId)
    };

    snapshots.unshift(newSnapshot);

    // Keep only last 10 snapshots
    if (snapshots.length > 10) {
        snapshots.pop();
    }

    localStorage.setItem('xFollowerSnapshots', JSON.stringify(snapshots));

    showToast('Snapshot kaydedildi! 💾', 'success');
    updateSnapshotsUI();
}

function loadSnapshots() {
    const snapshots = JSON.parse(localStorage.getItem('xFollowerSnapshots') || '[]');
    return snapshots;
}

function updateSnapshotsUI() {
    const snapshots = loadSnapshots();

    if (snapshots.length === 0) {
        elements.snapshotsSection.classList.add('hidden');
        return;
    }

    elements.snapshotsSection.classList.remove('hidden');

    // Populate select
    elements.snapshotSelect.innerHTML = snapshots.map(s =>
        `<option value="${s.id}">${s.displayDate}</option>`
    ).join('');

    // Add change handler (remove old listeners first)
    const newSelect = elements.snapshotSelect.cloneNode(true);
    elements.snapshotSelect.parentNode.replaceChild(newSelect, elements.snapshotSelect);
    elements.snapshotSelect = newSelect;

    elements.snapshotSelect.addEventListener('change', () => {
        compareWithSnapshot(elements.snapshotSelect.value);
    });

    // Compare with most recent
    if (currentData.followers.length > 0) {
        compareWithSnapshot(snapshots[0].id);
    }
}

function compareWithSnapshot(snapshotId) {
    const snapshots = loadSnapshots();
    const snapshot = snapshots.find(s => s.id == snapshotId);

    if (!snapshot || currentData.followers.length === 0) return;

    const currentFollowerIds = new Set(currentData.followers.map(f => f.accountId));
    const snapshotFollowerIds = new Set(snapshot.followers);

    // New followers (in current but not in snapshot)
    const newFollowers = [...currentFollowerIds].filter(id => !snapshotFollowerIds.has(id));

    // Lost followers (in snapshot but not in current)
    const lostFollowers = [...snapshotFollowerIds].filter(id => !currentFollowerIds.has(id));

    // Update summary
    elements.changesSummary.innerHTML = `
        <div class="change-stat new">
            <span>✅ Yeni Takipçi:</span>
            <strong>${newFollowers.length}</strong>
        </div>
        <div class="change-stat lost">
            <span>❌ Çıkan Takipçi:</span>
            <strong>${lostFollowers.length}</strong>
        </div>
    `;

    // Update list
    let changesHTML = '';

    if (lostFollowers.length > 0) {
        changesHTML += '<h4 style="color: var(--accent-red); margin-bottom: 8px;">Takipten Çıkanlar:</h4>';
        changesHTML += lostFollowers.map(id => `
            <div class="user-item" style="border-left: 3px solid var(--accent-red);">
                <div class="user-avatar">${id.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-id">@${id}</div>
                </div>
                <div class="user-actions">
                    <a href="https://twitter.com/intent/user?user_id=${id}" target="_blank">Profil</a>
                </div>
            </div>
        `).join('');
    }

    if (newFollowers.length > 0) {
        changesHTML += '<h4 style="color: var(--accent-green); margin: 16px 0 8px;">Yeni Takipçiler:</h4>';
        changesHTML += newFollowers.map(id => `
            <div class="user-item" style="border-left: 3px solid var(--accent-green);">
                <div class="user-avatar">${id.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-id">@${id}</div>
                </div>
                <div class="user-actions">
                    <a href="https://twitter.com/intent/user?user_id=${id}" target="_blank">Profil</a>
                </div>
            </div>
        `).join('');
    }

    if (!changesHTML) {
        changesHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 24px;">Bu snapshot ile arasında değişiklik yok.</p>';
    }

    elements.changesList.innerHTML = changesHTML;
}

// ===== Export =====
function exportData() {
    if (currentData.followers.length === 0) {
        showToast('Önce veri yüklemeniz gerekiyor.', 'warning');
        return;
    }

    const exportObj = {
        exportDate: new Date().toISOString(),
        stats: {
            totalFollowers: currentData.followers.length,
            totalFollowing: currentData.following.length,
            notFollowingBack: currentData.notFollowingBack.length,
            youDontFollow: currentData.youDontFollow.length,
            mutual: currentData.mutual.length
        },
        notFollowingBack: currentData.notFollowingBack.map(u => u.accountId),
        youDontFollow: currentData.youDontFollow.map(u => u.accountId),
        mutual: currentData.mutual.map(u => u.accountId)
    };

    const dataStr = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `x-follower-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Veriler indirildi! 📥', 'success');
}

// ===== Bookmarklet =====
function initializeBookmarklet() {
    // Bookmarklet code that will be run on Twitter
    const bookmarkletCode = `
        (function() {
            const type = window.location.href.includes('/followers') ? 'followers' : 
                         window.location.href.includes('/following') ? 'following' : null;
            
            if (!type) {
                alert('Lütfen Twitter takipçi veya takip sayfasında bu bookmarklet\\'i kullanın.');
                return;
            }
            
            alert('Veriler toplanıyor... Sayfa otomatik scroll yapacak. Lütfen bekleyin.');
            
            const users = new Set();
            let lastCount = 0;
            let stableCount = 0;
            
            const scroll = setInterval(() => {
                document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
                    const link = cell.querySelector('a[href^="/"]');
                    if (link) {
                        const username = link.getAttribute('href').replace('/', '');
                        if (username && !username.includes('/')) {
                            users.add(username);
                        }
                    }
                });
                
                if (users.size === lastCount) {
                    stableCount++;
                    if (stableCount >= 3) {
                        clearInterval(scroll);
                        const data = { type, users: Array.from(users), date: new Date().toISOString() };
                        localStorage.setItem('xAnalyzerData_' + type, JSON.stringify(data));
                        alert('✅ ' + users.size + ' ' + (type === 'followers' ? 'takipçi' : 'takip') + ' toplandı! Ana sayfaya dönün ve sayfayı yenileyin.');
                    }
                } else {
                    stableCount = 0;
                    lastCount = users.size;
                }
                
                window.scrollBy(0, 1000);
            }, 500);
        })();
    `;

    elements.bookmarkletLink.href = 'javascript:' + encodeURIComponent(bookmarkletCode.replace(/\s+/g, ' ').trim());
}

function checkForBookmarkletData() {
    const followersData = localStorage.getItem('xAnalyzerData_followers');
    const followingData = localStorage.getItem('xAnalyzerData_following');

    if (followersData && followingData) {
        try {
            const followers = JSON.parse(followersData);
            const following = JSON.parse(followingData);

            currentData.followers = followers.users.map(u => ({
                accountId: u,
                userLink: `https://twitter.com/${u}`
            }));

            currentData.following = following.users.map(u => ({
                accountId: u,
                userLink: `https://twitter.com/${u}`
            }));

            analyzeData();
            showResults();
            showToast('Bookmarklet verileri yüklendi! 🎉', 'success');

        } catch (e) {
            console.error('Bookmarklet verisi parse edilemedi:', e);
        }
    }
}
