// Flashcard Learning System
class FlashcardLearning {
    constructor() {
    this.currentCards = [];
    this.currentCardIndex = 0;
    this.sessionStats = {
        correct: 0,
        incorrect: 0,
        startTime: null,
        results: []
    };
    this.isAnswerShown = false;
    
    this.initializeElements();
    this.attachEventListeners();

    // Call the async initialization method
    this.init();
    
    // // Immediate async authentication check
    // (async () => {
    //     const isAuthenticated = await this.checkAuth();
    //     if (!isAuthenticated) {
    //         return; // Stop initialization if not authenticated
    //     }
    // })();
}
    async init() {
        this.showLoading(true);
        try {
            const isAuthenticated = await this.checkAuth();
            if (isAuthenticated) {
                // Hide the loading state and show the main page content
                document.body.classList.remove('loading');
                this.showLoading(false);
            }
        } catch (error) {
            console.error('Initialization failed:', error);
            this.logout(); // Logout on any auth error
        }
    }    

    initializeElements() {
        // Setup elements
        this.setupSection = document.getElementById('setupSection');
        this.learningSection = document.getElementById('learningSection');
        this.completionSection = document.getElementById('completionSection');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Setup controls
        this.cardCountSelect = document.getElementById('cardCount');
        this.difficultySelect = document.getElementById('difficulty');
        this.startLearningBtn = document.getElementById('startLearningBtn');
        
        // Learning elements
        this.flashcard = document.getElementById('flashcard');
        this.cardFront = document.getElementById('cardFront');
        this.cardBack = document.getElementById('cardBack');
        this.wordType = document.getElementById('wordType');
        this.wordText = document.getElementById('wordText');
        this.difficultyBadge = document.getElementById('difficultyBadge');
        this.translation = document.getElementById('translation');
        this.masteryInfo = document.getElementById('masteryInfo');
        
        // Progress elements
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        // Action buttons
        this.showAnswerBtn = document.getElementById('showAnswerBtn');
        this.answerButtons = document.getElementById('answerButtons');
        this.correctBtn = document.getElementById('correctBtn');
        this.incorrectBtn = document.getElementById('incorrectBtn');
        
        // Stats elements
        this.correctCount = document.getElementById('correctCount');
        this.incorrectCount = document.getElementById('incorrectCount');
        this.accuracy = document.getElementById('accuracy');
        
        // Completion elements
        this.finalScore = document.getElementById('finalScore');
        this.finalCorrect = document.getElementById('finalCorrect');
        this.finalTime = document.getElementById('finalTime');
        this.newSessionBtn = document.getElementById('newSessionBtn');
        this.reviewMistakesBtn = document.getElementById('reviewMistakesBtn');
        
        // User elements
        this.userWelcome = document.getElementById('userWelcome');
        this.logoutBtn = document.getElementById('logoutBtn');
    }
    
    attachEventListeners() {
        this.startLearningBtn.addEventListener('click', () => this.startLearningSession());
        this.showAnswerBtn.addEventListener('click', () => this.showAnswer());
        this.correctBtn.addEventListener('click', () => this.recordAnswer(true));
        this.incorrectBtn.addEventListener('click', () => this.recordAnswer(false));
        this.newSessionBtn.addEventListener('click', () => this.resetSession());
        this.reviewMistakesBtn.addEventListener('click', () => this.reviewMistakes());
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.learningSection.classList.contains('hidden')) return;
            
            switch(e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    if (!this.isAnswerShown) {
                        this.showAnswer();
                    }
                    break;
                case '1':
                    e.preventDefault();
                    if (this.isAnswerShown) {
                        this.recordAnswer(false);
                    }
                    break;
                case '2':
                    e.preventDefault();
                    if (this.isAnswerShown) {
                        this.recordAnswer(true);
                    }
                    break;
            }
        });
    }
    
    async checkAuth() {
        const token = localStorage.getItem('swedishLearningToken');
        console.log('Checking token in flashcards:', token);

        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = 'index.html'; // Use relative path
            return false;
        }

        try {
            const response = await fetch('/api/users/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                console.error('Profile fetch failed with status:', response.status);
                console.log("token:", token);
                // The server returned a non-200 status, indicating a bad token
                throw new Error('Profile fetch failed');
            
            }
            const data = await response.json();
            console.log('Profile response:', data);

            // Update welcome message
            if (this.userWelcome && data.data) {
                this.userWelcome.textContent = `Welcome, ${data.data.email || 'User'}!`;
            }

            return true;

        } catch (error) {
            console.error('Auth check failed:', error);
            // Clear token on auth failure
            // localStorage.removeItem('swedishLearningToken');
            // window.location.href = 'index.html'; // Use relative path
            return false;
        }
}   
    
    async startLearningSession() {
        this.showLoading(true);
        
        try {
            const limit = this.cardCountSelect.value;
            const difficulty = this.difficultySelect.value;
            const token = localStorage.getItem('swedishLearningToken');
            console.log('Checking token in flashcards:', token);
            console.log('limit:', limit);
            console.log('difficulty:', difficulty);

            const response = await fetch(`/api/learning/flashcards?limit=${limit}&difficulty=${difficulty}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch flashcards');
            }
            
            const data = await response.json();
            this.currentCards = data.data;
            
            if (this.currentCards.length === 0) {
                alert('No flashcards available. Please add some words first!');
                return;
            }
            
            this.resetSessionStats();
            this.showLearningInterface();
            this.displayCurrentCard();
            
        } catch (error) {
            console.error('Error starting learning session:', error);
            alert('Failed to load flashcards. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    resetSessionStats() {
        this.currentCardIndex = 0;
        this.sessionStats = {
            correct: 0,
            incorrect: 0,
            startTime: new Date(),
            results: []
        };
        this.isAnswerShown = false;
        this.updateStats();
    }
    
    showLearningInterface() {
        this.setupSection.classList.add('hidden');
        this.learningSection.classList.remove('hidden');
        this.completionSection.classList.add('hidden');
    }
    
    displayCurrentCard() {
        if (this.currentCardIndex >= this.currentCards.length) {
            this.completeSession();
            return;
        }
        
        const card = this.currentCards[this.currentCardIndex];
        
        // Update card content
        this.wordType.textContent = card.type;
        this.wordText.textContent = card.swedish;
        this.difficultyBadge.textContent = `Level ${card.difficultyLevel}`;
        this.translation.textContent = card.english;
        
        // Update mastery info
        if (card.progress && card.progress.masteryLevel !== 'new') {
            this.masteryInfo.innerHTML = `
                <span class="mastery-level mastery-${card.progress.masteryLevel}">${card.progress.masteryLevel}</span>
                <span class="success-rate">Success: ${card.progress.successRate}%</span>
            `;
        } else {
            this.masteryInfo.innerHTML = `
                <span class="mastery-level mastery-new">New Word</span>
                <span class="success-rate">First time learning</span>
            `;
        }
        
        // Reset card state
        this.cardFront.classList.remove('hidden');
        this.cardBack.classList.add('hidden');
        this.showAnswerBtn.classList.remove('hidden');
        this.answerButtons.classList.add('hidden');
        this.isAnswerShown = false;
        
        // Update progress
        this.updateProgress();
    }
    
    showAnswer() {
        this.cardFront.classList.add('hidden');
        this.cardBack.classList.remove('hidden');
        this.showAnswerBtn.classList.add('hidden');
        this.answerButtons.classList.remove('hidden');
        this.isAnswerShown = true;
    }
    
    recordAnswer(isCorrect) {
        const currentCard = this.currentCards[this.currentCardIndex];
        
        // Update session stats
        if (isCorrect) {
            this.sessionStats.correct++;
        } else {
            this.sessionStats.incorrect++;
        }
        
        // Record result
        this.sessionStats.results.push({
            wordId: currentCard.id,
            isCorrect: isCorrect,
            userAnswer: isCorrect ? currentCard.english : 'incorrect',
            correctAnswer: currentCard.english,
            word: currentCard
        });
        
        this.updateStats();
        
        // Move to next card
        this.currentCardIndex++;
        setTimeout(() => {
            this.displayCurrentCard();
        }, 500);
    }
    
    updateProgress() {
        const progress = ((this.currentCardIndex + 1) / this.currentCards.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `${this.currentCardIndex + 1} / ${this.currentCards.length}`;
    }
    
    updateStats() {
        const total = this.sessionStats.correct + this.sessionStats.incorrect;
        const accuracy = total > 0 ? Math.round((this.sessionStats.correct / total) * 100) : 0;
        
        this.correctCount.textContent = this.sessionStats.correct;
        this.incorrectCount.textContent = this.sessionStats.incorrect;
        this.accuracy.textContent = `${accuracy}%`;
    }
    
    async completeSession() {
        this.showLoading(true);
        
        try {
            const endTime = new Date();
            const timeSpent = Math.round((endTime - this.sessionStats.startTime) / 1000);
            const token = localStorage.getItem('swedishLearningToken');
            console.log('Checking token in flashcards:', token);
            
            // Submit session results to backend
            const response = await fetch('/api/learning/session/submit', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionType: 'flashcards',
                    results: this.sessionStats.results,
                    timeSpent: timeSpent
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to submit session results');
            }
            
            const data = await response.json();
            
            // Show completion screen
            this.showCompletionScreen(data.data, timeSpent);
            
        } catch (error) {
            console.error('Error completing session:', error);
            // Still show completion screen even if submission fails
            const timeSpent = Math.round((new Date() - this.sessionStats.startTime) / 1000);
            this.showCompletionScreen(null, timeSpent);
        } finally {
            this.showLoading(false);
        }
    }
    
    showCompletionScreen(sessionData, timeSpent) {
        const total = this.sessionStats.correct + this.sessionStats.incorrect;
        const score = total > 0 ? Math.round((this.sessionStats.correct / total) * 100) : 0;
        
        this.finalScore.textContent = `${score}%`;
        this.finalCorrect.textContent = `${this.sessionStats.correct}/${total}`;
        this.finalTime.textContent = this.formatTime(timeSpent);
        
        this.learningSection.classList.add('hidden');
        this.completionSection.classList.remove('hidden');
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    resetSession() {
        this.setupSection.classList.remove('hidden');
        this.learningSection.classList.add('hidden');
        this.completionSection.classList.add('hidden');
    }
    
    reviewMistakes() {
        const mistakes = this.sessionStats.results.filter(result => !result.isCorrect);
        
        if (mistakes.length === 0) {
            alert('Great job! You didn\'t make any mistakes!');
            return;
        }
        
        // Create review session with only mistakes
        this.currentCards = mistakes.map(mistake => mistake.word);
        this.resetSessionStats();
        this.showLearningInterface();
        this.displayCurrentCard();
    }
    
    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.remove('hidden');
        } else {
            this.loadingOverlay.classList.add('hidden');
        }
    }
    
    logout() {
        localStorage.removeItem('swedishLearningToken');
        window.location.href = 'index.html'; // Use relative path
    }
}

// Initialize the flashcard system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FlashcardLearning();
});