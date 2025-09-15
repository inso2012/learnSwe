/**
 * Review Learned Words Page JavaScript
 * Handles the display and management of learned words
 */

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
        console.log('Review learned words page loaded');
        
        // Verify authentication
        const isAuth = await checkAuth();
        console.log('Authentication check result:', isAuth);
        
        if (!isAuth) {
            console.log('Not authenticated, redirecting to index');
            window.location.href = 'index.html';
            return;
        }
        
        // Initialize the page
        console.log('Initializing page...');
        await initializePage();
        setupEventListeners();
        await loadLearnedWords();
    } catch (error) {
        console.error('Failed to initialize review learned words page:', error);
        console.error('Error details:', error.stack);
        
        // Don't redirect immediately, show error on page
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

/**
 * Initialize page elements and event listeners
 */
function initializePage() {
    // Initialize search functionality
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    clearSearch.addEventListener('click', clearSearch);
    
    // Initialize filter controls
    const typeFilter = document.getElementById('typeFilter');
    const masteryFilter = document.getElementById('masteryFilter');
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');
    
    typeFilter.addEventListener('change', handleFilterChange);
    masteryFilter.addEventListener('change', handleFilterChange);
    sortBy.addEventListener('change', handleFilterChange);
    sortOrder.addEventListener('click', toggleSortOrder);
}

/**
 * Setup additional event listeners
 */
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const clearBtn = document.getElementById('clearSearch');
        clearBtn.style.display = this.value ? 'block' : 'none';
    });
}

/**
 * Load learned words from the API
 */
async function loadLearnedWords(page = 1) {
    try {
        const wordsGrid = document.getElementById('wordsGrid');
        const paginationContainer = document.getElementById('paginationContainer');
        const noWordsMessage = document.getElementById('noWordsMessage');
        
        // Show loading state
        wordsGrid.innerHTML = '<div class="loading-message">Loading your learned words...</div>';
        paginationContainer.style.display = 'none';
        noWordsMessage.classList.add('hidden');
        
        // Build query parameters
        const params = new URLSearchParams({
            page: page,
            limit: 12,
            sortBy: currentFilters.sortBy,
            sortOrder: currentFilters.sortOrder,
            filterBy: currentFilters.type
        });
        
        const token = localStorage.getItem('swedishLearningToken');
        console.log('Token exists:', !!token);
        console.log('API URL:', `/api/progress/learned-words?${params}`);
        
        const response = await fetch(`/api/progress/learned-words?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`Failed to fetch learned words: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        
        console.log('API Response data:', data);
        console.log('Data success:', data.success);
        console.log('Data words count:', data.words?.length || 0);
        console.log('Data total count:', data.totalCount);
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to load learned words');
        }
        
        currentWords = data.words;
        totalWords = data.totalCount;
        currentPage = page;
        totalPages = Math.ceil(totalWords / 12);
        
        console.log('Set currentWords:', currentWords?.length || 0);
        console.log('Set totalWords:', totalWords);
        
        // Apply client-side search filter if active
        let filteredWords = currentWords;
        if (currentFilters.search) {
            filteredWords = currentWords.filter(item => 
                item.word.swedish.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
                item.word.english.toLowerCase().includes(currentFilters.search.toLowerCase())
            );
        }
        
        // Apply mastery filter
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
        console.error('Error stack:', error.stack);
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

/**
 * Display words in the grid
 */
function displayWords(words) {
    const wordsGrid = document.getElementById('wordsGrid');
    const noWordsMessage = document.getElementById('noWordsMessage');
    
    if (!words || words.length === 0) {
        wordsGrid.innerHTML = '';
        noWordsMessage.classList.remove('hidden');
        return;
    }
    
    noWordsMessage.classList.add('hidden');
    
    const wordsHTML = words.map((item, index) => {
        const word = item.word;
        const progress = item.progress;
        
        return `
            <div class="word-card" data-word-id="${item.wordId}" onclick="toggleWordSelection(${item.wordId})">
                <input type="checkbox" class="card-checkbox" data-word-id="${item.wordId}" 
                       onchange="handleWordSelection(${item.wordId}, this.checked)">
                
                <div class="word-header">
                    <div class="swedish-word">${escapeHtml(word.swedish)}</div>
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
                    ${progress.masteryLevel === 'mastered' ? '🏆 Mastered' : 
                      progress.masteryLevel === 'practicing' ? '📚 Practicing' : 
                      '👀 Seen'}
                </div>
            </div>
        `;
    }).join('');
    
    wordsGrid.innerHTML = wordsHTML;
}

/**
 * Update statistics display
 */
function updateStats() {
    const totalLearned = document.getElementById('totalLearned');
    const masteredCount = document.getElementById('masteredCount');
    const practicingCount = document.getElementById('practicingCount');
    
    const mastered = currentWords.filter(w => w.progress.masteryLevel === 'mastered').length;
    const practicing = currentWords.filter(w => w.progress.masteryLevel === 'practicing').length;
    const shown = currentWords.filter(w => w.progress.masteryLevel === 'shown').length;
    
    if (totalLearned) totalLearned.textContent = totalWords;
    if (masteredCount) masteredCount.textContent = mastered;
    // Show practicing + shown as "In Progress"
    if (practicingCount) practicingCount.textContent = practicing + shown;
}

/**
 * Update pagination controls
 */
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

/**
 * Handle search input
 */
function handleSearch(event) {
    currentFilters.search = event.target.value.trim();
    currentPage = 1;
    loadLearnedWords(1);
}

/**
 * Clear search
 */
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    currentFilters.search = '';
    currentPage = 1;
    loadLearnedWords(1);
}

/**
 * Handle filter changes
 */
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

/**
 * Toggle sort order
 */
function toggleSortOrder() {
    const btn = document.getElementById('sortOrder');
    currentFilters.sortOrder = currentFilters.sortOrder === 'DESC' ? 'ASC' : 'DESC';
    
    btn.textContent = currentFilters.sortOrder === 'ASC' ? '↑' : '↓';
    btn.classList.toggle('asc', currentFilters.sortOrder === 'ASC');
    
    currentPage = 1;
    loadLearnedWords(1);
}

/**
 * Handle word selection
 */
function handleWordSelection(wordId, isSelected) {
    if (isSelected) {
        selectedWords.add(wordId);
    } else {
        selectedWords.delete(wordId);
    }
    
    updateWordCardSelection(wordId, isSelected);
    updatePracticeButton();
}

/**
 * Toggle word selection when clicking card
 */
function toggleWordSelection(wordId) {
    const checkbox = document.querySelector(`input[data-word-id="${wordId}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        handleWordSelection(wordId, checkbox.checked);
    }
}

/**
 * Update visual selection state of word card
 */
function updateWordCardSelection(wordId, isSelected) {
    const card = document.querySelector(`[data-word-id="${wordId}"]`);
    if (card) {
        card.classList.toggle('selected', isSelected);
    }
}

/**
 * Clear all selected words
 */
function clearSelectedWords() {
    selectedWords.clear();
    document.querySelectorAll('.card-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.word-card').forEach(card => card.classList.remove('selected'));
    updatePracticeButton();
}

/**
 * Update practice button state
 */
function updatePracticeButton() {
    const practiceBtn = document.querySelector('.practice-btn');
    practiceBtn.disabled = selectedWords.size === 0;
    practiceBtn.textContent = selectedWords.size > 0 
        ? `📚 Practice Selected (${selectedWords.size})`
        : '📚 Practice Selected';
}

/**
 * Practice selected words
 */
function practiceSelectedWords() {
    if (selectedWords.size === 0) {
        showAlert('Please select at least one word to practice.', 'Selection Required');
        return;
    }
    
    // Get selected word data
    const selectedWordData = currentWords
        .filter(item => selectedWords.has(item.wordId))
        .map(item => item.word.swedish);
    
    // Store selected words for the flashcards page
    sessionStorage.setItem('practiceWords', JSON.stringify(selectedWordData));
    sessionStorage.setItem('practiceMode', 'review-learned');
    
    // Redirect to flashcards page
    window.location.href = 'flashcards.html';
}

/**
 * Export words to text file
 */
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
    
    // Create and download file
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

/**
 * Pagination functions
 */
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

/**
 * Debug function to check what's in the database
 */
async function debugDatabase() {
    try {
        const token = localStorage.getItem('swedishLearningToken');
        
        // Try to get user stats first
        console.log('=== DEBUGGING DATABASE ===');
        
        const statsResponse = await fetch('/api/progress/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            console.log('User stats from API:', statsData);
        }
        
        // Try to get all progress records (we'll add a debug endpoint)
        const debugResponse = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (debugResponse.ok) {
            const userData = await debugResponse.json();
            console.log('User profile data:', userData);
            console.log('User ID:', userData.data?.id);
            
            // Provide repair instructions
            const userId = userData.data?.id;
            if (userId) {
                console.log(`To repair your data, go to: http://localhost:3000/api/progress/repair-data/${userId}`);
            }
        }
        
        alert('Debug information logged to console. Check browser dev tools for repair URL.');
        
    } catch (error) {
        console.error('Debug error:', error);
        alert('Debug failed: ' + error.message);
    }
}

/**
 * Navigate back to dashboard
 */
function goBackToDashboard() {
    window.location.href = 'dashboard.html';
}

/**
 * Utility function for debouncing
 */
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

/**
 * HTML escape function for security
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}