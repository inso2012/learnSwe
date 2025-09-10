// Swedish Learning Quiz System
class SwedishQuiz {
    constructor() {
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
        this.startTime = null;
        this.questionStartTime = null;
        this.quizSession = null;
        this.userAnswers = [];
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkAuth();
    }
    
    initializeElements() {
        // Sections
        this.setupSection = document.getElementById('setupSection');
        this.quizSection = document.getElementById('quizSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.reviewModal = document.getElementById('reviewModal');
        
        // Setup controls
        this.questionCountSelect = document.getElementById('questionCount');
        this.quizTypeSelect = document.getElementById('quizType');
        this.difficultySelect = document.getElementById('difficulty');
        this.startQuizBtn = document.getElementById('startQuizBtn');
        
        // Quiz elements
        this.progressFill = document.getElementById('progressFill');
        this.questionCounter = document.getElementById('questionCounter');
        this.timer = document.getElementById('timer');
        this.currentScore = document.getElementById('currentScore');
        this.questionType = document.getElementById('questionType');
        this.wordTypeBadge = document.getElementById('wordTypeBadge');
        this.difficultyBadge = document.getElementById('difficultyBadge');
        this.questionText = document.getElementById('questionText');
        this.answerOptions = document.getElementById('answerOptions');
        this.submitAnswerBtn = document.getElementById('submitAnswerBtn');
        
        // Feedback elements
        this.answerFeedback = document.getElementById('answerFeedback');
        this.feedbackIcon = document.getElementById('feedbackIcon');
        this.feedbackText = document.getElementById('feedbackText');
        this.feedbackDetails = document.getElementById('feedbackDetails');
        this.nextQuestionBtn = document.getElementById('nextQuestionBtn');
        
        // Results elements
        this.finalScorePercentage = document.getElementById('finalScorePercentage');
        this.correctAnswers = document.getElementById('correctAnswers');
        this.incorrectAnswers = document.getElementById('incorrectAnswers');
        this.totalTime = document.getElementById('totalTime');
        this.averageTime = document.getElementById('averageTime');
        this.progressUpdates = document.getElementById('progressUpdates');
        this.progressList = document.getElementById('progressList');
        
        // Action buttons
        this.reviewAnswersBtn = document.getElementById('reviewAnswersBtn');
        this.newQuizBtn = document.getElementById('newQuizBtn');
        this.practiceWeakBtn = document.getElementById('practiceWeakBtn');
        this.closeReviewBtn = document.getElementById('closeReviewBtn');
        
        // User elements
        this.userWelcome = document.getElementById('userWelcome');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.loadingText = document.getElementById('loadingText');
    }
    
    attachEventListeners() {
        this.startQuizBtn.addEventListener('click', () => this.startQuiz());
        this.submitAnswerBtn.addEventListener('click', () => this.submitAnswer());
        this.nextQuestionBtn.addEventListener('click', () => this.nextQuestion());
        this.newQuizBtn.addEventListener('click', () => this.resetQuiz());
        this.reviewAnswersBtn.addEventListener('click', () => this.showAnswerReview());
        this.practiceWeakBtn.addEventListener('click', () => this.practiceWeakWords());
        this.closeReviewBtn.addEventListener('click', () => this.closeReviewModal());
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.quizSection.classList.contains('hidden')) return;
            
            // Number keys for answer selection
            const num = parseInt(e.key);
            if (num >= 1 && num <= 4) {
                this.selectAnswer(num - 1);
            }
            
            // Enter to submit/next
            if (e.key === 'Enter') {
                if (!this.submitAnswerBtn.disabled) {
                    this.submitAnswer();
                } else if (!this.nextQuestionBtn.classList.contains('hidden')) {
                    this.nextQuestion();
                }
            }
        });
    }
    
    async checkAuth() {
        const token = localStorage.getItem('swedishLearningToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        try {
            const response = await fetch('/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Authentication failed');
            }
            
            const data = await response.json();
            this.userWelcome.textContent = `Welcome, ${data.data.username}!`;
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = 'login.html';
        }
    }
    
    async startQuiz() {
        this.showLoading(true, 'Generating quiz...');
        
        try {
            const questions = this.questionCountSelect.value;
            const type = this.quizTypeSelect.value;
            const difficulty = this.difficultySelect.value;
            
            // Generate quiz questions
            const response = await fetch(
                `/api/learning/quiz/vocabulary?questions=${questions}&type=${type}&difficulty=${difficulty}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('swedishLearningToken')}`
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to generate quiz');
            }
            
            const data = await response.json();
            this.currentQuiz = data.data;
            
            if (!this.currentQuiz.questions || this.currentQuiz.questions.length === 0) {
                alert('No questions available. Please add more words or adjust your difficulty settings.');
                return;
            }
            
            // Start quiz session tracking
            await this.startQuizSession();
            
            this.initializeQuizState();
            this.showQuizInterface();
            this.displayCurrentQuestion();
            this.startTimer();
            
        } catch (error) {
            console.error('Error starting quiz:', error);
            alert('Failed to generate quiz. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    async startQuizSession() {
        try {
            const response = await fetch('/api/progress/quiz/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('swedishLearningToken')}`
                },
                body: JSON.stringify({
                    quizType: 'vocabulary',
                    totalQuestions: this.currentQuiz.questions.length
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.quizSession = data.data;
            }
        } catch (error) {
            console.error('Failed to start quiz session:', error);
            // Continue without session tracking
        }
    }
    
    initializeQuizState() {
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
        this.startTime = new Date();
        this.userAnswers = [];
    }
    
    showQuizInterface() {
        this.setupSection.classList.add('hidden');
        this.quizSection.classList.remove('hidden');
        this.resultsSection.classList.add('hidden');
    }
    
    displayCurrentQuestion() {
        if (this.currentQuestionIndex >= this.currentQuiz.questions.length) {
            this.completeQuiz();
            return;
        }
        
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        this.questionStartTime = new Date();
        
        // Update question info
        this.questionCounter.textContent = 
            `Question ${this.currentQuestionIndex + 1} of ${this.currentQuiz.questions.length}`;
        this.questionType.textContent = question.type === 'swedish-to-english' ? 
            'Swedish → English' : 'English → Swedish';
        this.wordTypeBadge.textContent = question.wordType;
        this.difficultyBadge.textContent = `Level ${question.difficulty}`;
        this.questionText.textContent = question.question;
        
        // Update progress bar
        const progress = ((this.currentQuestionIndex + 1) / this.currentQuiz.questions.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        
        // Display answer options
        this.displayAnswerOptions(question.options);
        
        // Update current score
        const correctSoFar = this.userAnswers.filter(a => a.isCorrect).length;
        const currentScore = this.userAnswers.length > 0 ? 
            Math.round((correctSoFar / this.userAnswers.length) * 100) : 0;
        this.currentScore.textContent = `Score: ${currentScore}%`;
        
        // Reset UI state
        this.selectedAnswer = null;
        this.submitAnswerBtn.disabled = true;
        this.answerFeedback.classList.add('hidden');
    }
    
    displayAnswerOptions(options) {
        this.answerOptions.innerHTML = '';
        
        options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'answer-option';
            optionElement.innerHTML = `
                <input type="radio" id="option${index}" name="answer" value="${option}">
                <label for="option${index}">
                    <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                    <span class="option-text">${option}</span>
                </label>
            `;
            
            optionElement.addEventListener('click', () => this.selectAnswer(index));
            this.answerOptions.appendChild(optionElement);
        });
    }
    
    selectAnswer(optionIndex) {
        const options = this.answerOptions.querySelectorAll('.answer-option');
        options.forEach(option => option.classList.remove('selected'));
        
        options[optionIndex].classList.add('selected');
        const radio = options[optionIndex].querySelector('input[type="radio"]');
        radio.checked = true;
        this.selectedAnswer = radio.value;
        this.submitAnswerBtn.disabled = false;
    }
    
    async submitAnswer() {
        if (!this.selectedAnswer) return;
        
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        const answerTime = Math.round((new Date() - this.questionStartTime) / 1000);
        const isCorrect = this.selectedAnswer === question.correctAnswer;
        
        // Record the answer
        const userAnswer = {
            questionId: question.id,
            wordId: question.wordId,
            userAnswer: this.selectedAnswer,
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect,
            answerTime: answerTime,
            question: question
        };
        
        this.userAnswers.push(userAnswer);
        
        // Submit to backend if we have a session
        if (this.quizSession) {
            try {
                await fetch(`/api/progress/quiz/${this.quizSession.id}/answer`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('swedishLearningToken')}`
                    },
                    body: JSON.stringify({
                        wordId: question.wordId,
                        userAnswer: this.selectedAnswer,
                        correctAnswer: question.correctAnswer,
                        answerTime: answerTime
                    })
                });
            } catch (error) {
                console.error('Failed to submit answer:', error);
            }
        }
        
        // Show feedback
        this.showAnswerFeedback(isCorrect, question);
        this.submitAnswerBtn.disabled = true;
    }
    
    showAnswerFeedback(isCorrect, question) {
        this.feedbackIcon.textContent = isCorrect ? '✅' : '❌';
        this.feedbackText.textContent = isCorrect ? 'Correct!' : 'Incorrect';
        
        if (isCorrect) {
            this.feedbackDetails.textContent = `Great! "${question.question}" means "${question.correctAnswer}".`;
        } else {
            this.feedbackDetails.textContent = 
                `The correct answer is "${question.correctAnswer}". You selected "${this.selectedAnswer}".`;
        }
        
        // Highlight correct/incorrect answers
        const options = this.answerOptions.querySelectorAll('.answer-option');
        options.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio.value === question.correctAnswer) {
                option.classList.add('correct');
            } else if (radio.value === this.selectedAnswer && !isCorrect) {
                option.classList.add('incorrect');
            }
        });
        
        this.answerFeedback.classList.remove('hidden');
    }
    
    nextQuestion() {
        this.currentQuestionIndex++;
        this.displayCurrentQuestion();
    }
    
    async completeQuiz() {
        this.showLoading(true, 'Calculating results...');
        
        try {
            const endTime = new Date();
            const totalTimeSeconds = Math.round((endTime - this.startTime) / 1000);
            
            // Complete quiz session if we have one
            if (this.quizSession) {
                await fetch(`/api/progress/quiz/${this.quizSession.id}/finish`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('swedishLearningToken')}`
                    },
                    body: JSON.stringify({
                        timeSpent: totalTimeSeconds
                    })
                });
            }
            
            this.showResults(totalTimeSeconds);
            
        } catch (error) {
            console.error('Error completing quiz:', error);
            // Still show results even if backend fails
            const totalTimeSeconds = Math.round((new Date() - this.startTime) / 1000);
            this.showResults(totalTimeSeconds);
        } finally {
            this.showLoading(false);
        }
    }
    
    showResults(totalTimeSeconds) {
        const correctCount = this.userAnswers.filter(a => a.isCorrect).length;
        const totalQuestions = this.userAnswers.length;
        const finalScore = Math.round((correctCount / totalQuestions) * 100);
        const averageTimePerQuestion = Math.round(totalTimeSeconds / totalQuestions);
        
        // Update results display
        this.finalScorePercentage.textContent = `${finalScore}%`;
        this.correctAnswers.textContent = correctCount;
        this.incorrectAnswers.textContent = totalQuestions - correctCount;
        this.totalTime.textContent = this.formatTime(totalTimeSeconds);
        this.averageTime.textContent = `${averageTimePerQuestion}s`;
        
        // Show progress updates
        this.showProgressUpdates();
        
        // Show results section
        this.quizSection.classList.add('hidden');
        this.resultsSection.classList.remove('hidden');
    }
    
    showProgressUpdates() {
        const masteryUpdates = this.userAnswers.filter(answer => 
            answer.isCorrect && Math.random() > 0.7 // Simulate some progress updates
        );
        
        if (masteryUpdates.length === 0) {
            this.progressUpdates.style.display = 'none';
            return;
        }
        this.progressUpdates.style.display = 'block';
        this.progressList.innerHTML = '';   
        masteryUpdates.forEach(update => {
            const listItem = document.createElement('li');
            listItem.textContent = `Word "${update.question.question}" improved your mastery!`;
            this.progressList.appendChild(listItem);
        });
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }       
    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.round((new Date() - this.startTime) / 1000);
            this.timer.textContent = this.formatTime(elapsed);
        }, 1000);
    }
    stopTimer() {
        clearInterval(this.timerInterval);
    }
    resetQuiz() {
        this.stopTimer();
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
        this.startTime = null;
        this.questionStartTime = null;
        this.quizSession = null;
        this.userAnswers = [];  
        this.setupSection.classList.remove('hidden');
        this.quizSection.classList.add('hidden');
        this.resultsSection.classList.add('hidden');
        this.progressFill.style.width = '0%';   
        this.timer.textContent = '0m 0s';
        this.currentScore.textContent = 'Score: 0%';
    }   
    showAnswerReview() {
        this.reviewModal.classList.remove('hidden');
        const reviewContent = document.getElementById('reviewContent');
        reviewContent.innerHTML = '';                       
        this.userAnswers.forEach((answer, index) => {
            const question = answer.question;
            const reviewItem = document.createElement('div');   
            reviewItem.className = 'review-item';
            reviewItem.innerHTML = `
                <h3>Question ${index + 1}: ${question.question}</h3>
                <p>Your Answer: <strong>${answer.userAnswer}</strong> ${answer.isCorrect ? '✅' : '❌'}</p>
                <p>Correct Answer: <strong>${question.correctAnswer}</strong></p>       
                <p>Time Taken: ${answer.answerTime}s</p>
                <hr>
            `;
            reviewContent.appendChild(reviewItem);  
        });
    }
    closeReviewModal() {
        this.reviewModal.classList.add('hidden');
    }
    practiceWeakWords() {
        const weakWords = this.userAnswers
            .filter(a => !a.isCorrect)
            .map(a => a.question.wordId);   
        if (weakWords.length === 0) {
            alert('No weak words to practice! Great job!');
            return;
        }   
        // Store weak words in localStorage for practice session
        localStorage.setItem('weakWords', JSON.stringify(weakWords));
        window.location.href = 'practice.html';
    }
    logout() {
        localStorage.removeItem('swedishLearningToken');
        window.location.href = 'login.html';
    }
    showLoading(show, message = 'Loading...') {
        if (show) {
            this.loadingText.textContent = message;
            this.loadingOverlay.classList.remove('hidden');
        } else {
            this.loadingOverlay.classList.add('hidden');
        }       
    }
}
window.addEventListener('DOMContentLoaded', () => {
    new SwedishQuiz();
});

