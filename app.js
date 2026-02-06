/**
 * X/Twitter Takipçi Analiz Uygulaması — Kampüs Edition v3
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

// Pagination state
const ITEMS_PER_PAGE = 50;
let displayCounts = {
    'list-not-following': ITEMS_PER_PAGE,
    'list-you-dont-follow': ITEMS_PER_PAGE,
    'list-mutual': ITEMS_PER_PAGE
};

// ===== DOM Elements =====
const elements = {};

function cacheElements() {
    elements.pasteSection = document.getElementById('paste-section');
    elements.resultsSection = document.getElementById('results-content');
    elements.resultsDivider = document.getElementById('results-divider');
    elements.snapshotsSection = document.getElementById('snapshots-section');
    elements.followersInput = document.getElementById('followers-input');
    elements.followingInput = document.getElementById('following-input');
    elements.analyzeBtn = document.getElementById('analyze-paste-btn');
    elements.searchInput = document.getElementById('search-input');
    elements.copyCodeBtn = document.getElementById('copy-code-btn');
    elements.saveSnapshotBtn = document.getElementById('save-snapshot-btn');
    elements.exportCsvBtn = document.getElementById('export-csv-btn');
    elements.exportJsonBtn = document.getElementById('export-json-btn');
    elements.compareSnapshotBtn = document.getElementById('compare-snapshot-btn');
    elements.tabs = document.querySelectorAll('.tab-btn');
    elements.tabContents = document.querySelectorAll('.tab-content');
    elements.toastContainer = document.getElementById('toast-container');
    elements.snapshotSelect = document.getElementById('snapshot-select');
    elements.changesSummary = document.getElementById('changes-summary');
    elements.changesList = document.getElementById('changes-list');
}

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    initializeTheme();
    initializeLanguage();
    initializeTabs();
    initializeSearch();
    initializeButtons();
    initializePasteAutoCount();
    loadSnapshots();
});

// ========== Clipboard Helper ==========
function copyToClipboard(text) {
    // Önce execCommand dene (HTTP dahil her yerde çalışır)
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    let success = false;
    try {
        success = document.execCommand('copy');
    } catch (e) {
        success = false;
    }
    document.body.removeChild(textarea);
    
    if (success) {
        showToast(state.lang === 'tr' ? 'Kopyalandı!' : 'Copied!', 'success');
        return;
    }
    
    // Fallback: Clipboard API (sadece HTTPS'de çalışır)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(state.lang === 'tr' ? 'Kopyalandı!' : 'Copied!', 'success');
        }).catch(() => {
            showToast(state.lang === 'tr' ? 'Kopyalama başarısız. Kodu seçip Ctrl+C yapın.' : 'Copy failed. Select code and press Ctrl+C.', 'error');
        });
    } else {
        showToast(state.lang === 'tr' ? 'Kopyalama başarısız. Kodu seçip Ctrl+C yapın.' : 'Copy failed. Select code and press Ctrl+C.', 'error');
    }
}

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Kapat">×</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    });

    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// ===== Paste Counter =====
function initializePasteAutoCount() {
    const updateCount = (input, countEl) => {
        if (!input || !countEl) return;
        const list = parseList(input.value);
        countEl.textContent = list.length;
    };

    if (elements.followersInput) {
        elements.followersInput.addEventListener('input', () =>
            updateCount(elements.followersInput, document.getElementById('followers-count'))
        );
    }
    if (elements.followingInput) {
        elements.followingInput.addEventListener('input', () =>
            updateCount(elements.followingInput, document.getElementById('following-count'))
        );
    }
}

// ===== Buttons =====
function initializeButtons() {
    // Analyze button
    if (elements.analyzeBtn) {
        elements.analyzeBtn.addEventListener('click', analyzePastedData);
    }

    // Copy code button
    if (elements.copyCodeBtn) {
        elements.copyCodeBtn.addEventListener('click', () => {
            const codeEl = document.getElementById('console-code');
            if (!codeEl) return;
            const code = codeEl.innerText || codeEl.textContent || '';
            
            if (!code.trim()) {
                showToast('Kod bulunamadı.', 'error');
                return;
            }
            
            copyToClipboard(code);
        });
    }

    // Save snapshot button
    if (elements.saveSnapshotBtn) {
        elements.saveSnapshotBtn.addEventListener('click', saveSnapshot);
    }

    // Export CSV button
    if (elements.exportCsvBtn) {
        elements.exportCsvBtn.addEventListener('click', () => exportData('csv'));
    }

    // Export JSON button
    if (elements.exportJsonBtn) {
        elements.exportJsonBtn.addEventListener('click', () => exportData('json'));
    }

    // Compare snapshot button
    if (elements.compareSnapshotBtn) {
        elements.compareSnapshotBtn.addEventListener('click', compareSnapshot);
    }
}

// ===== Parse Logic =====
function parseList(text) {
    if (!text || !text.trim()) return [];
    return text.split(/[\n,\s]+/)
        .map(u => u.trim().replace(/^@/, '').toLowerCase())
        .filter(u => u && u.length > 0 && u.length <= 15 && /^[a-zA-Z0-9_]+$/.test(u));
}

function analyzePastedData() {
    const followersRaw = elements.followersInput?.value;
    const followingRaw = elements.followingInput?.value;

    if (!followersRaw || !followingRaw) {
        showToast('Lütfen her iki listeyi de yapıştırın.', 'warning');
        return;
    }

    currentData.followers = parseList(followersRaw);
    currentData.following = parseList(followingRaw);

    if (currentData.followers.length === 0 || currentData.following.length === 0) {
        showToast('Geçerli kullanıcı bulunamadı. Listeleri kontrol edin.', 'error');
        return;
    }

    calculateResults();
    showResults();
    showToast(`Analiz tamamlandı! ${currentData.notFollowingBack.length} kişi seni takip etmiyor.`, 'success');

    // Smooth scroll to results
    elements.resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== Analysis Logic =====
function calculateResults() {
    const followers = new Set(currentData.followers);
    const following = new Set(currentData.following);

    currentData.notFollowingBack = currentData.following.filter(u => !followers.has(u));
    currentData.youDontFollow = currentData.followers.filter(u => !following.has(u));
    currentData.mutual = currentData.following.filter(u => followers.has(u));
}

// ===== UI Logic =====
function showResults() {
    if (elements.resultsSection) elements.resultsSection.classList.remove('hidden');
    if (elements.resultsDivider) elements.resultsDivider.classList.remove('hidden');
    if (elements.snapshotsSection) elements.snapshotsSection.classList.remove('hidden');

    // Reset pagination
    displayCounts = {
        'list-not-following': ITEMS_PER_PAGE,
        'list-you-dont-follow': ITEMS_PER_PAGE,
        'list-mutual': ITEMS_PER_PAGE
    };

    // Animate stats
    animateNumber('total-followers', currentData.followers.length);
    animateNumber('total-following', currentData.following.length);
    animateNumber('not-following-back', currentData.notFollowingBack.length);
    animateNumber('mutual-count', currentData.mutual.length);

    // Update tab counts
    const tabCounts = {
        'tab-not-following-count': currentData.notFollowingBack.length,
        'tab-you-dont-follow-count': currentData.youDontFollow.length,
        'tab-mutual-count': currentData.mutual.length
    };
    Object.entries(tabCounts).forEach(([id, count]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = count;
    });

    // Render lists
    renderUserList('list-not-following', currentData.notFollowingBack);
    renderUserList('list-you-dont-follow', currentData.youDontFollow);
    renderUserList('list-mutual', currentData.mutual);

    // Update charts (with safety check)
    updateCharts();
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;

    const duration = 800;
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
    }
    requestAnimationFrame(step);
}

function renderUserList(containerId, users, searchQuery = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Get parent wrapper to manage show-more button
    const wrapper = container.closest('.tab-content');

    // Filter by search
    const filtered = searchQuery
        ? users.filter(u => u.toLowerCase().includes(searchQuery))
        : users;

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-list">Liste boş</div>';
        // Remove existing show-more button
        const existingBtn = wrapper?.querySelector('.show-more-btn');
        if (existingBtn) existingBtn.remove();
        return;
    }

    // Pagination
    const limit = displayCounts[containerId] || ITEMS_PER_PAGE;
    const visible = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;

    container.innerHTML = visible.map(u => `
        <div class="user-item">
            <div class="user-avatar">${u.charAt(0).toUpperCase()}</div>
            <div class="user-info">
                <div class="user-id">@${u}</div>
                <div class="user-link">x.com/${u}</div>
            </div>
            <div class="user-actions">
                <a href="https://x.com/${u}" target="_blank" rel="noopener noreferrer">Profil</a>
            </div>
        </div>
    `).join('');

    // Manage show-more button
    let showMoreBtn = wrapper?.querySelector('.show-more-btn');
    if (hasMore) {
        if (!showMoreBtn) {
            showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'show-more-btn';
            showMoreBtn.addEventListener('click', () => {
                displayCounts[containerId] = (displayCounts[containerId] || ITEMS_PER_PAGE) + ITEMS_PER_PAGE;
                renderUserList(containerId, users, searchQuery);
            });
            wrapper?.appendChild(showMoreBtn);
        }
        const remaining = filtered.length - limit;
        showMoreBtn.textContent = `Daha fazla göster (${remaining} kişi kaldı)`;
    } else if (showMoreBtn) {
        showMoreBtn.remove();
    }
}

// ===== Tabs =====
function initializeTabs() {
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update tab buttons
            elements.tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            // Update tab content
            elements.tabContents.forEach(c => c.classList.remove('active'));
            const target = tab.dataset.tab;
            const panel = document.getElementById(`content-${target}`);
            if (panel) panel.classList.add('active');
        });
    });
}

// ===== Search =====
function initializeSearch() {
    if (!elements.searchInput) return;

    let debounceTimer;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();

            // Reset pagination on search
            displayCounts = {
                'list-not-following': ITEMS_PER_PAGE,
                'list-you-dont-follow': ITEMS_PER_PAGE,
                'list-mutual': ITEMS_PER_PAGE
            };

            renderUserList('list-not-following', currentData.notFollowingBack, query);
            renderUserList('list-you-dont-follow', currentData.youDontFollow, query);
            renderUserList('list-mutual', currentData.mutual, query);
        }, 200);
    });
}

// ===== Charts =====
let charts = { ratio: null, relationship: null };

function updateCharts() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded yet');
        return;
    }

    const ctx1 = document.getElementById('ratio-chart');
    const ctx2 = document.getElementById('relationship-chart');
    if (!ctx1 || !ctx2) return;

    if (charts.ratio) charts.ratio.destroy();
    if (charts.relationship) charts.relationship.destroy();

    const isDark = document.body.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#9d9db8' : '#64648a';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    charts.ratio = new Chart(ctx1.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Takipçi', 'Takip'],
            datasets: [{
                data: [currentData.followers.length, currentData.following.length],
                backgroundColor: ['#a855f7', '#3b82f6'],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, padding: 16, font: { weight: '600', size: 12 } }
                }
            }
        }
    });

    charts.relationship = new Chart(ctx2.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Takip Etmeyen', 'Takip Etmediklerin', 'Karşılıklı'],
            datasets: [{
                data: [
                    currentData.notFollowingBack.length,
                    currentData.youDontFollow.length,
                    currentData.mutual.length
                ],
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, padding: 16, font: { weight: '600', size: 12 } }
                }
            }
        }
    });
}

// ===== Theme =====
function initializeTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;

    const sunIcon = themeBtn.querySelector('.theme-sun');
    const moonIcon = themeBtn.querySelector('.theme-moon');

    const setThemeUI = (theme) => {
        document.body.setAttribute('data-theme', theme);
        // In dark mode: show sun icon (to switch to light)
        // In light mode: show moon icon (to switch to dark)
        if (theme === 'dark') {
            sunIcon?.classList.remove('hidden');
            moonIcon?.classList.add('hidden');
        } else {
            sunIcon?.classList.add('hidden');
            moonIcon?.classList.remove('hidden');
        }
        // Re-render charts with updated colors
        if (currentData.followers.length > 0) {
            updateCharts();
        }
    };

    const saved = localStorage.getItem('theme') || 'dark';
    setThemeUI(saved);

    themeBtn.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        setThemeUI(next);
    });
}

// ===== Language =====
function initializeLanguage() {
    const langBtn = document.getElementById('lang-toggle');
    if (!langBtn) return;

    let lang = localStorage.getItem('lang') || 'tr';

    const updateUI = () => {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang]?.[key]) el.textContent = translations[lang][key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[lang]?.[key]) el.placeholder = translations[lang][key];
        });
        langBtn.textContent = lang.toUpperCase();
    };

    langBtn.addEventListener('click', () => {
        lang = lang === 'tr' ? 'en' : 'tr';
        localStorage.setItem('lang', lang);
        updateUI();
    });

    updateUI();
}

// ===== Export =====
function exportData(format) {
    if (currentData.followers.length === 0) {
        showToast('Dışa aktarılacak veri yok. Önce analiz yapın.', 'warning');
        return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    let content, mimeType, filename;

    if (format === 'csv') {
        const maxLen = Math.max(
            currentData.notFollowingBack.length,
            currentData.youDontFollow.length,
            currentData.mutual.length
        );

        const rows = [['Takip Etmeyenler', 'Takip Etmediklerin', 'Karşılıklı']];
        for (let i = 0; i < maxLen; i++) {
            rows.push([
                currentData.notFollowingBack[i] || '',
                currentData.youDontFollow[i] || '',
                currentData.mutual[i] || ''
            ]);
        }

        content = rows.map(r => r.join(',')).join('\n');
        mimeType = 'text/csv;charset=utf-8;';
        filename = `x-analiz-${timestamp}.csv`;
    } else {
        content = JSON.stringify({
            exportDate: new Date().toISOString(),
            stats: {
                totalFollowers: currentData.followers.length,
                totalFollowing: currentData.following.length,
                notFollowingBack: currentData.notFollowingBack.length,
                youDontFollow: currentData.youDontFollow.length,
                mutual: currentData.mutual.length
            },
            notFollowingBack: currentData.notFollowingBack,
            youDontFollow: currentData.youDontFollow,
            mutual: currentData.mutual
        }, null, 2);
        mimeType = 'application/json;charset=utf-8;';
        filename = `x-analiz-${timestamp}.json`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`${format.toUpperCase()} dosyası indirildi!`, 'success');
}

// ===== Snapshots =====
function loadSnapshots() {
    const snaps = JSON.parse(localStorage.getItem('xSnaps') || '[]');
    const select = elements.snapshotSelect;
    if (!select) return;

    select.innerHTML = '<option value="">' +
        (localStorage.getItem('lang') === 'en' ? 'Select a snapshot...' : 'Snapshot seçin...') +
        '</option>' +
        snaps.map(s => `<option value="${s.id}">${s.date} (${s.followers?.length || 0} takipçi)</option>`).join('');
}

function saveSnapshot() {
    if (currentData.followers.length === 0) {
        showToast('Kaydedilecek veri yok. Önce analiz yapın.', 'warning');
        return;
    }

    const snaps = JSON.parse(localStorage.getItem('xSnaps') || '[]');
    const newSnap = {
        id: Date.now(),
        date: new Date().toLocaleString('tr-TR'),
        followers: [...currentData.followers],
        following: [...currentData.following]
    };
    snaps.unshift(newSnap);
    localStorage.setItem('xSnaps', JSON.stringify(snaps.slice(0, 10)));
    loadSnapshots();
    showToast('Snapshot kaydedildi!', 'success');
}

function compareSnapshot() {
    const select = elements.snapshotSelect;
    if (!select || !select.value) {
        showToast('Lütfen karşılaştırılacak bir snapshot seçin.', 'warning');
        return;
    }

    if (currentData.followers.length === 0) {
        showToast('Önce analiz yapın, sonra karşılaştırın.', 'warning');
        return;
    }

    const snaps = JSON.parse(localStorage.getItem('xSnaps') || '[]');
    const selectedSnap = snaps.find(s => String(s.id) === select.value);
    if (!selectedSnap) {
        showToast('Snapshot bulunamadı.', 'error');
        return;
    }

    const oldFollowers = new Set(selectedSnap.followers || []);
    const newFollowers = new Set(currentData.followers);

    const gained = currentData.followers.filter(u => !oldFollowers.has(u));
    const lost = (selectedSnap.followers || []).filter(u => !newFollowers.has(u));

    const summary = elements.changesSummary;
    const list = elements.changesList;
    if (!summary || !list) return;

    summary.innerHTML = `
        <strong>📈 Yeni takipçi: +${gained.length}</strong> &nbsp; | &nbsp;
        <strong>📉 Takipten çıkan: -${lost.length}</strong>
    `;

    const items = [
        ...gained.map(u => `<div class="change-item gained">
            <span class="change-badge gained">+YENİ</span>
            <span>@${u}</span>
        </div>`),
        ...lost.map(u => `<div class="change-item lost">
            <span class="change-badge lost">-ÇIKAN</span>
            <span>@${u}</span>
        </div>`)
    ];

    list.innerHTML = items.length > 0 ? items.join('') :
        '<div class="empty-list" style="padding:24px">Değişiklik bulunamadı.</div>';

    showToast('Karşılaştırma tamamlandı!', 'success');
}

// ===== Translations =====
const translations = {
    tr: {
        'nav.script': 'Analiz',
        'nav.results': 'Sonuçlar',
        'nav.goToX': 'X\'e Git',
        'hero.line1': 'Takipçi Analizinde',
        'hero.line2': 'Zirveye Ulaşın.',
        'hero.subtitle': 'Twitter profilinizi derinlemesine analiz edin. Sizi takip etmeyenleri anında tespit edin.',
        'hero.cta': 'Hemen Başla',
        'paste.title': '📋 Verileri Yapıştır',
        'paste.subtitle': 'Hesap listelerini buraya ekleyin',
        'paste.followers': 'Takipçiler',
        'paste.following': 'Takip Edilenler',
        'paste.followersPlaceholder': 'Takipçi listesini buraya yapıştır...',
        'paste.followingPlaceholder': 'Takip edilen listesini buraya yapıştır...',
        'paste.analyze': 'Analizi Başlat',
        'script.toggle': '⚡ Verileri Nasıl Alırım?',
        'script.subtitle': 'Twitter profilinizden verileri otomatik toplamak için aşağıdaki kodu kullanın',
        'step1.title': 'Twitter\'a Git',
        'step1.desc': 'Takipçi listeni aç',
        'step2.title': 'Konsolu Aç',
        'step2.desc': 'tuşuna bas',
        'step3.title': 'Scripti Çalıştır',
        'step3.desc': 'Aşağıdaki kodu yapıştır',
        'code.copy': 'Kopyala',
        'results.title': '📊 Analiz Özeti',
        'stats.followers': 'Takipçi',
        'stats.following': 'Takip Edilen',
        'stats.notFollowing': 'Takip Etmeyen',
        'stats.mutual': 'Karşılıklı',
        'charts.ratio': 'Takipçi / Takip Oranı',
        'charts.relationship': 'İlişki Analizi',
        'tabs.notFollowing': 'Takip Etmeyenler',
        'tabs.youDontFollow': 'Takip Etmediklerin',
        'tabs.mutual': 'Karşılıklı',
        'search.placeholder': 'Kullanıcı ara...',
        'actions.saveSnapshot': 'Kaydet',
        'actions.export': 'Dışa Aktar',
        'snapshots.title': '📸 Geçmiş Karşılaştırma',
        'snapshots.compare': 'Karşılaştır',
        'footer.privacy': '🔒 Tüm verileriniz tarayıcınızda işlenir. Hiçbir veri sunucuya gönderilmez.'
    },
    en: {
        'nav.script': 'Analyze',
        'nav.results': 'Results',
        'nav.goToX': 'Go to X',
        'hero.line1': 'Master Your',
        'hero.line2': 'Follower Analysis.',
        'hero.subtitle': 'Deeply analyze your Twitter profile. Instantly detect who doesn\'t follow you back.',
        'hero.cta': 'Get Started',
        'paste.title': '📋 Paste Data',
        'paste.subtitle': 'Paste your account lists here',
        'paste.followers': 'Followers',
        'paste.following': 'Following',
        'paste.followersPlaceholder': 'Paste follower list here...',
        'paste.followingPlaceholder': 'Paste following list here...',
        'paste.analyze': 'Start Analysis',
        'script.toggle': '⚡ How to Get the List?',
        'script.subtitle': 'Use the code below to automatically collect data from your Twitter profile',
        'step1.title': 'Go to Twitter',
        'step1.desc': 'Open follower list',
        'step2.title': 'Open Console',
        'step2.desc': 'Press the key',
        'step3.title': 'Run Script',
        'step3.desc': 'Paste the code below',
        'code.copy': 'Copy',
        'results.title': '📊 Analysis Summary',
        'stats.followers': 'Followers',
        'stats.following': 'Following',
        'stats.notFollowing': 'Not Following Back',
        'stats.mutual': 'Mutual',
        'charts.ratio': 'Follower / Following Ratio',
        'charts.relationship': 'Relationship Analysis',
        'tabs.notFollowing': 'Not Following Back',
        'tabs.youDontFollow': 'You Don\'t Follow',
        'tabs.mutual': 'Mutual',
        'search.placeholder': 'Search users...',
        'actions.saveSnapshot': 'Save',
        'actions.export': 'Export',
        'snapshots.title': '📸 History Comparison',
        'snapshots.compare': 'Compare',
        'footer.privacy': '🔒 All data is processed in your browser. No data is sent to any server.'
    }
};
