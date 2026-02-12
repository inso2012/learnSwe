// Words page module
import { apiFetch } from './api.js';
import { verifyToken } from './auth.js';
import { createAudioButton, playAudio } from './audio.js';
import './nav.js';

let currentPage = 1;
let pageSize = 20;
let totalWords = 0;
let words = [];
let currentSort = 'swedish-asc';

document.addEventListener('DOMContentLoaded', async () => {
    if (await verifyToken()) {
        setupEventListeners();
        await loadWords();
    }
});

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

async function loadWords() {
    try {
        const response = await apiFetch(`/api/words?page=${currentPage}&limit=${pageSize}`);

        if (!response.ok) {
            throw new Error('Failed to fetch words');
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
            words = data.data;
            totalWords = data.data.length;
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
        const swedishCell = document.createElement('td');
        swedishCell.textContent = word.swedish || '-';
        if (word.audioUrl) {
            const audioBtn = createAudioButton(word.audioUrl);
            if (audioBtn) {
                audioBtn.style.marginLeft = '6px';
                swedishCell.appendChild(audioBtn);
            }
        }
        row.appendChild(swedishCell);

        const remainingCells = document.createElement('template');
        remainingCells.innerHTML = `
            <td>${word.english || '-'}</td>
            <td>${word.type || '-'}</td>
            <td>${word.example || '-'}</td>
            <td>
                <button class="add-example-btn" data-word-id="${word.id || ''}">
                    Add Example
                </button>
            </td>
        `;
        row.appendChild(remainingCells.content);
        tableBody.appendChild(row);
    });
}

function updatePagination() {
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageNumbersDiv = document.getElementById('pageNumbers');

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage * pageSize >= totalWords;

    const totalPages = Math.ceil(totalWords / pageSize);
    pageNumbersDiv.innerHTML = '';

    addPageNumber(1);

    if (currentPage > 3) {
        addEllipsis();
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        addPageNumber(i);
    }

    if (currentPage < totalPages - 2) {
        addEllipsis();
    }

    if (totalPages > 1) {
        addPageNumber(totalPages);
    }
}

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

function addEllipsis() {
    const pageNumbersDiv = document.getElementById('pageNumbers');
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-ellipsis';
    ellipsis.textContent = '...';
    pageNumbersDiv.appendChild(ellipsis);
}

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
