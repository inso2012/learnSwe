/**
 * Swedish Flashcards Learning System
 * Manages the flashcard learning experience including session management,
 * card display, progress tracking, and statistics.
 */
import { apiFetch } from './api.js';
import { checkAuth, verifyToken } from './auth.js';
import { showError, showAlert } from './modal.js';
import './nav.js';

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const isAuth = await checkAuth();
        if (!isAuth) return;

        const storedEmail = localStorage.getItem('userEmail');
        if (!storedEmail) {
            await verifyToken();
        }

        const app = new FlashcardLearning();
    } catch (error) {
        console.error('Failed to initialize:', error);
        window.location.href = 'index.html';
    }
});

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
        this.correctAnswerIndex = null;
        this.isProcessingAnswer = false;
        this.learnedWords = new Set();
        this.isReviewSession = false;
        this.originalSessionStats = null;
        this.mistakeHistory = new Set();

        this.loadMistakeHistory();
        this.initializeElements();
        this.attachEventListeners();
        this.updateUserInfo();
        this.checkPracticeMode();

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

                this.isPracticeMode = true;
                this.practiceWords = words;

                const setupTitle = document.querySelector('#setupSection h2');
                if (setupTitle) {
                    setupTitle.textContent = 'Practice Your Mistakes';
                }

                const setupDescription = document.querySelector('#setupSection p');
                if (setupDescription) {
                    setupDescription.textContent = `Practice the ${words.length} words you got wrong.`;
                }

                this.startPracticeModeSession(words);

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
        const userEmailElement = document.getElementById('userEmail');

        if (userEmail && userEmailElement) {
            userEmailElement.textContent = userEmail;
        }
    }

    attachEventListeners() {
        if (this.startButton) {
            this.startButton.addEventListener('click', () => this.startLearningSession());
        }

        const reviewMistakesBtn = document.getElementById('reviewMistakesBtn');
        if (reviewMistakesBtn) {
            reviewMistakesBtn.addEventListener('click', () => this.reviewMistakes());
        }

        const newSessionBtn = document.getElementById('newSessionBtn');
        if (newSessionBtn) {
            newSessionBtn.addEventListener('click', () => this.startNewSession());
        }

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
            const count = parseInt(this.cardCount.value);
            const difficulty = document.getElementById('difficulty').value;

            const response = await apiFetch(`/api/learning/flashcards?limit=${count}&difficulty=${difficulty}`);

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
            this.learnedWords.clear();
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

        this.isAnswerShown = false;

        const flashcard = document.querySelector('.flashcard');
        const cardBack = document.querySelector('.card-back');
        if (flashcard) flashcard.classList.remove('flipped');
        if (cardBack) cardBack.classList.add('hidden');
        if (this.showAnswerBtn) this.showAnswerBtn.classList.remove('hidden');
        if (this.answerButtons) this.answerButtons.classList.add('hidden');

        if (this.wordType) this.wordType.textContent = card.type || 'word';
        if (this.wordText) this.wordText.textContent = card.swedish;
        if (this.difficultyBadge) this.difficultyBadge.textContent = `Level ${card.difficultyLevel || 1}`;

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

        await this.setupAnswerOptions(card);
        this.setupSentenceExamples(card);
        this.updateProgress();
    }

    showAnswer() {
        const flashcard = document.querySelector('.flashcard');
        const cardBack = document.querySelector('.card-back');
        if (flashcard) flashcard.classList.add('flipped');
        if (cardBack) cardBack.classList.remove('hidden');

        if (this.showAnswerBtn) this.showAnswerBtn.classList.add('hidden');
        if (this.answerButtons) {
            this.answerButtons.classList.remove('hidden');
            this.setupAnswerButtons(this.currentCards[this.currentCardIndex]);
        }

        this.isAnswerShown = true;
    }

    nextCard() {
        const currentCard = this.currentCards[this.currentCardIndex];

        if (this.currentCardIndex < this.currentCards.length - 1) {
            this.currentCardIndex++;
            this.displayCurrentCard();

            if (this.answerOptions) {
                const buttons = this.answerOptions.querySelectorAll('.answer-button');
                buttons.forEach(btn => {
                    btn.disabled = false;
                    btn.className = 'answer-button';
                });
            }

            if (this.showAnswerBtn) {
                this.showAnswerBtn.classList.remove('hidden');
            }
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
        showAlert('No cards available for your current selection. Try adjusting the difficulty level or number of cards.', 'No Cards Available');
        this.showLoading(false);
    }

    async setupAnswerOptions(card) {
        const buttons = this.answerOptions.querySelectorAll('.answer-button');

        try {
            let alternatives = [];

            try {
                const response = await apiFetch(`/api/learning/alternatives?word=${encodeURIComponent(card.swedish)}&count=3`);

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data) && result.data.length >= 3) {
                        alternatives = result.data.slice(0, 3);
                    }
                }
            } catch (apiError) {
                console.log('API alternatives not available, using fallback');
            }

            if (alternatives.length < 3) {
                alternatives = this.generateFallbackAlternatives(card.english, card.type);
            }

            const answers = [card.english, ...alternatives.slice(0, 3)];
            const shuffledAnswers = answers.sort(() => Math.random() - 0.5);

            buttons.forEach((button, index) => {
                button.textContent = shuffledAnswers[index];
                button.className = 'answer-button';
                button.dataset.correct = shuffledAnswers[index] === card.english ? 'true' : 'false';
                button.disabled = false;
            });
        } catch (error) {
            console.error('Failed to setup answer options:', error);
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

        button.classList.add(isCorrect ? 'correct' : 'incorrect');

        if (isCorrect) {
            this.sessionStats.correct++;
            this.learnedWords.add(currentCard.swedish);
        } else {
            this.sessionStats.incorrect++;
        }

        this.updateStats();

        this.sessionStats.results.push({
            word: currentCard.swedish,
            translation: currentCard.english,
            correct: isCorrect,
            timestamp: Date.now()
        });

        const buttons = this.answerOptions.querySelectorAll('.answer-button');
        buttons.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.correct === 'true') {
                btn.classList.add('correct');
            }
        });

        if (this.isReviewSession) {
            if (isCorrect) {
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
                this.mistakeHistory.add(JSON.stringify({
                    swedish: currentCard.swedish,
                    english: currentCard.english,
                    type: currentCard.type,
                    difficulty: currentCard.difficulty
                }));
            }
        } else {
            if (!isCorrect) {
                this.mistakeHistory.add(JSON.stringify({
                    swedish: currentCard.swedish,
                    english: currentCard.english,
                    type: currentCard.type,
                    difficulty: currentCard.difficulty
                }));
            }
        }

        this.saveMistakeHistory();

        await new Promise(resolve => setTimeout(resolve, 1500));

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
            const actuallyShownCards = this.currentCards.slice(0, this.currentCardIndex + 1);
            const shownWords = actuallyShownCards.map(card => card.swedish);

            if (this.learnedWords.size > actuallyShownCards.length) {
                throw new Error('Data integrity error: Cannot have more learned words than shown cards');
            }

            const payload = {
                sessionStats: this.sessionStats,
                cards: actuallyShownCards,
                learnedWords: Array.from(this.learnedWords),
                shownWords: shownWords
            };

            const response = await apiFetch('/api/progress/flashcards', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`Failed to save session results: ${response.status} ${errorText}`);
            }

            this.setupSection.classList.add('hidden');
            this.learningSection.classList.add('hidden');
            this.completionSection.classList.remove('hidden');

            this.displaySessionStats();
        } catch (error) {
            console.error('Failed to complete session:', error);
        } finally {
            this.showLoading(false);
        }
    }

    completeReviewSession() {
        const reviewStats = { ...this.sessionStats };
        this.sessionStats = this.originalSessionStats;
        this.isReviewSession = false;
        this.originalSessionStats = null;

        this.setupSection.classList.add('hidden');
        this.learningSection.classList.add('hidden');
        this.completionSection.classList.remove('hidden');

        this.displaySessionStats();
        this.showReviewCompletionModal(reviewStats);
    }

    completePracticeModeSession() {
        this.setupSection.classList.add('hidden');
        this.learningSection.classList.add('hidden');
        this.completionSection.classList.remove('hidden');

        this.displaySessionStats();
        this.showPracticeModeCompletionModal();
    }

    showPracticeModeCompletionModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            const emoji = modal.querySelector('.modal-emoji');
            const title = modal.querySelector('h2');
            const message = modal.querySelector('p');
            const button = modal.querySelector('.custom-modal-button');

            const totalPracticed = this.sessionStats.correct + this.sessionStats.incorrect;
            const practiceAccuracy = totalPracticed > 0 ? (this.sessionStats.correct / totalPracticed * 100).toFixed(1) : '0';

            if (emoji) emoji.textContent = '';
            if (title) title.textContent = 'Practice Complete!';
            if (message) {
                message.textContent = `You practiced ${totalPracticed} mistake${totalPracticed !== 1 ? 's' : ''} with ${practiceAccuracy}% accuracy. Keep improving!`;
            }
            if (button) button.textContent = 'Back to Review';

            modal.style.display = 'flex';

            if (button && !button.hasAttribute('data-practice-listener')) {
                button.setAttribute('data-practice-listener', 'true');
                button.addEventListener('click', () => {
                    modal.style.display = 'none';
                    window.location.href = 'review-mistakes.html';
                });
            }
        }
    }

    showReviewCompletionModal(reviewStats) {
        const modal = document.getElementById('successModal');
        if (modal) {
            const emoji = modal.querySelector('.modal-emoji');
            const title = modal.querySelector('h2');
            const message = modal.querySelector('p');
            const button = modal.querySelector('.custom-modal-button');

            const totalReviewed = reviewStats.correct + reviewStats.incorrect;
            const reviewAccuracy = totalReviewed > 0 ? (reviewStats.correct / totalReviewed * 100).toFixed(1) : '0';

            if (emoji) emoji.textContent = '';
            if (title) title.textContent = 'Review Complete!';
            if (message) {
                message.textContent = `You reviewed ${totalReviewed} mistake${totalReviewed !== 1 ? 's' : ''} with ${reviewAccuracy}% accuracy. Great job working on those challenging words!`;
            }
            if (button) button.textContent = 'Continue';

            modal.style.display = 'flex';

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

        const minutes = Math.floor(timeSpent / 60);
        const seconds = timeSpent % 60;
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const els = {
            score: document.getElementById('finalScore'),
            correct: document.getElementById('finalCorrect'),
            time: document.getElementById('finalTime')
        };

        if (els.score) {
            els.score.textContent = `${accuracy.toFixed(1)}%`;
        }
        if (els.correct) {
            els.correct.textContent = `${this.sessionStats.correct}/${totalAnswers}`;
        }
        if (els.time) {
            els.time.textContent = formattedTime;
        }
    }

    reviewMistakes() {
        const currentMistakes = this.sessionStats.results.filter(result => !result.correct);

        const allMistakeWords = new Set();
        const allMistakes = [];

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
                console.warn('Invalid mistake format:', mistakeJson);
            }
        });

        if (allMistakes.length === 0) {
            this.showCongratulationsModal();
            return;
        }

        this.currentCards = allMistakes;

        this.originalSessionStats = { ...this.sessionStats };
        this.isReviewSession = true;

        this.currentCardIndex = 0;
        this.isProcessingAnswer = false;
        this.sessionStats = {
            startTime: Date.now(),
            correct: 0,
            incorrect: 0,
            results: []
        };

        this.completionSection.classList.add('hidden');
        this.learningSection.classList.remove('hidden');

        this.displayCurrentCard();
        this.updateStats();
    }

    showCongratulationsModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            const emoji = modal.querySelector('.modal-emoji');
            const title = modal.querySelector('h2');
            const message = modal.querySelector('p');
            const button = modal.querySelector('.custom-modal-button');

            if (emoji) emoji.textContent = '';
            if (title) title.textContent = 'Perfect Score!';
            if (message) message.textContent = 'Congratulations! You didn\'t make any mistakes in this session! Keep up the excellent work!';
            if (button) button.textContent = 'Awesome!';

            modal.style.display = 'flex';

            if (button && !button.hasAttribute('data-congratulations-listener')) {
                button.setAttribute('data-congratulations-listener', 'true');
                button.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
        }
    }

    startNewSession() {
        if (this.isPracticeMode) {
            window.location.href = 'review-mistakes.html';
            return;
        }

        this.completionSection.classList.add('hidden');
        this.learningSection.classList.add('hidden');
        this.setupSection.classList.remove('hidden');

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

        const setupTitle = document.querySelector('#setupSection h2');
        if (setupTitle) {
            setupTitle.textContent = 'Practice Flashcards';
        }

        const setupDescription = document.querySelector('#setupSection p');
        if (setupDescription) {
            setupDescription.textContent = 'Test your Swedish vocabulary with interactive flashcards.';
        }
    }

    generateFallbackAlternatives(correctAnswer, wordType = '') {
        const commonAlternatives = {
            nouns: ['house', 'book', 'table', 'chair', 'window', 'door', 'car', 'tree', 'water', 'food', 'hand', 'head', 'eye', 'day', 'night', 'time', 'work', 'home', 'school', 'friend'],
            verbs: ['to go', 'to come', 'to see', 'to take', 'to give', 'to make', 'to know', 'to think', 'to say', 'to get', 'to work', 'to play', 'to eat', 'to drink', 'to sleep', 'to run', 'to walk', 'to read', 'to write', 'to help'],
            adjectives: ['good', 'bad', 'big', 'small', 'new', 'old', 'hot', 'cold', 'fast', 'slow', 'easy', 'hard', 'happy', 'sad', 'nice', 'beautiful', 'ugly', 'clean', 'dirty', 'free'],
            common: ['hello', 'goodbye', 'yes', 'no', 'please', 'thank you', 'sorry', 'excuse me', 'how', 'what', 'where', 'when', 'who', 'why', 'much', 'many', 'some', 'all', 'every', 'other']
        };

        let alternativePool = [...commonAlternatives.common];

        if (wordType && (wordType.toLowerCase().includes('noun') || /^(a |an |the )/.test(correctAnswer))) {
            alternativePool = [...alternativePool, ...commonAlternatives.nouns];
        } else if (wordType && (wordType.toLowerCase().includes('verb') || correctAnswer.startsWith('to '))) {
            alternativePool = [...alternativePool, ...commonAlternatives.verbs];
        } else if (wordType && wordType.toLowerCase().includes('adjective')) {
            alternativePool = [...alternativePool, ...commonAlternatives.adjectives];
        } else {
            alternativePool = [
                ...alternativePool,
                ...commonAlternatives.nouns.slice(0, 5),
                ...commonAlternatives.verbs.slice(0, 5),
                ...commonAlternatives.adjectives.slice(0, 5)
            ];
        }

        alternativePool = alternativePool.filter(word =>
            word.toLowerCase() !== correctAnswer.toLowerCase()
        );

        const shuffled = alternativePool.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
    }

    setupSentenceExamples(card) {
        if (!this.sentenceExamples || !this.toggleExamples || !this.examplesContent) {
            return;
        }

        this.sentenceExamples.style.display = 'block';

        this.toggleExamples.textContent = 'Show Examples';
        this.examplesContent.classList.remove('expanded');
        this.examplesContent.innerHTML = '<div class="loading-examples">Loading examples...</div>';

        this.toggleExamples.onclick = () => this.toggleSentenceExamples(card);
    }

    async toggleSentenceExamples(card) {
        const isExpanded = this.examplesContent.classList.contains('expanded');

        if (isExpanded) {
            this.examplesContent.classList.remove('expanded');
            this.toggleExamples.textContent = 'Show Examples';
        } else {
            this.toggleExamples.textContent = 'Hide Examples';
            this.examplesContent.classList.add('expanded');

            if (this.examplesContent.innerHTML.includes('Loading examples...')) {
                await this.loadSentenceExamples(card);
            }
        }
    }

    async loadSentenceExamples(card) {
        try {
            const response = await apiFetch(`/api/learning/sentences?word=${encodeURIComponent(card.swedish)}&count=3`);

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
