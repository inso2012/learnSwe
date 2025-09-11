// Navigation setup
document.addEventListener('DOMContentLoaded', async () => {
    // Display user email
    const userEmail = localStorage.getItem('userEmail');
    const usernameElement = document.getElementById('username');
    if (usernameElement && userEmail) {
        usernameElement.textContent = userEmail;
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                localStorage.removeItem('swedishLearningToken');
                localStorage.removeItem('userEmail');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error during logout:', error);
            }
        });
    }
});