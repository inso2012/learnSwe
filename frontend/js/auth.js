// Authentication utilities
import { apiFetch, getToken, removeToken } from './api.js';

export async function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }

    const isValid = await verifyToken();
    if (!isValid) {
        removeToken();
        localStorage.removeItem('userEmail');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

export async function verifyToken() {
    const token = getToken();
    if (!token) {
        return false;
    }

    try {
        const response = await apiFetch('/api/users/profile');

        if (!response.ok) {
            return false;
        }

        const userData = await response.json();

        const email = userData.email || (userData.data && userData.data.email);

        if (email) {
            localStorage.setItem('userEmail', email);
            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) {
                userEmailElement.textContent = email;
            }
        }

        return true;
    } catch (error) {
        console.error('Token verification failed:', error);
        return false;
    }
}

export function handleNavigation(event) {
    const token = getToken();
    const targetHref = event.target.getAttribute('href');

    if (targetHref === 'index.html') {
        if (!token) {
            return true;
        }
        event.preventDefault();
        window.location.href = 'dashboard.html';
        return false;
    }

    if (!token) {
        event.preventDefault();
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

export function logout() {
    removeToken();
    localStorage.removeItem('userEmail');
    window.location.href = 'index.html';
}

// Keep backward compat for global access (used by utility.js nav handlers and inline HTML)
window.auth = { checkAuth, verifyToken, handleNavigation, logout };
// Also expose globally for files that reference without import
window.checkAuth = checkAuth;
window.verifyToken = verifyToken;

// Set up logout button handler
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
