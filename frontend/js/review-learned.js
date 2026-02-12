/**
 * Review Learned Words Page
 * Handles the display and management of learned words
 */
import { apiFetch } from './api.js';
import { checkAuth } from './auth.js';
import { showError, showAlert, showSuccess } from './modal.js';
import { createAudioButton } from './audio.js';
import './nav.js';

// State management
let currentPage = 1;
let totalPages = 1;
let totalWords = 0;
let currentWords = [];
let selectedWords = new Set();
let currentFilters = {
    search: '',
    type: 'all',
    mastery: 'all',
    sortBy: 'createdAt',
    sortOrder: 'DESC'
};

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const isAuth = await checkAuth();
        if (!isAuth) {
            window.location.href = 'index.html';
            return;
        }

        initializePage();
        setupEventListeners();
        await loadLearnedWords();
    } catch (error) {
        console.error('Failed to initialize review learned words page:', error);

        const wordsGrid = document.getElementById('wordsGrid');
        if (wordsGrid) {
            wordsGrid.innerHTML = `
                <div class="loading-message" style="color: #ffcccb;">
                    Failed to initialize page. Error: ${error.message}
                    <br><a href="index.html">Go back to login</a>
                </div>
            `;
        }
    }
});

function initializePage() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');

    searchInput.addEventListener('input', debounce(handleSearch, 300));
    clearSearchBtn.addEventListener('click', clearSearchField);

    const typeFilter = document.getElementById('typeFilter');
    const masteryFilter = document.getElementById('masteryFilter');
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');

    typeFilter.addEventListener('change', handleFilterChange);
    masteryFilter.addEventListener('change', handleFilterChange);
    sortBy.addEventListener('change', handleFilterChange);
    sortOrder.addEventListener('click', toggleSortOrder);
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const clearBtn = document.getElementById('clearSearch');
        clearBtn.style.display = this.value ? 'block' : 'none';
    });
}

async function loadLearnedWords(page = 1) {
    try {
        const wordsGrid = document.getElementById('wordsGrid');
        const paginationContainer = document.getElementById('paginationContainer');
        const noWordsMessage = document.getElementById('noWordsMessage');

        wordsGrid.innerHTML = '<div class="loading-message">Loading your learned words...</div>';
        paginationContainer.style.display = 'none';
        noWordsMessage.classList.add('hidden');

        const params = new URLSearchParams({
            page: page,
            limit: 12,
            sortBy: currentFilters.sortBy,
            sortOrder: currentFilters.sortOrder,
            filterBy: currentFilters.type
        });

        const response = await apiFetch(`/api/progress/learned-words?${params}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch learned words: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load learned words');
        }

        currentWords = data.words;
        totalWords = data.totalCount;
        currentPage = page;
        totalPages = Math.ceil(totalWords / 12);

        let filteredWords = currentWords;
        if (currentFilters.search) {
            filteredWords = currentWords.filter(item =>
                item.word.swedish.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
                item.word.english.toLowerCase().includes(currentFilters.search.toLowerCase())
            );
        }

        if (currentFilters.mastery !== 'all') {
            filteredWords = filteredWords.filter(item =>
                item.progress.masteryLevel === currentFilters.mastery
            );
        }

        updateStats();
        displayWords(filteredWords);
        updatePagination();
        clearSelectedWords();

    } catch (error) {
        console.error('Error loading learned words:', error);
        showError('Failed to load learned words. Please try again.');

        const wordsGrid = document.getElementById('wordsGrid');
        wordsGrid.innerHTML = `
            <div class="loading-message" style="color: #ffcccb;">
                Failed to load words. Error: ${error.message}
                <br>Check browser console for details.
            </div>
        `;
    }
}

function displayWords(words) {
    const wordsGrid = document.getElementById('wordsGrid');
    const noWordsMessage = document.getElementById('noWordsMessage');

    if (!words || words.length === 0) {
        wordsGrid.innerHTML = '';
        noWordsMessage.classList.remove('hidden');
        return;
    }

    noWordsMessage.classList.add('hidden');

    const wordsHTML = words.map((item) => {
        const word = item.word;
        const progress = item.progress;

        return `
            <div class="word-card" data-word-id="${item.wordId}" onclick="toggleWordSelection(${item.wordId})">
                <input type="checkbox" class="card-checkbox" data-word-id="${item.wordId}"
                       onchange="handleWordSelection(${item.wordId}, this.checked)">

                <div class="word-header">
                    <div class="swedish-word">${escapeHtml(word.swedish)}${word.audioUrl ? `<span class="audio-placeholder" data-audio-url="${escapeHtml(word.audioUrl)}"></span>` : ''}</div>
                    <div class="english-word">${escapeHtml(word.english)}</div>
                    <span class="word-type-badge">${word.type}</span>
                </div>

                ${word.example ? `
                <div class="word-details">
                    <div class="example-sentence">"${escapeHtml(word.example)}"</div>
                </div>
                ` : ''}

                <div class="progress-stats">
                    <div class="progress-item">
                        <div class="progress-label">Success Rate</div>
                        <div class="progress-value">${progress.successRate}%</div>
                    </div>
                    <div class="progress-item">
                        <div class="progress-label">Attempts</div>
                        <div class="progress-value">${progress.totalAttempts}</div>
                    </div>
                </div>

                <div class="mastery-badge ${progress.masteryLevel}">
                    ${progress.masteryLevel === 'mastered' ? 'Mastered' :
                      progress.masteryLevel === 'practicing' ? 'Practicing' :
                      'Seen'}
                </div>
            </div>
        `;
    }).join('');

    wordsGrid.innerHTML = wordsHTML;

    // Replace audio placeholders with actual audio buttons
    wordsGrid.querySelectorAll('.audio-placeholder').forEach(placeholder => {
        const audioUrl = placeholder.dataset.audioUrl;
        const audioBtn = createAudioButton(audioUrl);
        if (audioBtn) {
            placeholder.replaceWith(audioBtn);
        } else {
            placeholder.remove();
        }
    });
}

function updateStats() {
    const totalLearned = document.getElementById('totalLearned');
    const masteredCount = document.getElementById('masteredCount');
    const practicingCount = document.getElementById('practicingCount');

    const mastered = currentWords.filter(w => w.progress.masteryLevel === 'mastered').length;
    const practicing = currentWords.filter(w => w.progress.masteryLevel === 'practicing').length;
    const shown = currentWords.filter(w => w.progress.masteryLevel === 'shown').length;

    if (totalLearned) totalLearned.textContent = totalWords;
    if (masteredCount) masteredCount.textContent = mastered;
    if (practicingCount) practicingCount.textContent = practicing + shown;
}

function updatePagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    const totalInfo = document.getElementById('totalInfo');

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    totalInfo.textContent = `(${totalWords} words total)`;
}

function handleSearch(event) {
    currentFilters.search = event.target.value.trim();
    currentPage = 1;
    loadLearnedWords(1);
}

function clearSearchField() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');

    searchInput.value = '';
    clearBtn.style.display = 'none';
    currentFilters.search = '';
    currentPage = 1;
    loadLearnedWords(1);
}

function handleFilterChange(event) {
    const { id, value } = event.target;

    switch(id) {
        case 'typeFilter':
            currentFilters.type = value;
            break;
        case 'masteryFilter':
            currentFilters.mastery = value;
            break;
        case 'sortBy':
            currentFilters.sortBy = value;
            break;
    }

    currentPage = 1;
    loadLearnedWords(1);
}

function toggleSortOrder() {
    const btn = document.getElementById('sortOrder');
    currentFilters.sortOrder = currentFilters.sortOrder === 'DESC' ? 'ASC' : 'DESC';

    btn.textContent = currentFilters.sortOrder === 'ASC' ? '' : '';
    btn.classList.toggle('asc', currentFilters.sortOrder === 'ASC');

    currentPage = 1;
    loadLearnedWords(1);
}

function handleWordSelection(wordId, isSelected) {
    if (isSelected) {
        selectedWords.add(wordId);
    } else {
        selectedWords.delete(wordId);
    }

    updateWordCardSelection(wordId, isSelected);
    updatePracticeButton();
}

function toggleWordSelection(wordId) {
    const checkbox = document.querySelector(`input[data-word-id="${wordId}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        handleWordSelection(wordId, checkbox.checked);
    }
}

function updateWordCardSelection(wordId, isSelected) {
    const card = document.querySelector(`[data-word-id="${wordId}"]`);
    if (card) {
        card.classList.toggle('selected', isSelected);
    }
}

function clearSelectedWords() {
    selectedWords.clear();
    document.querySelectorAll('.card-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.word-card').forEach(card => card.classList.remove('selected'));
    updatePracticeButton();
}

function updatePracticeButton() {
    const practiceBtn = document.querySelector('.practice-btn');
    if (!practiceBtn) return;
    practiceBtn.disabled = selectedWords.size === 0;
    practiceBtn.textContent = selectedWords.size > 0
        ? `Practice Selected (${selectedWords.size})`
        : 'Practice Selected';
}

function practiceSelectedWords() {
    if (selectedWords.size === 0) {
        showAlert('Please select at least one word to practice.', 'Selection Required');
        return;
    }

    const selectedWordData = currentWords
        .filter(item => selectedWords.has(item.wordId))
        .map(item => item.word.swedish);

    sessionStorage.setItem('practiceWords', JSON.stringify(selectedWordData));
    sessionStorage.setItem('practiceMode', 'review-learned');

    window.location.href = 'flashcards.html';
}

function exportWords() {
    if (currentWords.length === 0) {
        showAlert('No words to export.', 'Export');
        return;
    }

    let exportText = 'Learned Swedish Words\n';
    exportText += '=====================\n\n';

    currentWords.forEach((item, index) => {
        const word = item.word;
        const progress = item.progress;

        exportText += `${index + 1}. ${word.swedish} - ${word.english}\n`;
        exportText += `   Type: ${word.type}\n`;
        exportText += `   Mastery: ${progress.masteryLevel}\n`;
        exportText += `   Success Rate: ${progress.successRate}%\n`;
        if (word.example) {
            exportText += `   Example: ${word.example}\n`;
        }
        exportText += '\n';
    });

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swedish-learned-words-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccess('Word list exported successfully!');
}

function previousPage() {
    if (currentPage > 1) {
        loadLearnedWords(currentPage - 1);
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        loadLearnedWords(currentPage + 1);
    }
}

function goBackToDashboard() {
    window.location.href = 'dashboard.html';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global functions for HTML onclick handlers
window.toggleWordSelection = toggleWordSelection;
window.handleWordSelection = handleWordSelection;
window.practiceSelectedWords = practiceSelectedWords;
window.exportWords = exportWords;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.goBackToDashboard = goBackToDashboard;
