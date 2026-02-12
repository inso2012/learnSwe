/**
 * Review Mistakes Page
 * Handles the display and management of words that users got wrong
 */
import { checkAuth } from './auth.js';
import { showAlert, showConfirm } from './modal.js';
import './nav.js';

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const isAuth = await checkAuth();
        if (!isAuth) return;

        await loadMistakes();
    } catch (error) {
        console.error('Failed to initialize review mistakes page:', error);
        window.location.href = 'index.html';
    }
});

async function loadMistakes() {
    try {
        const mistakes = getMistakesFromStorage();
        displayMistakes(mistakes);
        updateMistakesStats(mistakes);
    } catch (error) {
        console.error('Failed to load mistakes:', error);
        showNotification('Failed to load mistakes. Please try again.', 'error');
    }
}

function getMistakesFromStorage() {
    try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) return [];

        const saved = localStorage.getItem(`swedishLearningMistakes_${userEmail}`);
        if (!saved) return [];

        const mistakeStrings = JSON.parse(saved);
        const mistakes = [];

        mistakeStrings.forEach(mistakeJson => {
            try {
                const mistake = JSON.parse(mistakeJson);
                if (mistake.swedish && mistake.english) {
                    mistakes.push({
                        swedish: mistake.swedish,
                        english: mistake.english,
                        type: mistake.type || 'noun',
                        difficulty: mistake.difficulty || 'medium'
                    });
                }
            } catch (parseError) {
                console.warn('Invalid mistake format:', mistakeJson);
            }
        });

        const uniqueMistakes = mistakes.filter((mistake, index, self) =>
            index === self.findIndex(m => m.swedish === mistake.swedish)
        );

        return uniqueMistakes;
    } catch (error) {
        console.error('Error getting mistakes from storage:', error);
        return [];
    }
}

function displayMistakes(mistakes) {
    const mistakesList = document.getElementById('mistakesList');
    const noMistakesMessage = document.getElementById('noMistakesMessage');

    if (!mistakes || mistakes.length === 0) {
        mistakesList.innerHTML = '';
        noMistakesMessage.classList.remove('hidden');
        return;
    }

    noMistakesMessage.classList.add('hidden');

    const mistakesHTML = mistakes.map((mistake, index) => `
        <div class="mistake-item">
            <input type="checkbox" id="mistake_${index}" class="mistake-checkbox"
                   data-swedish="${mistake.swedish}" onchange="updateSelectAllState()">
            <div class="mistake-word">
                <div>
                    <div class="swedish-word">${mistake.swedish}</div>
                    <span class="word-type">${mistake.type}</span>
                </div>
                <div class="english-word">${mistake.english}</div>
            </div>
        </div>
    `).join('');

    mistakesList.innerHTML = mistakesHTML;

    updateSelectAllState();
}

function updateMistakesStats(mistakes) {
    const totalMistakes = document.getElementById('totalMistakes');
    const wordsToReview = document.getElementById('wordsToReview');

    if (totalMistakes) {
        totalMistakes.textContent = mistakes.length;
    }

    if (wordsToReview) {
        wordsToReview.textContent = mistakes.length;
    }
}

function clearAllMistakes() {
    showConfirm(
        'Are you sure you want to clear all mistakes? This action cannot be undone.',
        'Clear All Mistakes'
    ).then(confirmed => {
        if (confirmed) {
            try {
                const userEmail = localStorage.getItem('userEmail');
                if (userEmail) {
                    localStorage.removeItem(`swedishLearningMistakes_${userEmail}`);
                }
                loadMistakes();
                showNotification('All mistakes have been cleared!', 'success');
            } catch (error) {
                console.error('Failed to clear mistakes:', error);
                showNotification('Failed to clear mistakes. Please try again.', 'error');
            }
        }
    });
}

function practiceSelectedMistakes() {
    const selectedCheckboxes = document.querySelectorAll('.mistake-checkbox:checked');

    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one word to practice.', 'Selection Required');
        return;
    }

    const selectedWords = Array.from(selectedCheckboxes).map(cb => cb.dataset.swedish);

    sessionStorage.setItem('practiceWords', JSON.stringify(selectedWords));
    sessionStorage.setItem('practiceMode', 'mistakes');

    window.location.href = 'flashcards.html';
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const mistakeCheckboxes = document.querySelectorAll('.mistake-checkbox');

    if (!selectAllCheckbox) return;

    const shouldSelectAll = selectAllCheckbox.checked;

    mistakeCheckboxes.forEach(checkbox => {
        checkbox.checked = shouldSelectAll;
    });

    updateSelectAllState();
}

function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const mistakeCheckboxes = document.querySelectorAll('.mistake-checkbox');

    if (!selectAllCheckbox || mistakeCheckboxes.length === 0) return;

    const checkedCount = document.querySelectorAll('.mistake-checkbox:checked').length;
    const totalCount = mistakeCheckboxes.length;

    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === totalCount) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

function goBackToDashboard() {
    window.location.href = 'dashboard.html';
}

// Floating notification for this page (different from modal-based notifications)
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        z-index: 1000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Global functions for HTML onclick handlers
window.clearAllMistakes = clearAllMistakes;
window.practiceSelectedMistakes = practiceSelectedMistakes;
window.toggleSelectAll = toggleSelectAll;
window.updateSelectAllState = updateSelectAllState;
window.goBackToDashboard = goBackToDashboard;
