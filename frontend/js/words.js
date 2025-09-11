// Words page script
let currentPage = 1;
let pageSize = 20;
let totalWords = 0;
let words = [];
let currentSort = 'swedish-asc'; // Default sort

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (await window.auth.verifyToken()) {
        setupEventListeners();
        await loadWords();
    }
});

// Set up event listeners
function setupEventListeners() {
    const pageSizeSelect = document.getElementById('pageSize');
    const sortBySelect = document.getElementById('sortBy');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');

    pageSizeSelect.addEventListener('change', async (e) => {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        await loadWords();
    });

    sortBySelect.addEventListener('change', async (e) => {
        currentSort = e.target.value;
        currentPage = 1;
        await loadWords();
    });

    prevPageBtn.addEventListener('click', async () => {
        if (currentPage > 1) {
            currentPage--;
            await loadWords();
        }
    });

    nextPageBtn.addEventListener('click', async () => {
        if (currentPage * pageSize < totalWords) {
            currentPage++;
            await loadWords();
        }
    });
}

// Load words from the server
async function loadWords() {
    try {
        const token = localStorage.getItem('swedishLearningToken');
        const response = await fetch(`/api/words?page=${currentPage}&limit=${pageSize}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch words');
        }

        const data = await response.json();
        console.log('API Response:', data); // Debug log

        // Handle backend response structure
        if (data.success && Array.isArray(data.data)) {
            words = data.data;
            totalWords = data.data.length;
            
            // Sort words based on current sort selection
            sortWords();
        } else {
            words = [];
            totalWords = 0;
        }
        
        updateTable();
        updatePagination();
        updateDisplayRange();
    } catch (error) {
        console.error('Error loading words:', error);
        words = [];
        totalWords = 0;
        updateTable();
        updatePagination();
        updateDisplayRange();
    }
}

// Update table with current page of words
function updateTable() {
    const tableBody = document.getElementById('wordsTableBody');
    tableBody.innerHTML = '';

    if (!Array.isArray(words) || words.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" style="text-align: center; padding: 2rem;">
                No words available
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }

    words.forEach(word => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${word.swedish || '-'}</td>
            <td>${word.english || '-'}</td>
            <td>${word.type || '-'}</td>
            <td>${word.example || '-'}</td>
            <td>
                <button class="add-example-btn" data-word-id="${word.id || ''}">
                    Add Example
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners for Add Example buttons
    document.querySelectorAll('.add-example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const wordId = btn.dataset.wordId;
            // TODO: Implement add example functionality
        });
    });
}

// Update pagination controls
function updatePagination() {
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageNumbersDiv = document.getElementById('pageNumbers');

    // Enable/disable previous/next buttons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage * pageSize >= totalWords;

    // Update page numbers
    const totalPages = Math.ceil(totalWords / pageSize);
    pageNumbersDiv.innerHTML = '';

    // Always show first page
    addPageNumber(1);

    if (currentPage > 3) {
        addEllipsis();
    }

    // Show pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        addPageNumber(i);
    }

    if (currentPage < totalPages - 2) {
        addEllipsis();
    }

    // Always show last page if there is more than one page
    if (totalPages > 1) {
        addPageNumber(totalPages);
    }
}

// Add a page number button
function addPageNumber(pageNum) {
    const pageNumbersDiv = document.getElementById('pageNumbers');
    const pageButton = document.createElement('button');
    pageButton.className = `page-number ${pageNum === currentPage ? 'active' : ''}`;
    pageButton.textContent = pageNum;
    pageButton.addEventListener('click', async () => {
        if (pageNum !== currentPage) {
            currentPage = pageNum;
            await loadWords();
        }
    });
    pageNumbersDiv.appendChild(pageButton);
}

// Add ellipsis between page numbers
function addEllipsis() {
    const pageNumbersDiv = document.getElementById('pageNumbers');
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-ellipsis';
    ellipsis.textContent = '...';
    pageNumbersDiv.appendChild(ellipsis);
}

// Sort words based on current sort selection
function sortWords() {
    const [field, direction] = currentSort.split('-');
    
    words.sort((a, b) => {
        let aVal = (a[field] || '').toLowerCase();
        let bVal = (b[field] || '').toLowerCase();
        
        if (direction === 'asc') {
            return aVal.localeCompare(bVal, 'sv');
        } else {
            return bVal.localeCompare(aVal, 'sv');
        }
    });
}

// Update the display range text
function updateDisplayRange() {
    const startRange = document.getElementById('startRange');
    const endRange = document.getElementById('endRange');
    const totalWordsSpan = document.getElementById('totalWords');

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalWords);

    startRange.textContent = totalWords > 0 ? start : 0;
    endRange.textContent = end;
    totalWordsSpan.textContent = totalWords;
}
