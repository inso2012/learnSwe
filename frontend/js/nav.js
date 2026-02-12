// Navigation setup
import { apiFetch, getToken, removeToken } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserProfile();

    async function loadUserProfile() {
        try {
            const token = getToken();
            if (!token) {
                return;
            }

            const response = await apiFetch('/api/users/profile');

            if (response.ok) {
                const result = await response.json();
                const user = result.data;

                const usernameElement = document.getElementById('username');
                if (usernameElement && user.firstName) {
                    usernameElement.textContent = user.firstName;
                }

                localStorage.setItem('userFirstName', user.firstName);
                localStorage.setItem('userLastName', user.lastName);
                localStorage.setItem('userFullName', `${user.firstName} ${user.lastName}`);
                localStorage.setItem('userRegistrationDate', user.registrationDate);

            } else {
                const userEmail = localStorage.getItem('userEmail');
                const usernameElement = document.getElementById('username');
                if (usernameElement && userEmail) {
                    usernameElement.textContent = userEmail;
                }
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            const userEmail = localStorage.getItem('userEmail');
            const usernameElement = document.getElementById('username');
            if (usernameElement && userEmail) {
                usernameElement.textContent = userEmail;
            }
        }
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                removeToken();
                localStorage.removeItem('userEmail');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error during logout:', error);
            }
        });
    }
});
