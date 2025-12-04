/**
 * Location Routes
 * API endpoints for location management
 */

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { adminAuth } = require('../middleware/authMiddleware');

// Franchise owner auth middleware
const franchiseAuth = (req, res, next) => {
    const user = req.session.franchise_user || req.session.admin_user;
    if (!user || (user.role !== 'franchise_owner' && user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ error: 'Franchise owner access required' });
    }
    next();
};

// Public routes
router.get('/nearby', locationController.getNearbyLocations);

// Franchise owner routes
router.get('/my-locations', franchiseAuth, locationController.getMyLocations);
router.get('/:id/performance', franchiseAuth, locationController.getLocationPerformance);

// Admin routes
router.get('/', adminAuth, locationController.getAllLocations);
router.get('/top', adminAuth, locationController.getTopLocations);
router.get('/stats', adminAuth, locationController.getLocationStats);
router.get('/:id', adminAuth, locationController.getLocationById);
router.post('/', adminAuth, locationController.createLocation);
router.put('/:id', adminAuth, locationController.updateLocation);
router.delete('/:id', adminAuth, locationController.deleteLocation);
router.post('/:location_id/assign-router', adminAuth, locationController.assignRouter);

module.exports = router;
