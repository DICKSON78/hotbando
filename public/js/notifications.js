/**
 * Custom Notification System
 * Replaces default alert() with styled modals
 */

class NotificationSystem {
    constructor() {
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-3';
            container.style.maxWidth = '400px';
            document.body.appendChild(container);
        }

        // Create modal container if it doesn't exist
        if (!document.getElementById('confirm-modal-container')) {
            const modalHTML = `
                <div id="confirm-modal-container" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center">
                    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
                        <div class="p-6">
                            <div class="flex items-center mb-4">
                                <div id="confirm-icon" class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                                    <i id="confirm-icon-class" class="text-2xl"></i>
                                </div>
                                <div class="flex-1">
                                    <h3 id="confirm-title" class="text-lg font-semibold text-gray-800"></h3>
                                </div>
                            </div>
                            <p id="confirm-message" class="text-gray-600 mb-6"></p>
                            <div class="flex justify-end space-x-3">
                                <button id="confirm-cancel" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                                    Ghairi
                                </button>
                                <button id="confirm-ok" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                                    Sawa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }

    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('notification-container');

        const toast = document.createElement('div');
        toast.className = `notification-toast transform transition-all duration-300 ease-in-out translate-x-full opacity-0`;

        const colors = {
            success: {
                bg: 'bg-green-50',
                border: 'border-green-200',
                icon: 'text-green-600',
                iconClass: 'fas fa-check-circle',
                title: 'Imefanikiwa!'
            },
            error: {
                bg: 'bg-red-50',
                border: 'border-red-200',
                icon: 'text-red-600',
                iconClass: 'fas fa-times-circle',
                title: 'Hitilafu!'
            },
            warning: {
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                icon: 'text-yellow-600',
                iconClass: 'fas fa-exclamation-triangle',
                title: 'Onyo!'
            },
            info: {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                icon: 'text-blue-600',
                iconClass: 'fas fa-info-circle',
                title: 'Taarifa'
            }
        };

        const config = colors[type] || colors.info;

        toast.innerHTML = `
            <div class="${config.bg} border ${config.border} rounded-lg shadow-lg p-4 flex items-start space-x-3 max-w-sm">
                <div class="flex-shrink-0">
                    <i class="${config.iconClass} ${config.icon} text-xl"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 text-sm">${config.title}</p>
                    <p class="text-gray-600 text-sm mt-1">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0 text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 10);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    }

    confirm(message, title = 'Je, una uhakika?', onConfirm = () => {}, onCancel = () => {}) {
        const modal = document.getElementById('confirm-modal-container');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const iconContainer = document.getElementById('confirm-icon');
        const iconClass = document.getElementById('confirm-icon-class');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        // Set content
        titleEl.textContent = title;
        messageEl.textContent = message;
        iconContainer.className = 'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-orange-100';
        iconClass.className = 'fas fa-question-circle text-2xl text-orange-600';

        // Show modal
        modal.classList.remove('hidden');

        // Handle confirm
        const handleConfirm = () => {
            modal.classList.add('hidden');
            onConfirm();
            cleanup();
        };

        // Handle cancel
        const handleCancel = () => {
            modal.classList.add('hidden');
            onCancel();
            cleanup();
        };

        // Add event listeners
        okBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });

        // Cleanup
        const cleanup = () => {
            okBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };
    }

    alert(message, type = 'info', title = 'Taarifa') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal-container');
            const titleEl = document.getElementById('confirm-title');
            const messageEl = document.getElementById('confirm-message');
            const iconContainer = document.getElementById('confirm-icon');
            const iconClass = document.getElementById('confirm-icon-class');
            const okBtn = document.getElementById('confirm-ok');
            const cancelBtn = document.getElementById('confirm-cancel');

            const config = {
                success: {
                    bg: 'bg-green-100',
                    icon: 'fas fa-check-circle text-2xl text-green-600',
                    title: title || 'Imefanikiwa!'
                },
                error: {
                    bg: 'bg-red-100',
                    icon: 'fas fa-times-circle text-2xl text-red-600',
                    title: title || 'Hitilafu!'
                },
                warning: {
                    bg: 'bg-yellow-100',
                    icon: 'fas fa-exclamation-triangle text-2xl text-yellow-600',
                    title: title || 'Onyo!'
                },
                info: {
                    bg: 'bg-blue-100',
                    icon: 'fas fa-info-circle text-2xl text-blue-600',
                    title: title || 'Taarifa'
                }
            };

            const typeConfig = config[type] || config.info;

            // Set content
            titleEl.textContent = typeConfig.title;
            messageEl.textContent = message;
            iconContainer.className = `flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-4 ${typeConfig.bg}`;
            iconClass.className = typeConfig.icon;

            // Hide cancel button
            cancelBtn.style.display = 'none';
            okBtn.textContent = 'Sawa';

            // Show modal
            modal.classList.remove('hidden');

            // Handle OK
            const handleOk = () => {
                modal.classList.add('hidden');
                cancelBtn.style.display = 'block';
                okBtn.textContent = 'Sawa';
                resolve();
                cleanup();
            };

            okBtn.addEventListener('click', handleOk);

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    handleOk();
                }
            });

            const cleanup = () => {
                okBtn.removeEventListener('click', handleOk);
            };
        });
    }

    loading(message = 'Inapakia...') {
        const loadingHTML = `
            <div id="loading-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p class="text-gray-700 font-medium">${message}</p>
                </div>
            </div>
        `;

        if (!document.getElementById('loading-overlay')) {
            document.body.insertAdjacentHTML('beforeend', loadingHTML);
        }

        return {
            close: () => {
                const overlay = document.getElementById('loading-overlay');
                if (overlay) overlay.remove();
            }
        };
    }
}

// Create global instance
window.notify = new NotificationSystem();

// Override default alert and confirm
window.showSuccess = (message) => notify.showToast(message, 'success');
window.showError = (message) => notify.showToast(message, 'error');
window.showWarning = (message) => notify.showToast(message, 'warning');
window.showInfo = (message) => notify.showToast(message, 'info');

// Enhanced confirm that returns a promise
window.confirmAction = (message, title) => {
    return new Promise((resolve) => {
        notify.confirm(message, title, () => resolve(true), () => resolve(false));
    });
};

console.log('✅ Notification system loaded');
