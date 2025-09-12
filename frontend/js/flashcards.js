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
        this.learnedWords = new Set(); // Track unique learned words
        this.isReviewSession = false; // Track if we're in a mistake review session
        this.originalSessionStats = null; // Store original session stats for review
        this.mistakeHistory = new Set(); // Persistent mistake history across sessions
        
        // Load mistake history from localStorage
        this.loadMistakeHistory();
        
        // Initialize the UI
        this.initializeElements();
        this.attachEventListeners();
        this.updateUserInfo();
        
        // Setup initial view
        this.setupSection.classList.remove('hidden');
        this.learningSection.classList.add('hidden');
        this.completionSection.classList.add('hidden');
    }

    loadMistakeHistory() {
        try {
            const saved = localStorage.getItem('swedishLearningMistakes');
            if (saved) {
                const mistakes = JSON.parse(saved);
                this.mistakeHistory = new Set(mistakes);
            }
        } catch (error) {
            console.error('Failed to load mistake history:', error);
            this.mistakeHistory = new Set();
        }
    }

    saveMistakeHistory() {
        try {
            const mistakes = Array.from(this.mistakeHistory);
            localStorage.setItem('swedishLearningMistakes', JSON.stringify(mistakes));
        } catch (error) {
            console.error('Failed to save mistake history:', error);
        }
    }

    initializeElements() {
        // Get all necessary DOM elements
        this.setupSection = document.getElementById('setupSection');
        this.learningSection = document.getElementById('learningSection');
        this.completionSection = document.getElementById('completionSection');
        this.cardCount = document.getElementById('cardCount');
        this.startButton = document.getElementById('startLearningBtn');
        this.wordText = document.getElementById('wordText');
        this.wordType = document.getElementById('wordType');
        this.difficultyBadge = document.getElementById('difficultyBadge');
        this.answerOptions = document.getElementById('answerOptions');
        this.masteryInfo = document.getElementById('masteryInfo');
        this.correctCount = document.getElementById('correctCount');
        this.incorrectCount = document.getElementById('incorrectCount');
        this.accuracy = document.getElementById('accuracy');
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

        // Review mistakes button
        const reviewMistakesBtn = document.getElementById('reviewMistakesBtn');
        if (reviewMistakesBtn) {
            reviewMistakesBtn.addEventListener('click', () => this.reviewMistakes());
        }

        // New session button  
        const newSessionBtn = document.getElementById('newSessionBtn');
        if (newSessionBtn) {
            newSessionBtn.addEventListener('click', () => this.startNewSession());
        }
        
        // Answer options handling
        if (this.answerOptions) {
            this.answerOptions.addEventListener('click', (event) => {
                const button = event.target.closest('.answer-button');
                if (!button || this.isProcessingAnswer) return;
                
                this.handleAnswer(button);
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
            console.log('Starting learning session...');
            const count = parseInt(this.cardCount.value);
            const difficulty = document.getElementById('difficulty').value;
            console.log('Requesting', count, 'cards with difficulty:', difficulty);
            
            const token = localStorage.getItem('swedishLearningToken');
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            const response = await fetch(`/api/learning/flashcards?limit=${count}&difficulty=${difficulty}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch cards: ${response.status} ${errorText}`);
            }
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch cards');
            }
            
            this.currentCards = result.data;
            if (this.currentCards.length === 0) {
                this.showNoCardsMessage();
                return;
            }

            this.currentCardIndex = 0;
            this.resetSessionStats();
            this.learnedWords.clear(); // Reset learned words for new session
            await this.displayCurrentCard();
            
            this.setupSection.classList.add('hidden');
            this.learningSection.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to start session:', error);
            alert('Failed to start session: ' + error.message);
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

        // Update word information
        if (this.wordType) this.wordType.textContent = card.type || 'word';
        if (this.wordText) this.wordText.textContent = card.swedish;
        if (this.difficultyBadge) this.difficultyBadge.textContent = `Level ${card.difficultyLevel || 1}`;
        
        // Update mastery info if available
        if (this.masteryInfo && card.progress) {
            const masteryLevel = this.masteryInfo.querySelector('.mastery-level');
            const successRate = this.masteryInfo.querySelector('.success-rate');
            
            if (masteryLevel) {
                masteryLevel.textContent = card.progress.masteryLevel || 'New Word';
            }
            if (successRate) {
                successRate.textContent = `Success: ${card.progress.successRate || '0'}%`;
            }
        }

        // Get and display answer options
        await this.setupAnswerOptions(card);
        
        this.updateProgress();
        
        this.updateProgress();
    }

    showAnswer() {
        const flashcard = document.querySelector('.flashcard');
        const cardBack = document.querySelector('.card-back');
        if (flashcard) flashcard.classList.add('flipped');
        if (cardBack) cardBack.classList.remove('hidden');
        
        // Show answer buttons and hide show answer button
        if (this.showAnswerBtn) this.showAnswerBtn.classList.add('hidden');
        if (this.answerButtons) {
            this.answerButtons.classList.remove('hidden');
            this.setupAnswerButtons(this.currentCards[this.currentCardIndex]);
        }
        
        this.isAnswerShown = true;
    }

    nextCard() {
        console.log('=== NEXT CARD CALLED ===');
        console.log('Current index:', this.currentCardIndex);
        console.log('Total cards:', this.currentCards.length);
        
        // Get current card before moving to next
        const currentCard = this.currentCards[this.currentCardIndex];
        
        // Add to learned words if the user has seen the answer
        if (this.isAnswerShown) {
            this.learnedWords.add(currentCard.swedish);
        }

        if (this.currentCardIndex < this.currentCards.length - 1) {
            console.log('Moving to next card...');
            this.currentCardIndex++;
            this.displayCurrentCard();
            
            // Reset answer options state
            if (this.answerOptions) {
                const buttons = this.answerOptions.querySelectorAll('.answer-button');
                buttons.forEach(btn => {
                    btn.disabled = false;
                    btn.className = 'answer-button';
                });
            }
            
            // Show the "Show Answer" button again
            if (this.showAnswerBtn) {
                this.showAnswerBtn.classList.remove('hidden');
            }
        } else {
            console.log('All cards completed, calling completeSession...');
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
        alert('No cards available for your current selection. Try adjusting the difficulty level or number of cards.');
        this.showLoading(false);
    }

    async setupAnswerOptions(card) {
        const buttons = this.answerOptions.querySelectorAll('.answer-button');
        
        try {
            // Get 3 random incorrect answers
            const response = await fetch(`/api/learning/alternatives?word=${encodeURIComponent(card.swedish)}&count=3`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('swedishLearningToken')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch alternatives');
            }
            
            const result = await response.json();
            const alternatives = result.data;
            
            // Combine correct answer with alternatives
            const answers = [card.english, ...alternatives];
            // Shuffle the answers
            const shuffledAnswers = answers.sort(() => Math.random() - 0.5);
            
            buttons.forEach((button, index) => {
                button.textContent = shuffledAnswers[index];
                button.className = 'answer-button';
                button.dataset.correct = shuffledAnswers[index] === card.english ? 'true' : 'false';
                button.disabled = false;
            });
        } catch (error) {
            console.error('Failed to fetch alternatives:', error);
            buttons.forEach((button, index) => {
                if (index === 0) {
                    button.textContent = card.english;
                    button.className = 'answer-button';
                    button.dataset.correct = 'true';
                } else {
                    button.textContent = `Option ${index + 1}`;
                    button.className = 'answer-button';
                    button.dataset.correct = 'false';
                }
                button.disabled = false;
            });
        }
    }

    async handleAnswer(button) {
        if (this.isProcessingAnswer) return;
        this.isProcessingAnswer = true;

        const isCorrect = button.dataset.correct === 'true';
        const currentCard = this.currentCards[this.currentCardIndex];

        // Update button appearance
        button.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        // Update session stats
        if (isCorrect) {
            this.sessionStats.correct++;
            this.learnedWords.add(currentCard.swedish);
        } else {
            this.sessionStats.incorrect++;
        }
        
        // Always track words as "shown" regardless of correctness (for dashboard counting)
        // Note: learnedWords tracks correctly answered words, shownWords (sent to API) tracks all words shown

        // Update stats display
        this.updateStats();

        // Add result to session
        this.sessionStats.results.push({
            word: currentCard.swedish,
            translation: currentCard.english,
            correct: isCorrect,
            timestamp: Date.now()
        });

        // Show correct answer and disable all buttons
        const buttons = this.answerOptions.querySelectorAll('.answer-button');
        buttons.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.correct === 'true') {
                btn.classList.add('correct');
            }
        });

        // Handle mistake tracking for review sessions
        if (this.isReviewSession) {
            if (isCorrect) {
                // Remove from mistake history if answered correctly in review
                // Need to find and remove the JSON string that contains this swedish word
                const mistakeToRemove = Array.from(this.mistakeHistory).find(mistakeJson => {
                    try {
                        const mistake = JSON.parse(mistakeJson);
                        return mistake.swedish === currentCard.swedish;
                    } catch {
                        return false;
                    }
                });
                if (mistakeToRemove) {
                    this.mistakeHistory.delete(mistakeToRemove);
                }
            } else {
                // Keep in mistake history if still getting it wrong - store full card info
                this.mistakeHistory.add(JSON.stringify({
                    swedish: currentCard.swedish,
                    english: currentCard.english,
                    type: currentCard.type,
                    difficulty: currentCard.difficulty
                }));
            }
        } else {
            // Add to mistake history if wrong in regular session
            if (!isCorrect) {
                this.mistakeHistory.add(JSON.stringify({
                    swedish: currentCard.swedish,
                    english: currentCard.english,
                    type: currentCard.type,
                    difficulty: currentCard.difficulty
                }));
            }
        }
        
        // Save mistake history to localStorage
        this.saveMistakeHistory();

        // Wait a moment to show the result, then auto-advance
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Move to next card
        this.nextCard();
        this.isProcessingAnswer = false;
    }

    updateStats() {
        const total = this.sessionStats.correct + this.sessionStats.incorrect;
        const accuracyValue = total > 0 ? (this.sessionStats.correct / total * 100).toFixed(1) : '0.0';

        if (this.correctCount) this.correctCount.textContent = this.sessionStats.correct;
        if (this.incorrectCount) this.incorrectCount.textContent = this.sessionStats.incorrect;
        if (this.accuracy) this.accuracy.textContent = `${accuracyValue}%`;
    }

    async completeSession() {
        console.log('=== COMPLETE SESSION CALLED ===');
        console.log('Is review session:', this.isReviewSession);
        console.log('Current cards:', this.currentCards.length);
        console.log('Current card index:', this.currentCardIndex);
        
        if (this.isReviewSession) {
            this.completeReviewSession();
            return;
        }

        this.showLoading(true);
        try {
            // Send session results, shown words, and learned words to server
            const shownWords = this.currentCards.map(card => card.swedish);
            const payload = {
                sessionStats: this.sessionStats,
                cards: this.currentCards,
                learnedWords: Array.from(this.learnedWords),
                shownWords: shownWords  // Track all words shown in this session
            };
            
            console.log('Sending flashcard session data:', payload);
            console.log('Learned words:', Array.from(this.learnedWords));
            console.log('Shown words:', shownWords);
            
            const response = await fetch('/api/progress/flashcards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('swedishLearningToken')}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`Failed to save session results: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            console.log('API Response:', result);

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

    completeReviewSession() {
        // Restore original session and exit review mode
        const reviewStats = { ...this.sessionStats };
        this.sessionStats = this.originalSessionStats;
        this.isReviewSession = false;
        this.originalSessionStats = null;

        // Show completion screen with original stats
        this.setupSection.classList.add('hidden');
        this.learningSection.classList.add('hidden');
        this.completionSection.classList.remove('hidden');
        
        // Display original session stats
        this.displaySessionStats();

        // Show review completion message
        this.showReviewCompletionModal(reviewStats);
    }

    showReviewCompletionModal(reviewStats) {
        const modal = document.getElementById('successModal');
        if (modal) {
            // Update modal content for review completion
            const emoji = modal.querySelector('.modal-emoji');
            const title = modal.querySelector('h2');
            const message = modal.querySelector('p');
            const button = modal.querySelector('.custom-modal-button');
            
            const totalReviewed = reviewStats.correct + reviewStats.incorrect;
            const reviewAccuracy = totalReviewed > 0 ? (reviewStats.correct / totalReviewed * 100).toFixed(1) : '0';
            
            if (emoji) emoji.textContent = '📚';
            if (title) title.textContent = 'Review Complete!';
            if (message) {
                message.textContent = `You reviewed ${totalReviewed} mistake${totalReviewed !== 1 ? 's' : ''} with ${reviewAccuracy}% accuracy. Great job working on those challenging words!`;
            }
            if (button) button.textContent = 'Continue';
            
            // Show modal
            modal.style.display = 'flex';
            
            // Add close event if not already added
            if (button && !button.hasAttribute('data-review-listener')) {
                button.setAttribute('data-review-listener', 'true');
                button.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
        }
    }

    displaySessionStats() {
        const timeSpent = Math.floor((Date.now() - this.sessionStats.startTime) / 1000);
        const totalAnswers = this.sessionStats.correct + this.sessionStats.incorrect;
        const accuracy = totalAnswers > 0 ? (this.sessionStats.correct / totalAnswers) * 100 : 0;
        
        // Format time as MM:SS
        const minutes = Math.floor(timeSpent / 60);
        const seconds = timeSpent % 60;
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const elements = {
            score: document.getElementById('finalScore'),
            correct: document.getElementById('finalCorrect'),
            time: document.getElementById('finalTime')
        };

        if (elements.score) {
            elements.score.textContent = `${accuracy.toFixed(1)}%`;
        }
        if (elements.correct) {
            elements.correct.textContent = `${this.sessionStats.correct}/${totalAnswers}`;
        }
        if (elements.time) {
            elements.time.textContent = formattedTime;
        }

    }

    reviewMistakes() {
        // Get current session mistakes
        const currentMistakes = this.sessionStats.results.filter(result => !result.correct);
        
        // Combine with historical mistakes
        const allMistakeWords = new Set();
        const allMistakes = [];
        
        // Add current session mistakes
        currentMistakes.forEach(mistake => {
            const key = mistake.word;
            if (!allMistakeWords.has(key)) {
                allMistakeWords.add(key);
                allMistakes.push({
                    swedish: mistake.word,
                    english: mistake.translation,
                    type: 'noun',
                    difficulty: 'medium'
                });
            }
        });
        
        // Add historical mistakes (now stored as JSON with full card info)
        this.mistakeHistory.forEach(mistakeJson => {
            try {
                const mistake = JSON.parse(mistakeJson);
                const key = mistake.swedish;
                if (!allMistakeWords.has(key)) {
                    allMistakeWords.add(key);
                    allMistakes.push({
                        swedish: mistake.swedish,
                        english: mistake.english,
                        type: mistake.type || 'noun',
                        difficulty: mistake.difficulty || 'medium'
                    });
                }
            } catch (error) {
                // Handle legacy format (just swedish word) or corrupted data
                console.warn('Invalid mistake format:', mistakeJson);
            }
        });
        
        if (allMistakes.length === 0) {
            this.showCongratulationsModal();
            return;
        }
        
        this.currentCards = allMistakes;

        // Store original session stats and set review mode
        this.originalSessionStats = { ...this.sessionStats };
        this.isReviewSession = true;

        // Reset session state for review
        this.currentCardIndex = 0;
        this.isProcessingAnswer = false;
        this.sessionStats = {
            startTime: Date.now(),
            correct: 0,
            incorrect: 0,
            results: []
        };

        // Show learning section and hide completion
        this.completionSection.classList.add('hidden');
        this.learningSection.classList.remove('hidden');
        
        // Display first mistake
        this.displayCurrentCard();
        this.updateStats();
    }

    showCongratulationsModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            // Update modal content for congratulations
            const emoji = modal.querySelector('.modal-emoji');
            const title = modal.querySelector('h2');
            const message = modal.querySelector('p');
            const button = modal.querySelector('.custom-modal-button');
            
            if (emoji) emoji.textContent = '🎉';
            if (title) title.textContent = 'Perfect Score!';
            if (message) message.textContent = 'Congratulations! You didn\'t make any mistakes in this session! Keep up the excellent work!';
            if (button) button.textContent = 'Awesome!';
            
            // Show modal
            modal.style.display = 'flex';
            
            // Add close event if not already added
            if (button && !button.hasAttribute('data-congratulations-listener')) {
                button.setAttribute('data-congratulations-listener', 'true');
                button.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
        }
    }

    startNewSession() {
        // Reset everything and go back to setup
        this.completionSection.classList.add('hidden');
        this.learningSection.classList.add('hidden');
        this.setupSection.classList.remove('hidden');

        // Reset state
        this.currentCards = [];
        this.currentCardIndex = 0;
        this.sessionStats = {
            startTime: null,
            correct: 0,
            incorrect: 0,
            results: []
        };
        this.learnedWords = new Set();
        this.isProcessingAnswer = false;
        this.isReviewSession = false;
        this.originalSessionStats = null;
    }
}