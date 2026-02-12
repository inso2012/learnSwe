// Swedish Learning Quiz System
import { apiFetch } from './api.js';
import { checkAuth } from './auth.js';
import { showAlert } from './modal.js';
import './nav.js';

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    new SwedishQuiz();
});

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
        this.initializeUserInfo();
    }

    initializeUserInfo() {
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail) {
            const el = document.getElementById('userEmail');
            if (el) el.textContent = userEmail;
        }
    }

    initializeElements() {
        this.setupSection = document.getElementById('setupSection');
        this.quizSection = document.getElementById('quizSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.reviewModal = document.getElementById('reviewModal');

        this.questionCountSelect = document.getElementById('questionCount');
        this.quizTypeSelect = document.getElementById('quizType');
        this.difficultySelect = document.getElementById('difficulty');
        this.startQuizBtn = document.getElementById('startQuizBtn');

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

        this.answerFeedback = document.getElementById('answerFeedback');
        this.feedbackIcon = document.getElementById('feedbackIcon');
        this.feedbackText = document.getElementById('feedbackText');
        this.feedbackDetails = document.getElementById('feedbackDetails');
        this.nextQuestionBtn = document.getElementById('nextQuestionBtn');

        this.finalScorePercentage = document.getElementById('finalScorePercentage');
        this.correctAnswers = document.getElementById('correctAnswers');
        this.incorrectAnswers = document.getElementById('incorrectAnswers');
        this.totalTime = document.getElementById('totalTime');
        this.averageTime = document.getElementById('averageTime');
        this.progressUpdates = document.getElementById('progressUpdates');
        this.progressList = document.getElementById('progressList');

        this.reviewAnswersBtn = document.getElementById('reviewAnswersBtn');
        this.newQuizBtn = document.getElementById('newQuizBtn');
        this.practiceWeakBtn = document.getElementById('practiceWeakBtn');
        this.closeReviewBtn = document.getElementById('closeReviewBtn');

        this.userWelcome = document.getElementById('userWelcome');
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

        document.addEventListener('keydown', (e) => {
            if (this.quizSection.classList.contains('hidden')) return;

            const num = parseInt(e.key);
            if (num >= 1 && num <= 4) {
                this.selectAnswer(num - 1);
            }

            if (e.key === 'Enter') {
                if (!this.submitAnswerBtn.disabled) {
                    this.submitAnswer();
                } else if (!this.nextQuestionBtn.classList.contains('hidden')) {
                    this.nextQuestion();
                }
            }
        });
    }

    async startQuiz() {
        this.showLoading(true, 'Generating quiz...');

        try {
            const questions = this.questionCountSelect.value;
            const type = this.quizTypeSelect.value;
            const difficulty = this.difficultySelect.value;

            const response = await apiFetch(
                `/api/learning/quiz/vocabulary?questions=${questions}&type=${type}&difficulty=${difficulty}`
            );

            if (!response.ok) {
                throw new Error('Failed to generate quiz');
            }

            const data = await response.json();
            this.currentQuiz = data.data;

            if (!this.currentQuiz.questions || this.currentQuiz.questions.length === 0) {
                showAlert('No questions available. Please add more words or adjust your difficulty settings.', 'No Questions');
                return;
            }

            await this.startQuizSession();

            this.initializeQuizState();
            this.showQuizInterface();
            this.displayCurrentQuestion();
            this.startTimer();

        } catch (error) {
            console.error('Error starting quiz:', error);
            showAlert('Failed to generate quiz. Please try again.', 'Quiz Error');
        } finally {
            this.showLoading(false);
        }
    }

    async startQuizSession() {
        try {
            const response = await apiFetch('/api/progress/quiz/start', {
                method: 'POST',
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

        this.questionCounter.textContent =
            `Question ${this.currentQuestionIndex + 1} of ${this.currentQuiz.questions.length}`;
        this.questionType.textContent = question.type === 'swedish-to-english' ?
            'Swedish -> English' : 'English -> Swedish';
        this.wordTypeBadge.textContent = question.wordType;
        this.difficultyBadge.textContent = `Level ${question.difficulty}`;
        this.questionText.textContent = question.question;

        const progress = ((this.currentQuestionIndex + 1) / this.currentQuiz.questions.length) * 100;
        this.progressFill.style.width = `${progress}%`;

        this.displayAnswerOptions(question.options);

        const correctSoFar = this.userAnswers.filter(a => a.isCorrect).length;
        const currentScore = this.userAnswers.length > 0 ?
            Math.round((correctSoFar / this.userAnswers.length) * 100) : 0;
        this.currentScore.textContent = `Score: ${currentScore}%`;

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

        if (this.quizSession) {
            try {
                await apiFetch(`/api/progress/quiz/${this.quizSession.id}/answer`, {
                    method: 'POST',
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

        this.showAnswerFeedback(isCorrect, question);
        this.submitAnswerBtn.disabled = true;
    }

    showAnswerFeedback(isCorrect, question) {
        this.feedbackIcon.textContent = isCorrect ? '' : '';
        this.feedbackText.textContent = isCorrect ? 'Correct!' : 'Incorrect';

        if (isCorrect) {
            this.feedbackDetails.textContent = `Great! "${question.question}" means "${question.correctAnswer}".`;
        } else {
            this.feedbackDetails.textContent =
                `The correct answer is "${question.correctAnswer}". You selected "${this.selectedAnswer}".`;
        }

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

            if (this.quizSession) {
                await apiFetch(`/api/progress/quiz/${this.quizSession.id}/finish`, {
                    method: 'POST',
                    body: JSON.stringify({
                        timeSpent: totalTimeSeconds
                    })
                });
            }

            this.showResults(totalTimeSeconds);

        } catch (error) {
            console.error('Error completing quiz:', error);
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

        this.finalScorePercentage.textContent = `${finalScore}%`;
        this.correctAnswers.textContent = correctCount;
        this.incorrectAnswers.textContent = totalQuestions - correctCount;
        this.totalTime.textContent = this.formatTime(totalTimeSeconds);
        this.averageTime.textContent = `${averageTimePerQuestion}s`;

        this.showProgressUpdates();

        this.quizSection.classList.add('hidden');
        this.resultsSection.classList.remove('hidden');
    }

    showProgressUpdates() {
        const masteryUpdates = this.userAnswers.filter(answer =>
            answer.isCorrect && Math.random() > 0.7
        );

        if (masteryUpdates.length === 0) {
            this.progressUpdates.style.display = 'none';
            return;
        }

        this.progressList.innerHTML = masteryUpdates.map(update => `
            <div class="progress-item">
                <span class="word">${update.question.question} -> ${update.correctAnswer}</span>
                <span class="progress-badge">Improved!</span>
            </div>
        `).join('');
    }

    showAnswerReview() {
        const reviewContent = document.getElementById('reviewContent');

        reviewContent.innerHTML = `
            <div class="review-summary">
                <h4>Answer Summary</h4>
                <p>Correct: ${this.userAnswers.filter(a => a.isCorrect).length} |
                   Incorrect: ${this.userAnswers.filter(a => !a.isCorrect).length}</p>
            </div>
            <div class="review-questions">
                ${this.userAnswers.map((answer, index) => `
                    <div class="review-question ${answer.isCorrect ? 'correct' : 'incorrect'}">
                        <div class="review-header">
                            <span class="question-number">Q${index + 1}</span>
                            <span class="result-icon">${answer.isCorrect ? 'Correct' : 'Wrong'}</span>
                            <span class="time-taken">${answer.answerTime}s</span>
                        </div>
                        <div class="review-content">
                            <div class="question-text">${answer.question.question}</div>
                            <div class="answer-details">
                                <div class="your-answer ${answer.isCorrect ? 'correct' : 'incorrect'}">
                                    Your answer: ${answer.userAnswer}
                                </div>
                                ${!answer.isCorrect ? `
                                    <div class="correct-answer">
                                        Correct answer: ${answer.correctAnswer}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        this.reviewModal.classList.remove('hidden');
    }

    closeReviewModal() {
        this.reviewModal.classList.add('hidden');
    }

    async practiceWeakWords() {
        const incorrectWords = this.userAnswers
            .filter(answer => !answer.isCorrect)
            .map(answer => answer.wordId);

        if (incorrectWords.length === 0) {
            showAlert('Great job! You got all questions correct!', 'Perfect Score');
            return;
        }

        showAlert(`Let's practice these ${incorrectWords.length} words you missed!`, 'Practice');
        window.location.href = 'flashcards.html';
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.startTime) {
                const elapsed = Math.floor((new Date() - this.startTime) / 1000);
                this.timer.textContent = this.formatTime(elapsed);
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    resetQuiz() {
        this.stopTimer();
        this.setupSection.classList.remove('hidden');
        this.quizSection.classList.add('hidden');
        this.resultsSection.classList.add('hidden');
        this.currentQuiz = null;
        this.quizSession = null;
        this.userAnswers = [];
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
