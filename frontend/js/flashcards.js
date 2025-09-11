// Flashcard Learning System
class FlashcardLearning {
    constructor() {
        // Initialize state
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
        
        // Initialize UI elements and attach event listeners
        this.initializeElements();
        this.attachEventListeners();
        
        // Set initial visibility
        if (this.setupSection) {
            this.setupSection.classList.remove('hidden');
        }
        if (this.learningSection) {
            this.learningSection.classList.add('hidden');
        }
        if (this.completionSection) {
            this.completionSection.classList.add('hidden');
        }

        // Check authentication immediately
        this.checkAuthAndRedirect();
    }

    async checkAuthAndRedirect() {
        const token = localStorage.getItem('swedishLearningToken');
        if (!token) {
            window.location.href = 'index.html';
            return;
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
                throw new Error('Unauthorized');
            }

            const data = await response.json();
            if (this.userWelcome && data.data) {
                this.userWelcome.textContent = `Welcome, ${data.data.email}!`;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('swedishLearningToken');
            window.location.href = 'index.html';
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

        if (!this.logoutBtn || !this.userWelcome) {
            console.error('Critical UI elements missing');
        }
    }
    
    attachEventListeners() {
        if (this.startLearningBtn) {
            this.startLearningBtn.addEventListener('click', () => {
                console.log('Start Learning button clicked');
                this.startLearningSession();
            });
        }

        if (this.newSessionBtn) {
            this.newSessionBtn.addEventListener('click', () => this.resetSession());
        }

        if (this.reviewMistakesBtn) {
            this.reviewMistakesBtn.addEventListener('click', () => this.reviewMistakes());
        }

        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
            console.log('Logout button listener attached');
        }

        if (this.showAnswerBtn) {
            this.showAnswerBtn.addEventListener('click', () => this.showAnswer());
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.learningSection && this.learningSection.classList.contains('hidden')) return;
            
            switch(e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    if (!this.isAnswerShown) {
                        this.showAnswer();
                    }
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                    e.preventDefault();
                    if (this.isAnswerShown) {
                        const index = parseInt(e.key) - 1;
                        if (index >= 0 && index < 4) {
                            this.handleAnswer(index === this.correctAnswerIndex);
                        }
                    }
                    break;
            }
        });
    }
    
    async startLearningSession() {
        console.log('Starting learning session...');
        if (!this.cardCountSelect || !this.difficultySelect) {
            console.error('Required elements not found');
            alert('Error: Required elements not found. Please refresh the page.');
            return;
        }

        this.showLoading(true);
        
        try {
            const limit = this.cardCountSelect.value;
            const difficulty = this.difficultySelect.value;
            const token = localStorage.getItem('swedishLearningToken');
            
            if (!token) {
                console.error('No token found');
                window.location.href = 'index.html';
                return;
            }

            console.log('Fetching flashcards with:', { limit, difficulty });

            const response = await fetch(`/api/learning/flashcards?limit=${limit}&difficulty=${difficulty}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch flashcards: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received flashcards:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch flashcards');
            }
            
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
        if (this.setupSection) this.setupSection.classList.add('hidden');
        if (this.learningSection) this.learningSection.classList.remove('hidden');
        if (this.completionSection) this.completionSection.classList.add('hidden');
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async displayCurrentCard() {
        console.log('Displaying card index:', this.currentCardIndex);
        
        if (this.currentCardIndex >= this.currentCards.length) {
            console.log('Reached end of cards, completing session');
            await this.completeSession();
            return;
        }
        
        const card = this.currentCards[this.currentCardIndex];
        
        if (!card) {
            console.log('No card found, completing session');
            await this.completeSession();
            return;
        }
        
        this.isProcessingAnswer = false;
        this.isAnswerShown = false;
        
        this.wordType.textContent = card.type || '';
        this.wordText.textContent = card.swedish;
        this.difficultyBadge.textContent = `Level ${card.difficultyLevel}`;
        this.translation.textContent = card.english;
        
        console.log('Displaying card:', {
            index: this.currentCardIndex,
            swedish: card.swedish,
            english: card.english
        });
        
        try {
            const wrongAnswers = await this.getWrongAnswers(card);
            console.log('Wrong answers received:', wrongAnswers);
            
            const allAnswers = [card.english, ...wrongAnswers];
            const shuffledAnswers = this.shuffleArray([...allAnswers]);
            console.log('Shuffled answers:', shuffledAnswers);
            
            this.correctAnswerIndex = shuffledAnswers.indexOf(card.english);
            console.log('Correct answer index:', this.correctAnswerIndex);
            
            this.answerButtons.innerHTML = '';
            
            shuffledAnswers.forEach((answer, index) => {
                const button = document.createElement('button');
                button.className = 'answer-button';
                button.textContent = answer;
                button.setAttribute('data-index', index.toString());
                button.addEventListener('click', () => this.handleAnswer(index === this.correctAnswerIndex));
                this.answerButtons.appendChild(button);
            });
            
            this.answerButtons.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error preparing multiple choice answers:', error);
        }
        
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
        
        this.cardFront.classList.remove('hidden');
        this.cardBack.classList.add('hidden');
        this.showAnswerBtn.classList.add('hidden');
        
        this.updateProgress();
    }

    async getWrongAnswers(correctCard) {
        try {
            console.log('Fetching alternatives for:', correctCard);
            const token = localStorage.getItem('swedishLearningToken');
            
            const response = await fetch(`/api/learning/alternatives?wordId=${correctCard.id}&count=3`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch alternatives');
            }

            const data = await response.json();
            console.log('Received alternatives:', data);

            if (!data.success) {
                throw new Error(data.error || 'Failed to get alternatives');
            }

            let wrongAnswers = data.data;
            
            wrongAnswers = (Array.isArray(wrongAnswers) ? wrongAnswers : [])
                .filter(answer => answer && answer.toLowerCase() !== correctCard.english.toLowerCase());

            if (wrongAnswers.length < 3) {
                console.log('Not enough alternatives, trying fallback');
                const fallbackResponse = await fetch(`/api/learning/alternatives?wordId=${correctCard.id}&count=5&skipTypeMatch=true`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.success && Array.isArray(fallbackData.data)) {
                        const fallbackAnswers = fallbackData.data.filter(answer => 
                            answer && 
                            answer.toLowerCase() !== correctCard.english.toLowerCase() &&
                            !wrongAnswers.includes(answer)
                        );
                        
                        while (wrongAnswers.length < 3 && fallbackAnswers.length > 0) {
                            wrongAnswers.push(fallbackAnswers.pop());
                        }
                    }
                }
            }

            if (wrongAnswers.length === 0) {
                return [
                    'Need more words in database',
                    'Please add more words',
                    'Database needs more content'
                ];
            }

            return wrongAnswers.slice(0, 3);

        } catch (error) {
            console.error('Error fetching alternatives:', error);
            return [
                'Error loading alternatives',
                'Please try again',
                'Database connection error'
            ];
        }
    }
    
    async handleAnswer(isCorrect) {
        if (this.isProcessingAnswer) {
            console.log('Already processing an answer, ignoring click');
            return;
        }
        
        this.isProcessingAnswer = true;
        
        try {
            const currentCard = this.currentCards[this.currentCardIndex];
            
            this.sessionStats.results.push({
                word: currentCard,
                isCorrect: isCorrect,
                timestamp: new Date()
            });
            
            if (isCorrect) {
                this.sessionStats.correct++;
            } else {
                this.sessionStats.incorrect++;
            }
            
            // Update UI to show the correct answer
            const buttons = this.answerButtons.querySelectorAll('.answer-button');
            buttons.forEach((button, index) => {
                button.disabled = true;
                if (index === this.correctAnswerIndex) {
                    button.classList.add('correct');
                } else if (!isCorrect && index === parseInt(button.getAttribute('data-index'))) {
                    button.classList.add('incorrect');
                }
            });
            
            this.updateProgress();
            this.updateStats();
            
            // Submit progress to the server
            const token = localStorage.getItem('swedishLearningToken');
            if (token) {
                try {
                    const progressResponse = await fetch('/api/progress/practice-word', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            wordId: currentCard.id,
                            isCorrect: isCorrect
                        })
                    });
                    
                    if (!progressResponse.ok) {
                        console.error('Failed to update progress');
                    }
                } catch (error) {
                    console.error('Error updating progress:', error);
                }
            }
            
            // Move to next card after delay
            const delay = isCorrect ? 1000 : 2000;
            setTimeout(() => {
                this.currentCardIndex++;
                this.displayCurrentCard();
            }, delay);
            
        } catch (error) {
            console.error('Error processing answer:', error);
        } finally {
            this.isProcessingAnswer = false;
        }
    }
    
    updateProgress() {
        if (!this.progressFill || !this.progressText) return;
        
        if (this.currentCards.length === 0) {
            this.progressFill.style.width = '0%';
            this.progressText.textContent = '0 / 0';
            return;
        }

        const cardsAnswered = this.currentCardIndex;
        const totalCards = this.currentCards.length;
        const progress = (cardsAnswered / totalCards) * 100;
        
        this.progressFill.style.width = `${progress}%`;
        const currentCardNum = this.currentCardIndex + 1;
        this.progressText.textContent = `${currentCardNum} / ${totalCards}`;
    }
    
    updateStats() {
        if (!this.correctCount || !this.incorrectCount || !this.accuracy) return;

        const correct = this.sessionStats.correct || 0;
        const incorrect = this.sessionStats.incorrect || 0;
        const total = correct + incorrect;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        this.correctCount.textContent = correct.toString();
        this.incorrectCount.textContent = incorrect.toString();
        this.accuracy.textContent = `${accuracy}%`;
    }
    
    async completeSession() {
        this.showLoading(true);
        
        try {
            const endTime = new Date();
            const timeSpent = Math.round((endTime - this.sessionStats.startTime) / 1000);
            const token = localStorage.getItem('swedishLearningToken');
            
            if (token) {
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
                this.showCompletionScreen(data.data, timeSpent);
            } else {
                throw new Error('No authentication token found');
            }
            
        } catch (error) {
            console.error('Error completing session:', error);
            const timeSpent = Math.round((new Date() - this.sessionStats.startTime) / 1000);
            this.showCompletionScreen(null, timeSpent);
        } finally {
            this.showLoading(false);
        }
    }
    
    showCompletionScreen(sessionData, timeSpent) {
        const total = this.sessionStats.correct + this.sessionStats.incorrect;
        const score = total > 0 ? Math.round((this.sessionStats.correct / total) * 100) : 0;
        
        if (this.finalScore) this.finalScore.textContent = `${score}%`;
        if (this.finalCorrect) this.finalCorrect.textContent = `${this.sessionStats.correct}/${total}`;
        if (this.finalTime) this.finalTime.textContent = this.formatTime(timeSpent);
        
        if (this.learningSection) this.learningSection.classList.add('hidden');
        if (this.completionSection) this.completionSection.classList.remove('hidden');
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    resetSession() {
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
        
        this.updateProgress();
        this.updateStats();
        
        if (this.setupSection) this.setupSection.classList.remove('hidden');
        if (this.learningSection) this.learningSection.classList.add('hidden');
        if (this.completionSection) this.completionSection.classList.add('hidden');
    }
    
    showSuccessModal() {
        const modal = document.getElementById('successModal');
        const closeBtn = document.getElementById('successModalCloseBtn');
        
        if (modal) {
            modal.classList.add('show');
            
            const handleClose = () => {
                modal.classList.remove('show');
                closeBtn.removeEventListener('click', handleClose);
            };
            
            closeBtn.addEventListener('click', handleClose);
        }
    }

    reviewMistakes() {
        const mistakes = this.sessionStats.results.filter(result => !result.isCorrect);
        
        if (mistakes.length === 0) {
            this.showSuccessModal();
            return;
        }
        
        this.currentCards = mistakes.map(mistake => mistake.word);
        this.resetSessionStats();
        this.showLearningInterface();
        this.displayCurrentCard();
    }
    
    showLoading(show) {
        if (this.loadingOverlay) {
            if (show) {
                this.loadingOverlay.classList.remove('hidden');
            } else {
                this.loadingOverlay.classList.add('hidden');
            }
        }
    }
    
    logout() {
        console.log('Logging out...');
        localStorage.removeItem('swedishLearningToken');
        window.location.href = 'index.html';
    }

    showAnswer() {
        if (this.isAnswerShown) return;
        
        this.isAnswerShown = true;
        if (this.cardBack) this.cardBack.classList.remove('hidden');
        if (this.showAnswerBtn) this.showAnswerBtn.classList.add('hidden');
        if (this.answerButtons) this.answerButtons.classList.remove('hidden');
    }
}

// Initialize the flashcard system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FlashcardLearning();
});
