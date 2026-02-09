/**
 * AJAX Utilities for HotBando Platform
 * Provides reusable AJAX functions with loading states, error handling, and CSRF protection
 */

const AjaxUtils = {
    // CSRF token storage
    csrfToken: null,

    /**
     * Initialize AJAX utilities
     */
    init: function() {
        // Get CSRF token from meta tag or generate
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            this.csrfToken = metaToken.getAttribute('content');
        }
    },

    /**
     * Show loading state
     */
    showLoading: function(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="flex items-center justify-center py-8">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    <span class="ml-3 text-gray-600">Inapakia...</span>
                </div>
            `;
        }
    },

    /**
     * Show error message
     */
    showError: function(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                        </svg>
                        <span class="text-red-700">${message}</span>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Show success message
     */
    showSuccess: function(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        toast.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, duration);
    },

    /**
     * Generic AJAX request
     */
    request: async function(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        };

        // Add CSRF token for non-GET requests
        if (options.method && options.method !== 'GET' && this.csrfToken) {
            defaultOptions.headers['X-CSRF-Token'] = this.csrfToken;
        }

        // Merge options
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('AJAX Error:', error);
            throw error;
        }
    },

    /**
     * GET request
     */
    get: async function(url, params = {}) {
        // Add query parameters
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;

        return this.request(fullUrl, { method: 'GET' });
    },

    /**
     * POST request
     */
    post: async function(url, data = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * PUT request
     */
    put: async function(url, data = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    /**
     * DELETE request
     */
    delete: async function(url) {
        return this.request(url, { method: 'DELETE' });
    },

    /**
     * Load data into table
     */
    loadTable: async function(url, tableId, renderRow, options = {}) {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        if (!tableBody) return;

        // Show loading
        tableBody.innerHTML = `
            <tr>
                <td colspan="100" class="text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p class="mt-2 text-gray-600">Inapakia data...</p>
                </td>
            </tr>
        `;

        try {
            const data = await this.get(url, options.params || {});
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load data');
            }

            const items = data[options.dataKey || 'data'] || [];

            if (items.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="100" class="text-center py-8 text-gray-500">
                            Hakuna data
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = items.map(renderRow).join('');

            // Handle pagination if exists
            if (data.pagination && options.paginationId) {
                this.renderPagination(data.pagination, options.paginationId, options.onPageChange);
            }

        } catch (error) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="100" class="text-center py-8">
                        <div class="text-red-500">
                            <svg class="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                            </svg>
                            <p>${error.message}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    },

    /**
     * Render pagination
     */
    renderPagination: function(pagination, elementId, onPageChange) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const { page, totalPages } = pagination;
        let html = '<div class="flex items-center justify-center space-x-2 mt-4">';

        // Previous button
        html += `
            <button 
                onclick="${onPageChange}(${page - 1})" 
                ${page <= 1 ? 'disabled' : ''}
                class="px-3 py-1 rounded ${page <= 1 ? 'bg-gray-200 text-gray-400' : 'bg-orange-500 text-white hover:bg-orange-600'}"
            >
                Previous
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === page) {
                html += `<span class="px-3 py-1 bg-orange-500 text-white rounded">${i}</span>`;
            } else if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
                html += `<button onclick="${onPageChange}(${i})" class="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded">${i}</button>`;
            } else if (i === page - 3 || i === page + 3) {
                html += `<span class="px-2">...</span>`;
            }
        }

        // Next button
        html += `
            <button 
                onclick="${onPageChange}(${page + 1})" 
                ${page >= totalPages ? 'disabled' : ''}
                class="px-3 py-1 rounded ${page >= totalPages ? 'bg-gray-200 text-gray-400' : 'bg-orange-500 text-white hover:bg-orange-600'}"
            >
                Next
            </button>
        `;

        html += '</div>';
        element.innerHTML = html;
    },

    /**
     * Format currency (TZS)
     */
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('sw-TZ', {
            style: 'currency',
            currency: 'TZS',
            minimumFractionDigits: 0
        }).format(amount);
    },

    /**
     * Format date
     */
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('sw-TZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Format bytes
     */
    formatBytes: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Debounce function for search inputs
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AjaxUtils.init());
} else {
    AjaxUtils.init();
}
