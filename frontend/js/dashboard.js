// DOM elements and cache
const elements = window.dashboardElements || {
    userDisplayName: null,
    memberSince: null,
    wordsLearned: null,
    wordsProgress: null,
    currentStreak: null,
    longestStreak: null,
    quizzesTaken: null,
    activityList: null,
    progressBars: {},
    countDisplays: {}
};
window.dashboardElements = elements;

// Initialize DOM elements
function initializeElements() {
    // Initialize main elements
    ['userDisplayName', 'memberSince', 'wordsLearned', 'wordsProgress',
     'currentStreak', 'longestStreak', 'quizzesTaken', 'activityList'].forEach(key => {
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
        
        // Update user profile section
        if (elements.userDisplayName) elements.userDisplayName.textContent = userData.username || userData.email;
        if (elements.memberSince) elements.memberSince.textContent = new Date(userData.createdAt).toLocaleDateString();
        
        // Update statistics
        if (elements.wordsLearned) elements.wordsLearned.textContent = userData.totalWordsLearned || 0;
        if (elements.currentStreak) elements.currentStreak.textContent = `${userData.currentStreak || 0} days`;
        if (elements.longestStreak) elements.longestStreak.textContent = `${userData.longestStreak || 0} days`;
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
            updateWordTypeProgress(statsData.wordTypeStats || {});
            updateLearningProgress(statsData);
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
    if (elements.wordsLearned) elements.wordsLearned.textContent = stats.totalWordsLearned || 0;
    if (elements.currentStreak) elements.currentStreak.textContent = `${stats.currentStreak || 0} days`;
    if (elements.longestStreak) elements.longestStreak.textContent = `${stats.longestStreak || 0} days`;
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
