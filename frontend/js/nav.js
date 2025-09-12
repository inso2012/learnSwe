// Navigation setup
document.addEventListener('DOMContentLoaded', async () => {
    // Fetch and display user's first name
    await loadUserProfile();
    
    async function loadUserProfile() {
        try {
            const token = localStorage.getItem('swedishLearningToken');
            if (!token) {
                console.error('No token found');
                return;
            }

            const response = await fetch('http://localhost:3000/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const user = result.data;
                
                // Display user's first name in navigation
                const usernameElement = document.getElementById('username');
                if (usernameElement && user.firstName) {
                    usernameElement.textContent = user.firstName;
                }
                
                // Store user data for other pages to use
                localStorage.setItem('userFirstName', user.firstName);
                localStorage.setItem('userLastName', user.lastName);
                localStorage.setItem('userFullName', `${user.firstName} ${user.lastName}`);
                localStorage.setItem('userRegistrationDate', user.registrationDate);
                
            } else {
                console.error('Failed to fetch user profile:', response.statusText);
                // Fallback to email if profile fetch fails
                const userEmail = localStorage.getItem('userEmail');
                const usernameElement = document.getElementById('username');
                if (usernameElement && userEmail) {
                    usernameElement.textContent = userEmail;
                }
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            // Fallback to email if there's an error
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
                localStorage.removeItem('swedishLearningToken');
                localStorage.removeItem('userEmail');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error during logout:', error);
            }
        });
    }
});