/**
 * Swedish Flashcards Learning System
 * Manages the flashcard learning experience including session management,
 * card display, progress tracking, and statistics.
 * 
 * @requires modal.js - Universal modal system for user notifications
 * @requires auth.js - Authentication utilities
 */

// Global functions from modal.js
/* global showError, showAlert, showInfo, showSuccess, showConfirm */
/* global checkAuth, verifyToken */

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
        
        // Check if we're in practice mode (from review mistakes page)
        this.checkPracticeMode();
        
        // Setup initial view
        this.setupSection.classList.remove('hidden');
        this.learningSection.classList.add('hidden');
        this.completionSection.classList.add('hidden');
    }

    loadMistakeHistory() {
        try {
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) {
                this.mistakeHistory = new Set();
                return;
            }
            
            const saved = localStorage.getItem(`swedishLearningMistakes_${userEmail}`);
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
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) return;
            
            const mistakes = Array.from(this.mistakeHistory);
            localStorage.setItem(`swedishLearningMistakes_${userEmail}`, JSON.stringify(mistakes));
        } catch (error) {
            console.error('Failed to save mistake history:', error);
        }
    }

    checkPracticeMode() {
        try {
            const practiceWords = sessionStorage.getItem('practiceWords');
            const practiceMode = sessionStorage.getItem('practiceMode');
            
            if (practiceWords && practiceMode === 'mistakes') {
                const words = JSON.parse(practiceWords);
                console.log('Practice mode detected for words:', words);
                
                // Set up practice session automatically
                this.isPracticeMode = true;
                this.practiceWords = words;
                
                // Update UI to show we're in practice mode
                const setupTitle = document.querySelector('#setupSection h2');
                if (setupTitle) {
                    setupTitle.textContent = 'Practice Your Mistakes';
                }
                
                const setupDescription = document.querySelector('#setupSection p');
                if (setupDescription) {
                    setupDescription.textContent = `Practice the ${words.length} words you got wrong.`;
                }
                
                // Auto-start the session
                this.startPracticeModeSession(words);
                
                // Clear the session storage
                sessionStorage.removeItem('practiceWords');
                sessionStorage.removeItem('practiceMode');
            }
        } catch (error) {
            console.error('Error checking practice mode:', error);
        }
    }

    async startPracticeModeSession(words) {
        this.showLoading(true);
        try {
            console.log('Starting practice mode session with words:', words);
            
            // Create flashcards from the mistake words stored in localStorage
            const mistakes = this.getMistakeCardsForWords(words);
            
            if (mistakes.length === 0) {
                showError('No mistake data found for the selected words.', 'Practice Mode Error');
                return;
            }
            
            this.currentCards = mistakes;
            this.currentCardIndex = 0;
            this.resetSessionStats();
            this.learnedWords.clear();
            this.isPracticeMode = true;
            
            await this.displayCurrentCard();
            
            this.setupSection.classList.add('hidden');
            this.learningSection.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to start practice mode session:', error);
            showError('Failed to start practice session: ' + error.message, 'Practice Mode Error');
        } finally {
            this.showLoading(false);
        }
    }

    getMistakeCardsForWords(words) {
        const mistakes = [];
        
        try {
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) return [];
            
            const saved = localStorage.getItem(`swedishLearningMistakes_${userEmail}`);
            if (!saved) return [];
            
            const mistakeStrings = JSON.parse(saved);
            
            mistakeStrings.forEach(mistakeJson => {
                try {
                    const mistake = JSON.parse(mistakeJson);
                    if (words.includes(mistake.swedish)) {
                        mistakes.push({
                            swedish: mistake.swedish,
                            english: mistake.english,
                            type: mistake.type || 'noun',
                            difficultyLevel: 1
                        });
                    }
                } catch (error) {
                    console.warn('Invalid mistake format:', mistakeJson);
                }
            });
            
            // Remove duplicates
            const uniqueMistakes = mistakes.filter((mistake, index, self) => 
                index === self.findIndex(m => m.swedish === mistake.swedish)
            );
            
            return uniqueMistakes;
        } catch (error) {
            console.error('Error getting mistake cards:', error);
            return [];
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
        this.sentenceExamples = document.getElementById('sentenceExamples');
        this.toggleExamples = document.getElementById('toggleExamples');
        this.examplesContent = document.getElementById('examplesContent');
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
            showError('Failed to start session: ' + error.message, 'Session Error');
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

        // Reset answer state for new card
        this.isAnswerShown = false;
        
        // Reset UI elements
        const flashcard = document.querySelector('.flashcard');
        const cardBack = document.querySelector('.card-back');
        if (flashcard) flashcard.classList.remove('flipped');
        if (cardBack) cardBack.classList.add('hidden');
        if (this.showAnswerBtn) this.showAnswerBtn.classList.remove('hidden');
        if (this.answerButtons) this.answerButtons.classList.add('hidden');

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
        
        // Setup sentence examples
        this.setupSentenceExamples(card);
        
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
        
        // Note: learnedWords is only populated when user answers correctly (see handleAnswerClick)
        // Don't add to learnedWords here - that happens only on correct answers

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
        showAlert('No cards available for your current selection. Try adjusting the difficulty level or number of cards.', 'No Cards Available');
        this.showLoading(false);
    }

    async setupAnswerOptions(card) {
        const buttons = this.answerOptions.querySelectorAll('.answer-button');
        
        try {
            let alternatives = [];
            
            // Try to fetch alternatives from API first
            try {
                const response = await fetch(`/api/learning/alternatives?word=${encodeURIComponent(card.swedish)}&count=3`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('swedishLearningToken')}`
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data) && result.data.length >= 3) {
                        alternatives = result.data.slice(0, 3);
                    }
                }
            } catch (apiError) {
                console.log('API alternatives not available, using fallback');
            }
            
            // If API failed or didn't return enough alternatives, use fallback
            if (alternatives.length < 3) {
                alternatives = this.generateFallbackAlternatives(card.english, card.type);
            }
            
            // Combine correct answer with alternatives
            const answers = [card.english, ...alternatives.slice(0, 3)];
            // Shuffle the answers
            const shuffledAnswers = answers.sort(() => Math.random() - 0.5);
            
            buttons.forEach((button, index) => {
                button.textContent = shuffledAnswers[index];
                button.className = 'answer-button';
                button.dataset.correct = shuffledAnswers[index] === card.english ? 'true' : 'false';
                button.disabled = false;
            });
        } catch (error) {
            console.error('Failed to setup answer options:', error);
            // Final fallback - create simple alternatives
            const fallbackAlternatives = this.generateFallbackAlternatives(card.english, card.type);
            const answers = [card.english, ...fallbackAlternatives.slice(0, 3)];
            const shuffledAnswers = answers.sort(() => Math.random() - 0.5);
            
            buttons.forEach((button, index) => {
                if (index < shuffledAnswers.length) {
                    button.textContent = shuffledAnswers[index];
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
            console.log(`Added "${currentCard.swedish}" to learned words. Total learned: ${this.learnedWords.size}`);
        } else {
            this.sessionStats.incorrect++;
            console.log(`Incorrect answer for "${currentCard.swedish}". Not added to learned words.`);
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
        console.log('Is practice mode:', this.isPracticeMode);
        console.log('Current cards:', this.currentCards.length);
        console.log('Current card index:', this.currentCardIndex);
        
        if (this.isReviewSession) {
            this.completeReviewSession();
            return;
        }

        if (this.isPracticeMode) {
            this.completePracticeModeSession();
            return;
        }

        this.showLoading(true);
        try {
            // Send session results, shown words, and learned words to server
            // Only include cards that were actually shown (up to current index + 1)
            const actuallyShownCards = this.currentCards.slice(0, this.currentCardIndex + 1);
            const shownWords = actuallyShownCards.map(card => card.swedish);
            
            // Validation: Ensure data integrity
            if (this.learnedWords.size > actuallyShownCards.length) {
                console.error('ERROR: More learned words than shown cards!');
                console.error('Learned words:', this.learnedWords.size);
                console.error('Actually shown cards:', actuallyShownCards.length);
                throw new Error('Data integrity error: Cannot have more learned words than shown cards');
            }
            
            const payload = {
                sessionStats: this.sessionStats,
                cards: actuallyShownCards,  // Only cards that were actually shown
                learnedWords: Array.from(this.learnedWords),
                shownWords: shownWords  // Track only words actually shown in this session
            };
            
            console.log('=== SESSION COMPLETION DATA ===');
            console.log('Total cards loaded:', this.currentCards.length);
            console.log('Current card index:', this.currentCardIndex);
            console.log('Cards actually shown:', actuallyShownCards.length);
            console.log('Learned words count:', this.learnedWords.size);
            console.log('Session correct answers:', this.sessionStats.correct);
            
            // Validation: learned words should equal correct answers
            if (this.learnedWords.size !== this.sessionStats.correct) {
                console.warn('WARNING: Learned words count does not match correct answers count!');
                console.warn('Learned words:', Array.from(this.learnedWords));
                console.warn('Correct results:', this.sessionStats.results.filter(r => r.correct).map(r => r.word));
            }
            
            console.log('Payload being sent:', JSON.stringify(payload, null, 2));
            
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

    completePracticeModeSession() {
        // Show completion screen for practice mode
        this.setupSection.classList.add('hidden');
        this.learningSection.classList.add('hidden');
        this.completionSection.classList.remove('hidden');
        
        // Display session stats
        this.displaySessionStats();
        
        // Show practice mode completion message
        this.showPracticeModeCompletionModal();
    }

    showPracticeModeCompletionModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            // Update modal content for practice mode completion
            const emoji = modal.querySelector('.modal-emoji');
            const title = modal.querySelector('h2');
            const message = modal.querySelector('p');
            const button = modal.querySelector('.custom-modal-button');
            
            const totalPracticed = this.sessionStats.correct + this.sessionStats.incorrect;
            const practiceAccuracy = totalPracticed > 0 ? (this.sessionStats.correct / totalPracticed * 100).toFixed(1) : '0';
            
            if (emoji) emoji.textContent = '🎯';
            if (title) title.textContent = 'Practice Complete!';
            if (message) {
                message.textContent = `You practiced ${totalPracticed} mistake${totalPracticed !== 1 ? 's' : ''} with ${practiceAccuracy}% accuracy. Keep improving!`;
            }
            if (button) button.textContent = 'Back to Review';
            
            // Show modal
            modal.style.display = 'flex';
            
            // Add close event if not already added
            if (button && !button.hasAttribute('data-practice-listener')) {
                button.setAttribute('data-practice-listener', 'true');
                button.addEventListener('click', () => {
                    modal.style.display = 'none';
                    // Go back to review mistakes page
                    window.location.href = 'review-mistakes.html';
                });
            }
        }
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
        // If in practice mode, return to review mistakes page
        if (this.isPracticeMode) {
            window.location.href = 'review-mistakes.html';
            return;
        }

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
        this.isPracticeMode = false;
        this.practiceWords = null;
        
        // Reset UI text
        const setupTitle = document.querySelector('#setupSection h2');
        if (setupTitle) {
            setupTitle.textContent = 'Practice Flashcards';
        }
        
        const setupDescription = document.querySelector('#setupSection p');
        if (setupDescription) {
            setupDescription.textContent = 'Test your Swedish vocabulary with interactive flashcards.';
        }
    }

    /**
     * Generates fallback alternative answers when API is not available
     * @param {string} correctAnswer - The correct English translation
     * @param {string} wordType - Type of word (noun, verb, etc.)
     * @returns {Array<string>} Array of 3 alternative wrong answers
     */
    generateFallbackAlternatives(correctAnswer, wordType = '') {
        // Common fallback alternatives based on word type and common Swedish-English patterns
        const commonAlternatives = {
            nouns: ['house', 'book', 'table', 'chair', 'window', 'door', 'car', 'tree', 'water', 'food', 'hand', 'head', 'eye', 'day', 'night', 'time', 'work', 'home', 'school', 'friend'],
            verbs: ['to go', 'to come', 'to see', 'to take', 'to give', 'to make', 'to know', 'to think', 'to say', 'to get', 'to work', 'to play', 'to eat', 'to drink', 'to sleep', 'to run', 'to walk', 'to read', 'to write', 'to help'],
            adjectives: ['good', 'bad', 'big', 'small', 'new', 'old', 'hot', 'cold', 'fast', 'slow', 'easy', 'hard', 'happy', 'sad', 'nice', 'beautiful', 'ugly', 'clean', 'dirty', 'free'],
            common: ['hello', 'goodbye', 'yes', 'no', 'please', 'thank you', 'sorry', 'excuse me', 'how', 'what', 'where', 'when', 'who', 'why', 'much', 'many', 'some', 'all', 'every', 'other']
        };

        // Determine appropriate pool of alternatives
        let alternativePool = [...commonAlternatives.common];
        
        if (wordType && (wordType.toLowerCase().includes('noun') || /^(a |an |the )/.test(correctAnswer))) {
            alternativePool = [...alternativePool, ...commonAlternatives.nouns];
        } else if (wordType && (wordType.toLowerCase().includes('verb') || correctAnswer.startsWith('to '))) {
            alternativePool = [...alternativePool, ...commonAlternatives.verbs];
        } else if (wordType && wordType.toLowerCase().includes('adjective')) {
            alternativePool = [...alternativePool, ...commonAlternatives.adjectives];
        } else {
            // Mix all types for unknown word types
            alternativePool = [
                ...alternativePool,
                ...commonAlternatives.nouns.slice(0, 5),
                ...commonAlternatives.verbs.slice(0, 5),
                ...commonAlternatives.adjectives.slice(0, 5)
            ];
        }

        // Remove the correct answer if it exists in the pool
        alternativePool = alternativePool.filter(word => 
            word.toLowerCase() !== correctAnswer.toLowerCase()
        );

        // Shuffle and return 3 alternatives
        const shuffled = alternativePool.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
    }

    /**
     * Setup sentence examples section for the current word
     * @param {Object} card - Current flashcard data
     */
    setupSentenceExamples(card) {
        if (!this.sentenceExamples || !this.toggleExamples || !this.examplesContent) {
            return;
        }

        // Show the sentence examples section
        this.sentenceExamples.style.display = 'block';
        
        // Reset toggle button and examples content
        this.toggleExamples.textContent = 'Show Examples';
        this.examplesContent.classList.remove('expanded');
        this.examplesContent.innerHTML = '<div class="loading-examples">Loading examples...</div>';
        
        // Set up toggle functionality
        this.toggleExamples.onclick = () => this.toggleSentenceExamples(card);
    }

    /**
     * Toggle sentence examples visibility and load if needed
     * @param {Object} card - Current flashcard data
     */
    async toggleSentenceExamples(card) {
        const isExpanded = this.examplesContent.classList.contains('expanded');
        
        if (isExpanded) {
            // Hide examples
            this.examplesContent.classList.remove('expanded');
            this.toggleExamples.textContent = 'Show Examples';
        } else {
            // Show examples
            this.toggleExamples.textContent = 'Hide Examples';
            this.examplesContent.classList.add('expanded');
            
            // Load examples if not already loaded or if content is just loading message
            if (this.examplesContent.innerHTML.includes('Loading examples...')) {
                await this.loadSentenceExamples(card);
            }
        }
    }

    /**
     * Fetch and display sentence examples for the current word
     * @param {Object} card - Current flashcard data
     */
    async loadSentenceExamples(card) {
        try {
            const token = localStorage.getItem('swedishLearningToken');
            const response = await fetch(`/api/learning/sentences?word=${encodeURIComponent(card.swedish)}&count=3`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch sentence examples');
            }

            const result = await response.json();
            
            if (result.success && result.data.sentences) {
                this.displaySentenceExamples(result.data.sentences);
            } else {
                throw new Error('No sentence examples available');
            }
        } catch (error) {
            console.error('Error loading sentence examples:', error);
            this.examplesContent.innerHTML = `
                <div class="examples-error">
                    Unable to load examples for this word. Please try again later.
                </div>
            `;
        }
    }

    /**
     * Display sentence examples in the UI
     * @param {Array} sentences - Array of sentence objects
     */
    displaySentenceExamples(sentences) {
        if (!sentences || sentences.length === 0) {
            this.examplesContent.innerHTML = `
                <div class="examples-error">
                    No examples available for this word.
                </div>
            `;
            return;
        }

        const sentencesHtml = sentences.map(sentence => `
            <div class="sentence-item">
                <div class="sentence-swedish">${sentence.swedish}</div>
                <div class="sentence-english">${sentence.english}</div>
                <span class="sentence-difficulty ${sentence.difficulty}">${sentence.difficulty}</span>
            </div>
        `).join('');

        this.examplesContent.innerHTML = sentencesHtml;
    }
}