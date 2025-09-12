/**
 * Review Mistakes Page JavaScript
 * Handles the display and management of words that users got wrong
 */

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Verify authentication
        const isAuth = await checkAuth();
        if (!isAuth) return;
        
        // Initialize the page
        await loadMistakes();
    } catch (error) {
        console.error('Failed to initialize review mistakes page:', error);
        window.location.href = 'index.html';
    }
});

/**
 * Load and display all mistakes from localStorage
 */
async function loadMistakes() {
    try {
        const mistakes = getMistakesFromStorage();
        displayMistakes(mistakes);
        updateMistakesStats(mistakes);
    } catch (error) {
        console.error('Failed to load mistakes:', error);
        showError('Failed to load mistakes. Please try again.');
    }
}

/**
 * Get mistakes from localStorage
 * @returns {Array} Array of mistake objects
 */
function getMistakesFromStorage() {
    try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) return [];
        
        const saved = localStorage.getItem(`swedishLearningMistakes_${userEmail}`);
        if (!saved) return [];
        
        const mistakeStrings = JSON.parse(saved);
        const mistakes = [];
        
        // Convert stored strings back to objects
        mistakeStrings.forEach(mistakeJson => {
            try {
                const mistake = JSON.parse(mistakeJson);
                // Ensure we have the required fields
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
        
        // Remove duplicates based on swedish word
        const uniqueMistakes = mistakes.filter((mistake, index, self) => 
            index === self.findIndex(m => m.swedish === mistake.swedish)
        );
        
        return uniqueMistakes;
    } catch (error) {
        console.error('Error getting mistakes from storage:', error);
        return [];
    }
}

/**
 * Display mistakes in the UI
 * @param {Array} mistakes - Array of mistake objects
 */
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
    
    // Initialize the select all checkbox state
    updateSelectAllState();
}

/**
 * Update the statistics display
 * @param {Array} mistakes - Array of mistake objects
 */
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

/**
 * Clear all mistakes from storage
 */
function clearAllMistakes() {
    if (confirm('Are you sure you want to clear all mistakes? This action cannot be undone.')) {
        try {
            const userEmail = localStorage.getItem('userEmail');
            if (userEmail) {
                localStorage.removeItem(`swedishLearningMistakes_${userEmail}`);
            }
            loadMistakes(); // Reload to show empty state
            showSuccess('All mistakes have been cleared!');
        } catch (error) {
            console.error('Failed to clear mistakes:', error);
            showError('Failed to clear mistakes. Please try again.');
        }
    }
}

/**
 * Practice selected mistakes (redirect to flashcards with selected words)
 */
function practiceSelectedMistakes() {
    const selectedCheckboxes = document.querySelectorAll('.mistake-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('Please select at least one word to practice.', 'Selection Required');
        return;
    }
    
    // Get selected words
    const selectedWords = Array.from(selectedCheckboxes).map(cb => cb.dataset.swedish);
    
    // Store selected words for the flashcards page to use
    sessionStorage.setItem('practiceWords', JSON.stringify(selectedWords));
    sessionStorage.setItem('practiceMode', 'mistakes');
    
    // Redirect to flashcards page
    window.location.href = 'flashcards.html';
}

/**
 * Toggle select all checkboxes for mistakes
 */
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const mistakeCheckboxes = document.querySelectorAll('.mistake-checkbox');
    
    if (!selectAllCheckbox) return;
    
    const shouldSelectAll = selectAllCheckbox.checked;
    
    mistakeCheckboxes.forEach(checkbox => {
        checkbox.checked = shouldSelectAll;
    });
    
    // Update the select all checkbox state based on individual checkboxes
    updateSelectAllState();
}

/**
 * Update the select all checkbox state based on individual checkbox states
 */
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

/**
 * Go back to dashboard
 */
function goBackToDashboard() {
    window.location.href = 'dashboard.html';
}

/**
 * Show success message
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    // Create a simple success notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        z-index: 1000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    // Create a simple error notification
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        z-index: 1000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}