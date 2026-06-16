// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let allReleases = [];
let selectedReleases = new Set();
let currentFilters = {
    search: '',
    type: 'all'
};
let lastUpdatedTime = null;

// DOM Elements
const elements = {
    btnRefresh: document.getElementById('btn-refresh'),
    btnExport: document.getElementById('btn-export'),
    themeToggle: document.getElementById('theme-toggle'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    loadingState: document.getElementById('loading-state'),
    emptyState: document.getElementById('empty-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    updatesGrid: document.getElementById('updates-grid'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    btnRetry: document.getElementById('btn-retry'),
    
    // Floating Bar
    floatingBar: document.getElementById('floating-bar'),
    selectedCountNum: document.getElementById('selected-count-num'),
    btnClearSelection: document.getElementById('btn-clear-selection'),
    btnTweetSelected: document.getElementById('btn-tweet-selected'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCount: document.getElementById('char-count'),
    charWarning: document.getElementById('char-warning'),
    charCounterContainer: document.getElementById('char-counter-container'),
    tweetPreviewText: document.getElementById('tweet-preview-text'),
    btnCopyTweet: document.getElementById('btn-copy-tweet'),
    btnPublishTweet: document.getElementById('btn-publish-tweet'),
    
    // Stats
    statAll: document.getElementById('stat-all'),
    statFeature: document.getElementById('stat-feature'),
    statChange: document.getElementById('stat-change'),
    statIssue: document.getElementById('stat-issue'),
    statDeprecation: document.getElementById('stat-deprecation'),
    statCards: document.querySelectorAll('.stat-card'),
    filterPills: document.querySelectorAll('.pill'),
    
    // Toasts
    toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// FEED INITIALIZATION & DATA FETCHING
// ==========================================================================
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    elements.btnRefresh.classList.add('spinning');
    
    try {
        const url = `/api/releases?refresh=${forceRefresh}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            allReleases = data.updates;
            lastUpdatedTime = data.last_updated;
            
            // Clear selection on full refresh
            if (forceRefresh) {
                selectedReleases.clear();
                updateFloatingBar();
            }
            
            updateStats();
            applyFiltersAndRender();
            updateLastUpdatedDisplay();
            showErrorState(false);
            
            if (forceRefresh) {
                showToast('Release notes successfully refreshed!', 'success');
            }
        } else {
            throw new Error(data.message || 'Unknown server error');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        elements.errorMessage.textContent = error.message || 'Failed to establish connection to the server.';
        showErrorState(true);
        showToast('Failed to load release notes.', 'error');
    } finally {
        showLoading(false);
        elements.btnRefresh.classList.remove('spinning');
    }
}

// Helper to show/hide loading state
function showLoading(isLoading) {
    if (isLoading) {
        elements.loadingState.classList.remove('hidden');
        elements.updatesGrid.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
        elements.errorState.classList.add('hidden');
    } else {
        elements.loadingState.classList.add('hidden');
    }
}

// Helper to show/hide error state
function showErrorState(isError) {
    if (isError) {
        elements.errorState.classList.remove('hidden');
        elements.updatesGrid.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
        elements.loadingState.classList.add('hidden');
    } else {
        elements.errorState.classList.add('hidden');
    }
}

// ==========================================================================
// LAST UPDATED TIME DISPLAY
// ==========================================================================
function updateLastUpdatedDisplay() {
    if (!lastUpdatedTime) {
        elements.lastUpdatedText.textContent = "Never updated";
        return;
    }
    
    const date = new Date(lastUpdatedTime);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
        elements.lastUpdatedText.textContent = "Updated just now";
    } else if (diffMins < 60) {
        elements.lastUpdatedText.textContent = `Updated ${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    } else {
        const hours = Math.floor(diffMins / 60);
        elements.lastUpdatedText.textContent = `Updated ${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
}

// Auto-refresh the relative time text every 30 seconds
setInterval(updateLastUpdatedDisplay, 30000);

// ==========================================================================
// STATS CALCULATION
// ==========================================================================
function updateStats() {
    const counts = {
        all: allReleases.length,
        feature: 0,
        change: 0,
        issue: 0,
        deprecation: 0
    };
    
    allReleases.forEach(item => {
        const type = item.type.toLowerCase();
        if (type.includes('feature')) counts.feature++;
        else if (type.includes('change')) counts.change++;
        else if (type.includes('issue') || type.includes('fixed') || type.includes('bug')) counts.issue++;
        else if (type.includes('deprecat')) counts.deprecation++;
    });
    
    elements.statAll.textContent = counts.all;
    elements.statFeature.textContent = counts.feature;
    elements.statChange.textContent = counts.change;
    elements.statIssue.textContent = counts.issue;
    elements.statDeprecation.textContent = counts.deprecation;
}

// ==========================================================================
// FILTERING & SEARCHING
// ==========================================================================
function getFilteredUpdates() {
    const searchVal = currentFilters.search.toLowerCase().trim();
    const typeFilter = currentFilters.type.toLowerCase();
    
    return allReleases.filter(item => {
        // 1. Type category filter
        let matchesType = true;
        const itemType = item.type.toLowerCase();
        
        if (typeFilter !== 'all') {
            if (typeFilter === 'feature') {
                matchesType = itemType.includes('feature');
            } else if (typeFilter === 'change') {
                matchesType = itemType.includes('change');
            } else if (typeFilter === 'issue') {
                matchesType = itemType.includes('issue') || itemType.includes('fixed') || itemType.includes('bug');
            } else if (typeFilter === 'deprecation') {
                matchesType = itemType.includes('deprecat');
            } else {
                matchesType = itemType === typeFilter;
            }
        }
        
        // 2. Search keyword filter
        let matchesSearch = true;
        if (searchVal) {
            const inTitle = item.date.toLowerCase().includes(searchVal);
            const inType = item.type.toLowerCase().includes(searchVal);
            const inDesc = item.description_text.toLowerCase().includes(searchVal);
            matchesSearch = inTitle || inType || inDesc;
        }
        
        return matchesType && matchesSearch;
    });
}

function applyFiltersAndRender() {
    const filtered = getFilteredUpdates();
    renderCards(filtered);
}

// Export Filtered Updates to CSV
function exportToCSV() {
    const filtered = getFilteredUpdates();
    if (filtered.length === 0) {
        showToast('No updates to export!', 'error');
        return;
    }
    
    // CSV Header row
    const headers = ['ID', 'Date', 'Category', 'Description', 'Link'];
    
    // CSV Data rows
    const rows = filtered.map(item => {
        // Escape double quotes inside text fields
        const id = item.id;
        const date = `"${item.date.replace(/"/g, '""')}"`;
        const type = `"${item.type.replace(/"/g, '""')}"`;
        const desc = `"${item.description_text.replace(/\s+/g, ' ').replace(/"/g, '""')}"`;
        const link = `"${item.link.replace(/"/g, '""')}"`;
        return [id, date, type, desc, link];
    });
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_releases_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Successfully exported ${filtered.length} updates to CSV!`, 'success');
    } catch (err) {
        console.error('CSV Export Error:', err);
        showToast('Failed to export CSV. Please try again.', 'error');
    }
}

// Synchronize filters visual UI
function updateFilterUI(type) {
    currentFilters.type = type;
    
    // Update pills active state
    elements.filterPills.forEach(pill => {
        if (pill.dataset.type === type) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
    
    // Update stats cards active state
    elements.statCards.forEach(card => {
        if (card.dataset.filter === type) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
    
    applyFiltersAndRender();
}

// ==========================================================================
// RENDER CARDS
// ==========================================================================
function renderCards(updates) {
    elements.updatesGrid.innerHTML = '';
    
    if (updates.length === 0) {
        elements.updatesGrid.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    elements.updatesGrid.classList.remove('hidden');
    
    updates.forEach((item, index) => {
        const isSelected = selectedReleases.has(item.id);
        const card = document.createElement('div');
        card.className = `update-card ${isSelected ? 'selected' : ''}`;
        card.dataset.id = item.id;
        card.style.animationDelay = `${Math.min(index * 35, 350)}ms`;
        
        // Determine category badge class
        let badgeClass = 'badge-general';
        const typeLower = item.type.toLowerCase();
        if (typeLower.includes('feature')) badgeClass = 'badge-feature';
        else if (typeLower.includes('change')) badgeClass = 'badge-change';
        else if (typeLower.includes('issue') || typeLower.includes('fixed')) badgeClass = 'badge-issue';
        else if (typeLower.includes('deprecat')) badgeClass = 'badge-deprecation';
        
        const relativeDate = getRelativeDateString(item.date);
        const highlightedHtml = highlightText(item.description_html, currentFilters.search);
        
        card.innerHTML = `
            <div class="checkbox-column">
                <div class="custom-checkbox">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>
            <div class="card-main">
                <div class="card-header">
                    <div class="card-meta">
                        <span class="category-badge ${badgeClass}">${item.type}</span>
                        <span class="card-date" title="${relativeDate}">${item.date}</span>
                    </div>
                    <div class="card-actions-top">
                        <button class="card-action-btn copy-btn-card" title="Copy plain text to clipboard">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button class="card-action-btn tweet-btn-card" title="Tweet about this specific update">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="card-description">
                    ${highlightedHtml}
                </div>
                <div class="card-footer">
                    <a href="${item.link}" target="_blank" class="card-doc-link">
                        <span>Google Cloud Release Docs</span>
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                </div>
            </div>
        `;
        
        // Handle Card Clicks (Selection toggle)
        card.addEventListener('click', (e) => {
            // Prevent selection if user is clicking interactive elements inside the card
            if (e.target.closest('a') || e.target.closest('.card-action-btn') || e.target.tagName === 'CODE') {
                return;
            }
            
            toggleSelection(item.id);
        });
        
        // Handle Individual Copy Button click
        const copyBtn = card.querySelector('.copy-btn-card');
        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const textToCopy = `BigQuery ${item.type} (${item.date}):\n"${item.description_text}"\n\nRead more: ${item.link}`;
            try {
                await navigator.clipboard.writeText(textToCopy);
                showToast('Release note copied to clipboard!', 'success');
            } catch (err) {
                showToast('Failed to copy to clipboard.', 'error');
            }
        });
        
        // Handle Individual Tweet Button click
        const tweetBtn = card.querySelector('.tweet-btn-card');
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTweetModal([item]);
        });
        
        elements.updatesGrid.appendChild(card);
    });
}

// Selection Toggle
function toggleSelection(id) {
    if (selectedReleases.has(id)) {
        selectedReleases.delete(id);
    } else {
        selectedReleases.add(id);
    }
    
    // Update visual state of that specific card
    const cardEl = document.querySelector(`.update-card[data-id="${id}"]`);
    if (cardEl) {
        cardEl.classList.toggle('selected');
    }
    
    updateFloatingBar();
}

// Update Floating Action Bar state
function updateFloatingBar() {
    const count = selectedReleases.size;
    elements.selectedCountNum.textContent = count;
    
    if (count > 0) {
        elements.floatingBar.classList.add('visible');
    } else {
        elements.floatingBar.classList.remove('visible');
    }
}

// Clear all selections
function clearAllSelections() {
    selectedReleases.clear();
    // Update all card UI
    document.querySelectorAll('.update-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    updateFloatingBar();
    showToast('All selections cleared.', 'success');
}

// ==========================================================================
// TWEET CUSTOMIZER MODAL & PREVIEW
// ==========================================================================
function openTweetModal(updates = []) {
    if (updates.length === 0) {
        // Fetch selected objects
        const selectedIds = Array.from(selectedReleases);
        updates = allReleases.filter(r => selectedIds.includes(r.id));
    }
    
    if (updates.length === 0) {
        showToast('Please select at least one update to tweet!', 'error');
        return;
    }
    
    // Generate draft text
    let draftText = "";
    if (updates.length === 1) {
        const item = updates[0];
        let shortText = item.description_text;
        
        // Clean double spaces and linebreaks
        shortText = shortText.replace(/\s+/g, ' ').trim();
        
        // Limit text length to fit in a tweet
        if (shortText.length > 175) {
            shortText = shortText.substring(0, 172) + "...";
        }
        
        draftText = `🚀 BigQuery ${item.type} (${item.date}):\n\n"${shortText}"\n\nDetails: ${item.link}\n#BigQuery #GoogleCloud`;
    } else {
        // Multi-select format
        draftText = `📢 BigQuery Updates (${updates[0].date}):\n`;
        updates.forEach(item => {
            let itemDesc = item.description_text.replace(/\s+/g, ' ').trim();
            if (itemDesc.length > 70) {
                itemDesc = itemDesc.substring(0, 67) + "...";
            }
            draftText += `\n• ${item.type}: ${itemDesc}`;
        });
        
        // Use the link of the most recent item in the list
        draftText += `\n\nRead more: ${updates[0].link}\n#BigQuery #GoogleCloud`;
    }
    
    // Setup modal elements
    elements.tweetTextarea.value = draftText;
    updateTweetCharacterCount();
    
    // Show Modal
    elements.tweetModal.classList.remove('hidden');
    // Force a small layout trigger to make animation smooth
    setTimeout(() => {
        elements.tweetModal.classList.add('visible');
    }, 10);
}

function closeTweetModal() {
    elements.tweetModal.classList.remove('visible');
    setTimeout(() => {
        elements.tweetModal.classList.add('hidden');
    }, 250);
}

function updateTweetCharacterCount() {
    const text = elements.tweetTextarea.value;
    const length = text.length;
    elements.charCount.textContent = length;
    elements.tweetPreviewText.textContent = text;
    
    if (length > 280) {
        elements.charCount.classList.add('danger');
        elements.charCounterContainer.classList.add('danger');
        elements.charWarning.classList.remove('hidden');
    } else {
        elements.charCount.classList.remove('danger');
        elements.charCounterContainer.classList.remove('danger');
        elements.charWarning.classList.add('hidden');
    }
}

// Copy Tweet Text
async function copyTweetText() {
    const text = elements.tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        showToast('Tweet copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy text. Please select and copy manually.', 'error');
    }
}

// Publish Tweet via Twitter Web Intent
function publishTweet() {
    const text = elements.tweetTextarea.value;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('visible');
    }, 50);
    
    // Remove after duration
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// ==========================================================================
// THEME CONTROL (LIGHT/DARK MODE)
// ==========================================================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeToggle = elements.themeToggle;
    if (!themeToggle) return;
    
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    
    if (theme === 'light') {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    } else {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'success');
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
    // Refresh button
    elements.btnRefresh.addEventListener('click', () => {
        fetchReleases(true);
    });
    
    // Export CSV button
    elements.btnExport.addEventListener('click', () => {
        exportToCSV();
    });
    
    // Theme Toggle button
    elements.themeToggle.addEventListener('click', () => {
        toggleTheme();
    });
    
    // Search Box Input
    elements.searchInput.addEventListener('input', (e) => {
        currentFilters.search = e.target.value;
        if (currentFilters.search) {
            elements.clearSearch.style.display = 'block';
        } else {
            elements.clearSearch.style.display = 'none';
        }
        applyFiltersAndRender();
    });
    
    // Clear Search Button
    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        currentFilters.search = '';
        elements.clearSearch.style.display = 'none';
        applyFiltersAndRender();
        elements.searchInput.focus();
    });
    
    // Category filter pills
    elements.filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            updateFilterUI(pill.dataset.type);
        });
    });
    
    // Stats cards filter click
    elements.statCards.forEach(card => {
        card.addEventListener('click', () => {
            updateFilterUI(card.dataset.filter);
        });
    });
    
    // Retry buttons
    elements.btnRetry.addEventListener('click', () => fetchReleases(true));
    elements.btnResetFilters.addEventListener('click', () => {
        elements.searchInput.value = '';
        currentFilters.search = '';
        elements.clearSearch.style.display = 'none';
        updateFilterUI('all');
    });
    
    // Floating bar actions
    elements.btnClearSelection.addEventListener('click', clearAllSelections);
    elements.btnTweetSelected.addEventListener('click', () => openTweetModal());
    
    // Modal events
    elements.btnCloseModal.addEventListener('click', closeTweetModal);
    elements.tweetTextarea.addEventListener('input', updateTweetCharacterCount);
    elements.btnCopyTweet.addEventListener('click', copyTweetText);
    elements.btnPublishTweet.addEventListener('click', publishTweet);
    
    // Close modal if clicking outside the card
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });

    // Scroll to Top Button Behaviors
    const btnScrollTop = document.getElementById('btn-scroll-top');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btnScrollTop.classList.add('visible');
        } else {
            btnScrollTop.classList.remove('visible');
        }
    });
    btnScrollTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Power-User Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Esc in search clears it and blurs
            if (e.key === 'Escape' && e.target === elements.searchInput) {
                elements.searchInput.value = '';
                currentFilters.search = '';
                elements.clearSearch.style.display = 'none';
                applyFiltersAndRender();
                elements.searchInput.blur();
            }
            // Esc in tweet textarea closes modal
            if (e.key === 'Escape' && e.target === elements.tweetTextarea) {
                closeTweetModal();
            }
            return;
        }
        
        // Press '/' to search
        if (e.key === '/') {
            e.preventDefault();
            elements.searchInput.focus();
            elements.searchInput.select();
        }
        
        // Press 'Escape' to clear selections/filters or close modals
        if (e.key === 'Escape') {
            if (elements.tweetModal.classList.contains('visible')) {
                closeTweetModal();
            } else if (selectedReleases.size > 0) {
                clearAllSelections();
            } else if (currentFilters.search || currentFilters.type !== 'all') {
                elements.searchInput.value = '';
                currentFilters.search = '';
                elements.clearSearch.style.display = 'none';
                updateFilterUI('all');
            }
        }
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleases(false);
});

// ==========================================================================
// UX HELPERS (TEXT HIGHLIGHTING & RELATIVE DATES)
// ==========================================================================
function highlightText(html, search) {
    if (!search) return html;
    const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearch})(?![^<>]*>)`, 'gi');
    return html.replace(regex, '<mark class="highlight">$1</mark>');
}

function getRelativeDateString(dateStr) {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        
        date.setHours(0,0,0,0);
        now.setHours(0,0,0,0);
        
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffDays < 0) return 'In the future';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }
        
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } catch (e) {
        return '';
    }
}
