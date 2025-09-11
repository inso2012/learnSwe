// Authentication utilities
async function checkAuth() {
    const token = localStorage.getItem('swedishLearningToken');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }

    // Always verify the token and update user info
    const isValid = await verifyToken();
    if (!isValid) {
        localStorage.removeItem('swedishLearningToken');
        localStorage.removeItem('userEmail');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

async function verifyToken() {
    const token = localStorage.getItem('swedishLearningToken');
    if (!token) {
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
            return false;
        }
        
        const userData = await response.json();
        // Log the response to see what we're getting
        console.log('User data:', userData);
        
        // Try to get email from different possible response structures
        const email = userData.email || (userData.data && userData.data.email);
        
        if (email) {
            localStorage.setItem('userEmail', email);
            // Update user email in navigation if element exists
            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) {
                userEmailElement.textContent = email;
            }
        } else {
            console.error('No email found in response:', userData);
        }
        
        return true;
    } catch (error) {
        console.error('Token verification failed:', error);
        return false;
    }
}

function handleNavigation(event) {
    const token = localStorage.getItem('swedishLearningToken');
    const targetHref = event.target.getAttribute('href');
    
    if (targetHref === 'index.html') {
        if (!token) {
            return true; // Allow navigation to login page when not authenticated
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
    
    return true; // Allow navigation for authenticated users
}

function logout() {
    localStorage.removeItem('swedishLearningToken');
    window.location.href = 'index.html';
}

// Export auth functions
window.auth = {
    checkAuth,
    verifyToken,
    handleNavigation,
    logout
};

// Set up logout button handler
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
