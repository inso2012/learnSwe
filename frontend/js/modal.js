/**
 * Universal Modal System
 * Provides consistent modal styling and behavior across the entire project
 */

class UniversalModal {
    constructor() {
        this.modal = null;
        this.currentCallback = null;
        this.init();
    }

    init() {
        // Create modal HTML if it doesn't exist
        if (!document.getElementById('universalModal')) {
            this.createModalHTML();
        }
        this.modal = document.getElementById('universalModal');
        this.setupEventListeners();
    }

    createModalHTML() {
        const modalHTML = `
            <div id="universalModal" class="universal-modal-overlay hidden">
                <div class="universal-modal-content">
                    <div class="universal-modal-icon" id="modalIcon">ℹ️</div>
                    <h3 id="modalTitle">Information</h3>
                    <p id="modalMessage">Message content</p>
                    <div class="universal-modal-actions">
                        <button class="universal-modal-btn primary" id="modalPrimaryBtn">OK</button>
                        <button class="universal-modal-btn secondary hidden" id="modalSecondaryBtn">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    setupEventListeners() {
        if (!this.modal) return;

        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });

        // Primary button click
        const primaryBtn = document.getElementById('modalPrimaryBtn');
        if (primaryBtn) {
            primaryBtn.addEventListener('click', () => {
                if (this.currentCallback) {
                    this.currentCallback(true);
                }
                this.close();
            });
        }

        // Secondary button click
        const secondaryBtn = document.getElementById('modalSecondaryBtn');
        if (secondaryBtn) {
            secondaryBtn.addEventListener('click', () => {
                if (this.currentCallback) {
                    this.currentCallback(false);
                }
                this.close();
            });
        }
    }

    show(options) {
        const {
            title = 'Information',
            message = '',
            icon = 'ℹ️',
            type = 'info', // 'info', 'warning', 'error', 'success', 'confirm'
            primaryText = 'OK',
            secondaryText = 'Cancel',
            showSecondary = false,
            callback = null
        } = options;

        this.currentCallback = callback;

        // Update content
        document.getElementById('modalIcon').textContent = this.getIcon(type, icon);
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        
        const primaryBtn = document.getElementById('modalPrimaryBtn');
        const secondaryBtn = document.getElementById('modalSecondaryBtn');
        
        if (primaryBtn) {
            primaryBtn.textContent = primaryText;
        }
        
        if (secondaryBtn) {
            secondaryBtn.textContent = secondaryText;
            secondaryBtn.classList.toggle('hidden', !showSecondary);
        }

        // Show modal
        this.modal.classList.remove('hidden');
    }

    close() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        this.currentCallback = null;
    }

    getIcon(type, customIcon) {
        if (customIcon && customIcon !== 'ℹ️') return customIcon;
        
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            success: '✅',
            confirm: '❓'
        };
        
        return icons[type] || 'ℹ️';
    }
}

// Create global instance
const universalModal = new UniversalModal();

// Convenience functions for different modal types
function showAlert(message, title = 'Alert', callback = null) {
    universalModal.show({
        title,
        message,
        type: 'warning',
        callback
    });
}

function showInfo(message, title = 'Information', callback = null) {
    universalModal.show({
        title,
        message,
        type: 'info',
        callback
    });
}

function showError(message, title = 'Error', callback = null) {
    universalModal.show({
        title,
        message,
        type: 'error',
        callback
    });
}

function showSuccess(message, title = 'Success', callback = null) {
    universalModal.show({
        title,
        message,
        type: 'success',
        callback
    });
}

function showConfirm(message, title = 'Confirm', callback = null) {
    universalModal.show({
        title,
        message,
        type: 'confirm',
        showSecondary: true,
        primaryText: 'Yes',
        secondaryText: 'No',
        callback
    });
}

// Legacy functions for backward compatibility
function showModal(title, message, callback = null) {
    universalModal.show({
        title,
        message,
        type: 'info',
        callback
    });
}

function closeModal() {
    universalModal.close();
}