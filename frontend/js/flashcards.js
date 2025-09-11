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
        
        this.initializeElements();
        this.attachEventListeners();
        
        // Show setup section by default and hide others
        this.setupSection.classList.remove('hidden');
        this.learningSection.classList.add('hidden');
        this.completionSection.classList.add('hidden');
        
        // Call the async initialization method
        this.init();
    }
    
    async init() {
        this.showLoading(true);
        try {
            const isAuthenticated = await this.checkAuth();
            if (isAuthenticated) {
                document.body.classList.remove('loading');
                this.showLoading(false);
            }
        } catch (error) {
            console.error('Initialization failed:', error);
            this.logout();
        }
    }

    async checkAuth() {
        const token = localStorage.getItem('swedishLearningToken');
        if (!token) {
            window.location.href = 'index.html';
            return false;
        }

        try {
            const response = await fetch('/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Profile fetch failed');
            }

            const data = await response.json();
            if (this.userWelcome && data.data) {
                this.userWelcome.textContent = `Welcome, ${data.data.email || 'User'}!`;
            }
            return true;

        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    initializeElements() {
        // Initialize all UI elements
        this.setupSection = document.getElementById('setupSection');
        this.learningSection = document.getElementById('learningSection');
        this.completionSection = document.getElementById('completionSection');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.cardCountSelect = document.getElementById('cardCount');
        this.difficultySelect = document.getElementById('difficulty');
        this.startLearningBtn = document.getElementById('startLearningBtn');
        
        this.flashcard = document.getElementById('flashcard');
        this.cardFront = document.getElementById('cardFront');
        this.cardBack = document.getElementById('cardBack');
        this.wordType = document.getElementById('wordType');
        this.wordText = document.getElementById('wordText');
        this.difficultyBadge = document.getElementById('difficultyBadge');
        this.translation = document.getElementById('translation');
        this.masteryInfo = document.getElementById('masteryInfo');
        
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.showAnswerBtn = document.getElementById('showAnswerBtn');
        this.answerButtons = document.getElementById('answerButtons');
        
        this.correctCount = document.getElementById('correctCount');
        this.incorrectCount = document.getElementById('incorrectCount');
        this.accuracy = document.getElementById('accuracy');
        
        this.finalScore = document.getElementById('finalScore');
        this.finalCorrect = document.getElementById('finalCorrect');
        this.finalTime = document.getElementById('finalTime');
        this.newSessionBtn = document.getElementById('newSessionBtn');
        this.reviewMistakesBtn = document.getElementById('reviewMistakesBtn');
        
        this.userWelcome = document.getElementById('userWelcome');
        this.logoutBtn = document.getElementById('logoutBtn');
    }

    attachEventListeners() {
        if (this.startLearningBtn) {
            this.startLearningBtn.addEventListener('click', () => this.startLearningSession());
        }

        if (this.newSessionBtn) {
            this.newSessionBtn.addEventListener('click', () => this.resetSession());
        }

        if (this.reviewMistakesBtn) {
            this.reviewMistakesBtn.addEventListener('click', () => this.reviewMistakes());
        }

        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
        }

        if (this.showAnswerBtn) {
            this.showAnswerBtn.addEventListener('click', () => this.showAnswer());
        }

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
                case '2':
                case '3':
                case '4':
                    e.preventDefault();
                    if (this.isAnswerShown) {
                        const index = parseInt(e.key) - 1;
                        if (index >= 0 && index < 4) {
                            this.handleAnswer(index);
                        }
                    }
                    break;
            }
        });
    }

    async startLearningSession() {
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
                window.location.href = 'index.html';
                return;
            }

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
            await this.displayCurrentCard();
            
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

    async getWrongAnswers(correctCard) {
        try {
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
            if (!data.success) {
                throw new Error(data.error || 'Failed to get alternatives');
            }

            let wrongAnswers = (Array.isArray(data.data) ? data.data : [])
                .filter(answer => answer && answer.toLowerCase() !== correctCard.english.toLowerCase());

            if (wrongAnswers.length < 3) {
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

            return wrongAnswers.slice(0, 3) || [
                'Need more words in database',
                'Please add more words',
                'Database needs more content'
            ];

        } catch (error) {
            console.error('Error fetching alternatives:', error);
            return [
                'Error loading alternatives',
                'Please try again',
                'Database connection error'
            ];
        }
    }

    async displayCurrentCard() {
        if (this.currentCardIndex >= this.currentCards.length) {
            await this.completeSession();
            return;
        }
        
        const card = this.currentCards[this.currentCardIndex];
        if (!card) {
            await this.completeSession();
            return;
        }
        
        this.isProcessingAnswer = false;
        this.isAnswerShown = false;
        
        this.wordType.textContent = card.type || '';
        this.wordText.textContent = card.swedish;
        this.difficultyBadge.textContent = `Level ${card.difficultyLevel}`;
        this.translation.textContent = card.english;
        
        try {
            const wrongAnswers = await this.getWrongAnswers(card);
            const allAnswers = [card.english, ...wrongAnswers];
            const shuffledAnswers = this.shuffleArray([...allAnswers]);
            
            this.correctAnswerIndex = shuffledAnswers.indexOf(card.english);
            
            this.answerButtons.innerHTML = '';
            shuffledAnswers.forEach((answer, index) => {
                const button = document.createElement('button');
                button.className = 'answer-button';
                button.textContent = answer;
                button.setAttribute('data-index', index.toString());
                button.addEventListener('click', () => this.handleAnswer(index));
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

    showAnswer() {
        if (this.isAnswerShown) return;
        
        this.isAnswerShown = true;
        if (this.cardBack) this.cardBack.classList.remove('hidden');
        if (this.showAnswerBtn) this.showAnswerBtn.classList.add('hidden');
        if (this.answerButtons) this.answerButtons.classList.remove('hidden');
    }

    async handleAnswer(selectedIndex) {
        if (this.isProcessingAnswer) {
            console.log('Already processing an answer, ignoring');
            return;
        }
        
        if (selectedIndex === undefined) {
            console.log('Invalid answer attempt');
            return;
        }
        
        try {
            this.isProcessingAnswer = true;
            const currentCard = this.currentCards[this.currentCardIndex];
            const buttons = this.answerButtons.querySelectorAll('.answer-button');
            const isCorrect = selectedIndex === this.correctAnswerIndex;
            
            buttons.forEach(button => {
                button.disabled = true;
                const buttonIndex = parseInt(button.getAttribute('data-index'));
                if (buttonIndex === this.correctAnswerIndex) {
                    button.classList.add('correct');
                }
                if (buttonIndex === selectedIndex) {
                    button.classList.add(isCorrect ? 'correct' : 'incorrect');
                }
            });
            
            if (isCorrect) {
                this.sessionStats.correct++;
            } else {
                this.sessionStats.incorrect++;
            }
            
            const selectedButton = buttons[selectedIndex];
            this.sessionStats.results.push({
                wordId: currentCard.id,
                isCorrect: isCorrect,
                userAnswer: selectedButton ? selectedButton.textContent : 'Unknown',
                correctAnswer: currentCard.english,
                word: currentCard,
                timestamp: new Date()
            });
            
            const token = localStorage.getItem('swedishLearningToken');
            const response = await fetch('/api/progress/practice-word', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wordId: currentCard.id,
                    isCorrect: isCorrect,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                console.error('Failed to save progress:', await response.text());
            }
            
            this.updateStats();
            await new Promise(resolve => setTimeout(resolve, isCorrect ? 800 : 1500));
            
            this.currentCardIndex++;
            await this.displayCurrentCard();
            
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
}

// Initialize the flashcard system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FlashcardLearning();
});
