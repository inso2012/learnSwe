// Dashboard page module
import { apiFetch } from './api.js';
import { verifyToken } from './auth.js';
import { showError, showAlert } from './modal.js';
import './nav.js';

// DOM elements cache
const elements = {
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

function initializeElements() {
    ['userDisplayName', 'memberSince', 'wordsLearned', 'wordsProgress',
     'currentStreak', 'quizzesTaken', 'activityList'].forEach(key => {
        elements[key] = document.getElementById(key);
    });

    ['nouns', 'verbs', 'adjectives', 'other'].forEach(type => {
        elements.progressBars[type] = document.getElementById(`${type}Progress`);
        elements.countDisplays[type] = document.getElementById(`${type}Count`);
    });
}

async function loadDashboard() {
    try {
        const userResponse = await apiFetch('/api/users/profile');

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const userData = await userResponse.json();
        const user = userData.data || userData;

        if (elements.userDisplayName) {
            const displayName = user.firstName ? `${user.firstName} ${user.lastName}` : (user.username || user.email);
            elements.userDisplayName.textContent = displayName;
        }

        if (elements.memberSince) {
            const memberDate = user.registrationDate || user.createdAt;
            elements.memberSince.textContent = new Date(memberDate).toLocaleDateString();
        }

        if (elements.wordsLearned) elements.wordsLearned.textContent = userData.totalWordsLearned || 0;
        if (elements.currentStreak) elements.currentStreak.textContent = `${userData.currentStreak || 0} days`;
        if (elements.quizzesTaken) elements.quizzesTaken.textContent = userData.totalQuizzesTaken || 0;

        if (elements.wordsProgress) {
            const progress = ((userData.totalWordsLearned || 0) / 1000) * 100;
            elements.wordsProgress.style.width = `${Math.min(progress, 100)}%`;
        }

        const statsResponse = await apiFetch('/api/progress/stats');

        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            const actualStats = statsData.data || statsData;
            updateWordTypeProgress(actualStats.wordTypeStats || {});
            updateLearningProgress(actualStats);
        } else {
            console.error('Stats API failed:', statsResponse.status, await statsResponse.text());
        }

        const activityResponse = await apiFetch('/api/progress/activity');

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
    ['nouns', 'verbs', 'adjectives', 'other'].forEach(type => {
        if (elements.progressBars[type]) elements.progressBars[type].style.width = '0%';
        if (elements.countDisplays[type]) elements.countDisplays[type].textContent = '0';
    });

    let totalWords = Object.values(wordTypes).reduce((sum, count) => sum + count, 0);

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

function updateMistakesCount() {
    try {
        const userEmail = localStorage.getItem('userEmail');

        if (!userEmail) {
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

        const reviewBtn = document.getElementById('reviewMistakesBtn');
        if (reviewBtn) {
            if (mistakesCount === 0) {
                reviewBtn.disabled = true;
                reviewBtn.textContent = 'No Mistakes to Review';
                reviewBtn.style.opacity = '0.6';

                const totalWordsLearned = parseInt(document.getElementById('wordsLearned')?.textContent || '0');
                if (totalWordsLearned > 0 && !localStorage.getItem('mistakeResetNoticeShown')) {
                    setTimeout(() => {
                        showAlert('Mistake tracking has been reset with the recent system updates. Continue practicing to build up your review list!', 'info');
                        localStorage.setItem('mistakeResetNoticeShown', 'true');
                    }, 2000);
                }
            } else {
                reviewBtn.disabled = false;
                reviewBtn.textContent = 'Review Words';
                reviewBtn.style.opacity = '1';
            }
        }
    } catch (error) {
        console.error('Error updating mistakes count:', error);
    }
}

function migrateOldMistakeData() {
    try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) return;

        const oldMistakes = localStorage.getItem('swedishLearningMistakes');
        const userSpecificKey = `swedishLearningMistakes_${userEmail}`;
        const userMistakes = localStorage.getItem(userSpecificKey);

        if (oldMistakes && !userMistakes) {
            localStorage.setItem(userSpecificKey, oldMistakes);
        }

        if (oldMistakes) {
            localStorage.removeItem('swedishLearningMistakes');
        }
    } catch (error) {
        console.error('Error during mistake data migration:', error);
    }
}

// Initialize and load dashboard
document.addEventListener('DOMContentLoaded', async () => {
    initializeElements();
    migrateOldMistakeData();
    updateMistakesCount();
    if (await verifyToken()) {
        await loadDashboard();
    }
});

// Refresh dashboard when user returns to the page
window.addEventListener('focus', async () => {
    updateMistakesCount();
    if (await verifyToken()) {
        await loadDashboard();
    }
});

// Refresh when page becomes visible (tab switching)
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && await verifyToken()) {
        await loadDashboard();
    }
});

// Listen for storage changes to update count when mistakes are added/removed
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('swedishLearningMistakes_')) {
        updateMistakesCount();
    }
});

// Global function for HTML onclick handler
window.openReviewMistakes = function() {
    window.location.href = 'review-mistakes.html';
};
