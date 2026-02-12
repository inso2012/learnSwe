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
                    <div class="universal-modal-icon" id="modalIcon"></div>
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

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });

        const primaryBtn = document.getElementById('modalPrimaryBtn');
        if (primaryBtn) {
            primaryBtn.addEventListener('click', () => {
                if (this.currentCallback) {
                    this.currentCallback(true);
                }
                this.close();
            });
        }

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
            icon = '',
            type = 'info',
            primaryText = 'OK',
            secondaryText = 'Cancel',
            showSecondary = false,
            callback = null
        } = options;

        this.currentCallback = callback;

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

        this.modal.classList.remove('hidden');
    }

    close() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        this.currentCallback = null;
    }

    getIcon(type, customIcon) {
        if (customIcon) return customIcon;

        const icons = {
            info: 'i',
            warning: '!',
            error: 'X',
            success: 'OK',
            confirm: '?'
        };

        return icons[type] || 'i';
    }
}

// Create global instance
const universalModal = new UniversalModal();

// Export convenience functions
export function showAlert(message, title = 'Alert', callback = null) {
    universalModal.show({ title, message, type: 'warning', callback });
}

export function showInfo(message, title = 'Information', callback = null) {
    universalModal.show({ title, message, type: 'info', callback });
}

export function showError(message, title = 'Error', callback = null) {
    universalModal.show({ title, message, type: 'error', callback });
}

export function showSuccess(message, title = 'Success', callback = null) {
    universalModal.show({ title, message, type: 'success', callback });
}

export function showConfirm(message, title = 'Confirm', callback = null) {
    universalModal.show({ title, message, type: 'confirm', showSecondary: true, primaryText: 'Yes', secondaryText: 'No', callback });
}

export function showModal(title, message, callback = null) {
    universalModal.show({ title, message, type: 'info', callback });
}

export function closeModal() {
    universalModal.close();
}

// Keep globals for backward compat (used by inline HTML onclick handlers etc.)
window.showAlert = showAlert;
window.showError = showError;
window.showInfo = showInfo;
window.showSuccess = showSuccess;
window.showConfirm = showConfirm;
window.showModal = showModal;
window.closeModal = closeModal;
