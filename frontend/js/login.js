// Login/Register page module
import { apiFetch, setToken } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auth-form');
    const nameFields = document.getElementById('name-fields');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitButton = document.getElementById('submit-button');
    const toggleLink = document.getElementById('toggle-link');
    const formTitle = document.getElementById('form-title');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalClose = document.getElementById('modal-close');

    let isLogin = true;

    function showModal(title, message) {
        modalTitle.textContent = title;
        modalContent.textContent = message;
        modal.classList.remove('hidden');
    }

    modalClose.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    function updateFormMode() {
        if (isLogin) {
            nameFields.classList.add('hidden');
            firstNameInput.removeAttribute('required');
            lastNameInput.removeAttribute('required');
            formTitle.textContent = 'Login';
            submitButton.textContent = 'Login';
            toggleLink.innerHTML = "Don't have an account? <span class='underline'>Sign Up</span>";
        } else {
            nameFields.classList.remove('hidden');
            firstNameInput.setAttribute('required', '');
            lastNameInput.setAttribute('required', '');
            formTitle.textContent = 'Sign Up';
            submitButton.textContent = 'Register';
            toggleLink.innerHTML = "Already have an account? <span class='underline'>Login</span>";
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showModal('Error', 'Please enter both email and password');
            return;
        }

        if (!isLogin) {
            const firstName = firstNameInput.value.trim();
            const lastName = lastNameInput.value.trim();

            if (!firstName || !lastName) {
                showModal('Error', 'Please enter both first name and last name');
                return;
            }
        }

        try {
            const endpoint = isLogin ? 'login' : 'register';

            const requestBody = { email, password };

            if (!isLogin) {
                requestBody.firstName = firstNameInput.value.trim();
                requestBody.lastName = lastNameInput.value.trim();
                requestBody.username = email.split('@')[0];
            }

            const response = await apiFetch(`/api/users/${endpoint}`, {
                method: 'POST',
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (response.ok) {
                if (isLogin) {
                    const token = data.data?.token || data.token;

                    if (!token) {
                        showModal('Error', 'Invalid server response');
                        return;
                    }

                    // Clear old auth data, preserve user data like mistakes
                    localStorage.removeItem('swedishLearningToken');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('userFirstName');
                    localStorage.removeItem('userLastName');
                    localStorage.removeItem('userFullName');
                    localStorage.removeItem('userRegistrationDate');
                    setToken(token);
                    window.location.href = 'dashboard.html';
                } else {
                    showModal('Success', 'Registration successful! Please login.');
                    setTimeout(() => {
                        isLogin = true;
                        updateFormMode();
                        form.reset();
                    }, 1000);
                }
            } else {
                showModal('Error', data.error || `${isLogin ? 'Login' : 'Registration'} failed`);
            }
        } catch (error) {
            console.error(`${isLogin ? 'Login' : 'Registration'} error:`, error);
            showModal('Network Error', 'Failed to connect to server');
        }
    });

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        updateFormMode();
    });
});
