const express = require('express');
const router = express.Router();
const hqController = require('../controllers/hqController');
const { adminAuth } = require('../middleware/authMiddleware');

router.use(adminAuth);

// ==================== REGIONS ====================
router.get('/regions', hqController.getRegions);
router.post('/regions', hqController.createRegion);
router.put('/regions/:id', hqController.updateRegion);

// ==================== DISTRICTS ====================
router.get('/districts', hqController.getDistricts);
router.post('/districts', hqController.createDistrict);
router.put('/districts/:id', hqController.updateDistrict);

// ==================== BRANCHES ====================
router.get('/branches', hqController.getBranches);
router.get('/branches/:id', hqController.getBranchDetails);
router.post('/branches', hqController.createBranch);
router.put('/branches/:id', hqController.updateBranch);

// ==================== STAFF ====================
router.get('/staff', hqController.getStaff);
router.post('/staff', hqController.createStaff);
router.put('/staff/:id', hqController.updateStaff);

// ==================== ATTENDANCE ====================
router.get('/attendance', hqController.getAttendance);
router.post('/attendance', hqController.markAttendance);

// ==================== LEAVE REQUESTS ====================
router.get('/leave-requests', hqController.getLeaveRequests);
router.put('/leave-requests/:id', hqController.updateLeaveStatus);

// ==================== EXPENSES ====================
router.get('/expenses', hqController.getExpenses);
router.post('/expenses', hqController.createExpense);
router.put('/expenses/:id/approve', hqController.approveExpense);

// ==================== EXPENSE CATEGORIES ====================
router.get('/expense-categories', hqController.getExpenseCategories);
router.post('/expense-categories', hqController.createExpenseCategory);

// ==================== BUDGETS ====================
router.get('/budgets', hqController.getBudgets);
router.post('/budgets', hqController.createBudget);

// ==================== FINANCIAL ====================
router.get('/profit-loss', hqController.getProfitLoss);
router.get('/financial-dashboard', hqController.getFinancialDashboard);

// ==================== ASSETS ====================
router.get('/assets', hqController.getAssets);
router.post('/assets', hqController.createAsset);
router.put('/assets/:id', hqController.updateAsset);

// ==================== ASSET CATEGORIES ====================
router.get('/asset-categories', hqController.getAssetCategories);
router.post('/asset-categories', hqController.createAssetCategory);

// ==================== PURCHASE ORDERS ====================
router.get('/purchase-orders', hqController.getPurchaseOrders);
router.post('/purchase-orders', hqController.createPurchaseOrder);
router.put('/purchase-orders/:id/status', hqController.updatePOStatus);

// ==================== TICKETS ====================
router.get('/tickets', hqController.getTickets);
router.get('/tickets/:id', hqController.getTicketDetail);
router.post('/tickets', hqController.createTicket);
router.put('/tickets/:id', hqController.updateTicket);
router.post('/tickets/:id/replies', hqController.addTicketReply);
router.get('/ticket-categories', hqController.getTicketCategories);
router.get('/ticket-stats', hqController.getTicketStats);

// ==================== AUDIT TRAIL ====================
router.get('/audit-trail', hqController.getAuditTrail);

// ==================== CONTRACTS ====================
router.get('/contracts', hqController.getContracts);
router.get('/contracts/:id', hqController.getContractDetail);
router.post('/contracts', hqController.createContract);
router.put('/contracts/:id', hqController.updateContract);

// ==================== LICENSES ====================
router.get('/licenses', hqController.getLicenses);
router.get('/licenses/:id', hqController.getLicenseDetail);
router.post('/licenses', hqController.createLicense);
router.put('/licenses/:id', hqController.updateLicense);

// ==================== COMPLIANCE ====================
router.get('/compliance-dashboard', hqController.getComplianceDashboard);

// ==================== MARKETING ====================
router.get('/marketing-campaigns', hqController.getMarketingCampaigns);
router.post('/marketing-campaigns', hqController.createMarketingCampaign);
router.put('/marketing-campaigns/:id', hqController.updateMarketingCampaign);
router.get('/branch-allocations', hqController.getBranchAllocations);

// ==================== REPORTS ====================
router.get('/report-templates', hqController.getReportTemplates);
router.post('/report-templates', hqController.createReportTemplate);
router.get('/report-runs', hqController.getReportRuns);
router.post('/reports/generate', hqController.generateReport);

module.exports = router;
