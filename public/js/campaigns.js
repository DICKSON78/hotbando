/**
 * Enhanced Campaigns Page JavaScript
 * Provides AJAX functionality with real-time updates
 */

// Auto-refresh campaigns every 30 seconds
let refreshInterval = null;

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    
    refreshInterval = setInterval(() => {
        loadCampaigns(true); // Silent refresh
    }, 30000); // 30 seconds
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Enhanced load campaigns with silent mode
async function loadCampaigns(silent = false) {
    try {
        if (!silent) {
            const tbody = document.getElementById('campaigns-tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="px-6 py-8 text-center">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p class="mt-2 text-gray-600">Inapakia kampeni...</p>
                        </td>
                    </tr>
                `;
            }
        }

        const response = await fetch('/api/campaigns/my-campaigns');
        const data = await response.json();

        if (data.success) {
            allCampaigns = data.campaigns || [];
            applyFilters();
            updateStats();
        } else {
            if (!silent) {
                showError('Imeshindwa kupakia kampeni');
            }
        }
    } catch (error) {
        console.error('Error loading campaigns:', error);
        if (!silent) {
            showError('Hitilafu imetokea wakati wa kupakia kampeni');
        }
    }
}

// Export campaigns to CSV
async function exportCampaigns() {
    try {
        const response = await fetch('/api/campaigns/export');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaigns_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Kampeni zimehamishwa kikamilifu!');
    } catch (error) {
        console.error('Export error:', error);
        showError('Imeshindwa kuhamisha kampeni');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCampaigns();
    startAutoRefresh();
});

// Stop refresh when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
    }
});
