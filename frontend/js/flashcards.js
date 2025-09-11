/**
 * Swedish Flashcards Learning System
 * Manages the flashcard learning experience including session management,
 * card display, progress tracking, and statistics.
 */

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Verify authentication and user info
        const isAuth = await checkAuth();
        if (!isAuth) return;
        
        // Ensure we have user email
        const storedEmail = localStorage.getItem('userEmail');
        if (!storedEmail) {
            await verifyToken();
        }
        
        // Initialize application
        const app = new FlashcardLearning();
    } catch (error) {
        console.error('Failed to initialize:', error);
        window.location.href = 'index.html';
    }
});

// Flashcard Learning System
class FlashcardLearning {
    constructor() {
        // Initialize properties
        this.currentCards = [];
        this.currentCardIndex = 0;
        this.sessionStats = {
            correct: 0,
            incorrect: 0,
            startTime: null,
            results: []
        };
        this.isAnswerShown = false;
        this.correctAnswerIndex = null;
        this.isProcessingAnswer = false;
        
        // Initialize the UI
        this.initializeElements();
        this.attachEventListeners();
        this.updateUserInfo();
        
        // Setup initial view
        this.setupSection.classList.remove('hidden');
        this.learningSection.classList.add('hidden');
        this.completionSection.classList.add('hidden');
    }

    initializeElements() {
        // Get all necessary DOM elements
        this.setupSection = document.getElementById('setupSection');
        this.learningSection = document.getElementById('learningSection');
        this.completionSection = document.getElementById('completionSection');
        this.cardCount = document.getElementById('cardCount');
        this.startButton = document.getElementById('startButton');
        this.cardFront = document.getElementById('cardFront');
        this.cardBack = document.getElementById('cardBack');
        this.nextButton = document.getElementById('nextButton');
        this.finishButton = document.getElementById('finishButton');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    updateUserInfo() {
        const userEmail = localStorage.getItem('userEmail');
        console.log('Stored email:', userEmail);
        
        const userEmailElement = document.getElementById('userEmail');
        console.log('Email element:', userEmailElement);
        
        if (userEmail && userEmailElement) {
            userEmailElement.textContent = userEmail;
            console.log('Email set to:', userEmail);
        } else {
            console.log('Missing email or element');
        }
        
        // Set up logout functionality
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('swedishLearningToken');
            localStorage.removeItem('userEmail');
            window.location.href = 'index.html';
        });
    }

    attachEventListeners() {
        // Setup user interactions
        if (this.startButton) {
            this.startButton.addEventListener('click', () => this.startLearningSession());
        }
        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => this.nextCard());
        }
        if (this.finishButton) {
            this.finishButton.addEventListener('click', () => this.completeSession());
        }
        
        // Card flip functionality
        const flashcard = document.querySelector('.flashcard');
        if (flashcard) {
            flashcard.addEventListener('click', () => {
                if (!this.isProcessingAnswer) {
                    this.showAnswer();
                }
            });
        }
    }

    showLoading(show) {
        if (this.loadingOverlay) {
            show ? this.loadingOverlay.classList.remove('hidden') 
                : this.loadingOverlay.classList.add('hidden');
        }
    }

    async startLearningSession() {
        this.showLoading(true);
        try {
            const count = parseInt(this.cardCount.value);
            const response = await fetch(`/api/flashcards/random?count=${count}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch cards');
            }
            
            this.currentCards = await response.json();
            if (this.currentCards.length === 0) {
                this.showNoCardsMessage();
                return;
            }

            this.currentCardIndex = 0;
            this.resetSessionStats();
            await this.displayCurrentCard();
            
            this.setupSection.classList.add('hidden');
            this.learningSection.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to start session:', error);
            // TODO: Show error message to user
        } finally {
            this.showLoading(false);
        }
    }

    resetSessionStats() {
        this.sessionStats = {
            correct: 0,
            incorrect: 0,
            startTime: Date.now(),
            results: []
        };
    }

    async displayCurrentCard() {
        const card = this.currentCards[this.currentCardIndex];
        if (!card) return;

        if (this.cardFront) {
            this.cardFront.textContent = card.swedish;
        }
        if (this.cardBack) {
            this.cardBack.textContent = card.english;
        }
        
        this.isAnswerShown = false;
        
        const flashcard = document.querySelector('.flashcard');
        if (flashcard) {
            flashcard.classList.remove('flipped');
        }
        
        this.updateProgress();
    }

    showAnswer() {
        const flashcard = document.querySelector('.flashcard');
        if (flashcard) {
            flashcard.classList.add('flipped');
        }
        this.isAnswerShown = true;
    }

    nextCard() {
        if (this.currentCardIndex < this.currentCards.length - 1) {
            this.currentCardIndex++;
            this.displayCurrentCard();
        } else {
            this.completeSession();
        }
    }

    updateProgress() {
        const progress = ((this.currentCardIndex + 1) / this.currentCards.length) * 100;
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = `Card ${this.currentCardIndex + 1} of ${this.currentCards.length}`;
        }
    }

    showNoCardsMessage() {
        // TODO: Implement showing a message when no cards are available
        console.log('No cards available');
    }

    async completeSession() {
        this.showLoading(true);
        try {
            // Send session results to server
            const response = await fetch('/api/progress/flashcards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('swedishLearningToken')}`
                },
                body: JSON.stringify({
                    sessionStats: this.sessionStats,
                    cards: this.currentCards
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save session results');
            }

            // Show completion view
            this.setupSection.classList.add('hidden');
            this.learningSection.classList.add('hidden');
            this.completionSection.classList.remove('hidden');
            
            this.displaySessionStats();
        } catch (error) {
            console.error('Failed to complete session:', error);
            // TODO: Show error message to user
        } finally {
            this.showLoading(false);
        }
    }

    displaySessionStats() {
        const timeSpent = Math.floor((Date.now() - this.sessionStats.startTime) / 1000);
        const accuracy = (this.sessionStats.correct / this.currentCards.length) * 100;

        const elements = {
            cards: document.getElementById('statsCards'),
            time: document.getElementById('statsTime'),
            accuracy: document.getElementById('statsAccuracy')
        };

        if (elements.cards) {
            elements.cards.textContent = this.currentCards.length;
        }
        if (elements.time) {
            elements.time.textContent = `${timeSpent} seconds`;
        }
        if (elements.accuracy) {
            elements.accuracy.textContent = `${accuracy.toFixed(1)}%`;
        }
    }
}