// DOM elements and cache
(function() {
    'use strict';
    
    window.dashboardElements = window.dashboardElements || {
        userDisplayName: null,
        memberSince: null,
        wordsLearned: null,
        wordsProgress: null,
        currentStreak: null,
        quizzesTaken: null,
        activityList: null,
        progressBars: {},
        countDisplays: {}
    };
    
    const elements = window.dashboardElements;

// Initialize DOM elements
function initializeElements() {
    // Initialize main elements
    ['userDisplayName', 'memberSince', 'wordsLearned', 'wordsProgress',
     'currentStreak', 'quizzesTaken', 'activityList'].forEach(key => {
        elements[key] = document.getElementById(key);
    });

    // Initialize progress bars and count displays
    ['nouns', 'verbs', 'adjectives', 'other'].forEach(type => {
        elements.progressBars[type] = document.getElementById(`${type}Progress`);
        elements.countDisplays[type] = document.getElementById(`${type}Count`);
    });
}

async function loadDashboard() {
    try {
        const token = localStorage.getItem('swedishLearningToken');
        if (!token) {
            throw new Error('No authentication token found');
        }

        // Fetch user profile
        const userResponse = await fetch('/api/users/profile', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const userData = await userResponse.json();
        const user = userData.data || userData; // Handle different response structures
        
        // Update user profile section with first name and full name
        if (elements.userDisplayName) {
            const displayName = user.firstName ? `${user.firstName} ${user.lastName}` : (user.username || user.email);
            elements.userDisplayName.textContent = displayName;
        }
        
        // Use registration date if available, otherwise fall back to createdAt
        if (elements.memberSince) {
            const memberDate = user.registrationDate || user.createdAt;
            elements.memberSince.textContent = new Date(memberDate).toLocaleDateString();
        }
        
        // Update statistics
        if (elements.wordsLearned) elements.wordsLearned.textContent = userData.totalWordsLearned || 0;
        if (elements.currentStreak) elements.currentStreak.textContent = `${userData.currentStreak || 0} days`;
        if (elements.quizzesTaken) elements.quizzesTaken.textContent = userData.totalQuizzesTaken || 0;

        // Calculate words progress
        if (elements.wordsProgress) {
            const progress = ((userData.totalWordsLearned || 0) / 1000) * 100;
            elements.wordsProgress.style.width = `${Math.min(progress, 100)}%`;
        }

        // Fetch and update word type statistics and user progress
        const statsResponse = await fetch('/api/progress/stats', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            
            // Extract the actual stats from the response wrapper
            const actualStats = statsData.data || statsData;
            
            updateWordTypeProgress(actualStats.wordTypeStats || {});
            updateLearningProgress(actualStats);
        } else {
            console.error('Stats API failed:', statsResponse.status, await statsResponse.text());
        }

        // Fetch recent learning activity
        const activityResponse = await fetch('/api/progress/activity', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (activityResponse.ok) {
            const activityData = await activityResponse.json();
            updateActivityList(activityData.activities || []);
        }

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showError('Failed to load dashboard data. Please try again later.');
    }
}

function updateLearningProgress(stats) {
    if (elements.wordsLearned) {
        elements.wordsLearned.textContent = stats.totalWordsLearned || 0;
    }
    if (elements.currentStreak) elements.currentStreak.textContent = `${stats.currentStreak || 0} days`;
    if (elements.quizzesTaken) elements.quizzesTaken.textContent = stats.totalQuizzesTaken || 0;

    if (elements.wordsProgress) {
        const progress = ((stats.totalWordsLearned || 0) / 1000) * 100;
        elements.wordsProgress.style.width = `${Math.min(progress, 100)}%`;
    }
}

function updateWordTypeProgress(wordTypes) {
    // Reset all progress bars and counters
    ['nouns', 'verbs', 'adjectives', 'other'].forEach(type => {
        if (elements.progressBars[type]) elements.progressBars[type].style.width = '0%';
        if (elements.countDisplays[type]) elements.countDisplays[type].textContent = '0';
    });

    // Calculate total words for percentage
    let totalWords = Object.values(wordTypes).reduce((sum, count) => sum + count, 0);

    // Update progress bars and counters with new values
    Object.entries(wordTypes).forEach(([type, count]) => {
        const category = type.toLowerCase();
        if (elements.progressBars[category] && totalWords > 0) {
            const percentage = (count / totalWords) * 100;
            elements.progressBars[category].style.width = `${percentage}%`;
        }
        
        if (elements.countDisplays[category]) {
            elements.countDisplays[category].textContent = count;
        }
    });
}

function updateActivityList(activities) {
    if (!elements.activityList) return;

    elements.activityList.innerHTML = activities.length ? '' : '<li>No recent activity</li>';

    activities.forEach(activity => {
        const li = document.createElement('li');
        const date = new Date(activity.date).toLocaleDateString();
        
        let activityText = '';
        if (activity.type === 'quiz') {
            activityText = `Completed a quiz with score: ${activity.score}%`;
        } else if (activity.type === 'word') {
            activityText = `Learned new word: ${activity.word}`;
        } else if (activity.type === 'streak') {
            activityText = `Maintained a ${activity.days} day streak!`;
        }

        li.textContent = `${date}: ${activityText}`;
        elements.activityList.appendChild(li);
    });
}

// Initialize and load dashboard when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    initializeElements();
    if (await window.auth.verifyToken()) {
        await loadDashboard();
    }
});

// Refresh dashboard when user returns to the page (e.g., after completing flashcards)
window.addEventListener('focus', async () => {
    if (await window.auth.verifyToken()) {
        await loadDashboard();
    }
});

// Also refresh when page becomes visible (for tab switching)
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && await window.auth.verifyToken()) {
        await loadDashboard();
    }
});

// Update mistakes count on dashboard
function updateMistakesCount() {
    try {
        const userEmail = localStorage.getItem('userEmail');
        
        if (!userEmail) {
            // If no user email, set count to 0
            const mistakesCountElement = document.getElementById('mistakesCount');
            if (mistakesCountElement) {
                mistakesCountElement.textContent = '0';
            }
            return;
        }
        
        const mistakeKey = `swedishLearningMistakes_${userEmail}`;
        const saved = localStorage.getItem(mistakeKey);
        
        let mistakesCount = 0;
        
        if (saved) {
            const mistakeStrings = JSON.parse(saved);
            // Count unique mistakes by converting to objects and checking swedish words
            const uniqueWords = new Set();
            mistakeStrings.forEach(mistakeJson => {
                try {
                    const mistake = JSON.parse(mistakeJson);
                    if (mistake.swedish) {
                        uniqueWords.add(mistake.swedish);
                    }
                } catch (error) {
                    // Skip invalid entries
                }
            });
            mistakesCount = uniqueWords.size;
        }
        
        const mistakesCountElement = document.getElementById('mistakesCount');
        if (mistakesCountElement) {
            mistakesCountElement.textContent = mistakesCount;
        }
        
        // Update button state
        const reviewBtn = document.getElementById('reviewMistakesBtn');
        if (reviewBtn) {
            if (mistakesCount === 0) {
                reviewBtn.disabled = true;
                reviewBtn.textContent = '📚 No Mistakes to Review';
                reviewBtn.style.opacity = '0.6';
                
                // Check if user has learned words but no mistakes (might indicate data was reset)
                const totalWordsLearned = parseInt(document.getElementById('wordsLearned')?.textContent || '0');
                if (totalWordsLearned > 0 && !localStorage.getItem('mistakeResetNoticeShown')) {
                    // Show one-time notice about mistake data reset
                    setTimeout(() => {
                        if (typeof showAlert === 'function') {
                            showAlert('Mistake tracking has been reset with the recent system updates. Continue practicing to build up your review list!', 'info');
                        }
                        localStorage.setItem('mistakeResetNoticeShown', 'true');
                    }, 2000);
                }
            } else {
                reviewBtn.disabled = false;
                reviewBtn.textContent = '📚 Review Words';
                reviewBtn.style.opacity = '1';
            }
        }
    } catch (error) {
        console.error('Error updating mistakes count:', error);
    }
}

// Initialize mistakes count when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    migrateOldMistakeData();
    updateMistakesCount();
});

// Function to migrate old mistake data to user-specific storage and clean up
function migrateOldMistakeData() {
    try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) {
            return;
        }
        
        // Check if there's old generic mistake data
        const oldMistakes = localStorage.getItem('swedishLearningMistakes');
        const userSpecificKey = `swedishLearningMistakes_${userEmail}`;
        const userMistakes = localStorage.getItem(userSpecificKey);
        
        // If there's old data and no user-specific data yet, migrate it
        if (oldMistakes && !userMistakes) {
            localStorage.setItem(userSpecificKey, oldMistakes);
        }
        
        // Always remove the old generic key to prevent confusion
        if (oldMistakes) {
            localStorage.removeItem('swedishLearningMistakes');
        }
        
    } catch (error) {
        console.error('Error during mistake data migration:', error);
    }
}



// Listen for storage changes to update count when mistakes are added/removed
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('swedishLearningMistakes_')) {
        updateMistakesCount();
    }
});

// Also update when returning from other pages
window.addEventListener('focus', () => {
    updateMistakesCount();
});

})(); // Close the IIFE

// Global function to open review mistakes page
function openReviewMistakes() {
    window.location.href = 'review-mistakes.html';
}
