// Utility functions for the Swedish Learning app
export function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function calculateProgress(current, total) {
    return Math.min((current / total) * 100, 100);
}

export function showError(message, container) {
    if (!container) return;

    let errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'error-message';
        container.prepend(errorDiv);
    }

    errorDiv.textContent = message;
}

// Add navigation handlers to all nav links
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        if (window.auth) {
            link.addEventListener('click', window.auth.handleNavigation);
        }
    });
});
