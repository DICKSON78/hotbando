/**
 * Location Controller
 * Manages physical locations, routers, and location-based operations
 */

const Location = require('../models/Location');
const db = require('../config/database');

const locationController = {
    /**
     * Get all locations
     */
    async getAllLocations(req, res) {
        try {
            const locations = await Location.getAllWithStats();

            res.json({
                success: true,
                locations
            });
        } catch (error) {
            console.error('Error getting locations:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get location by ID with details
     */
    async getLocationById(req, res) {
        try {
            const { id } = req.params;

            const location = await Location.getLocationWithDetails(id);

            if (!location) {
                return res.status(404).json({ error: 'Location not found' });
            }

            res.json({
                success: true,
                location
            });
        } catch (error) {
            console.error('Error getting location:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get locations for franchise owner
     */
    async getMyLocations(req, res) {
        try {
            const user = req.session.franchise_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const locations = await Location.getLocationsByFranchiseOwner(user.id);

            res.json({
                success: true,
                locations
            });
        } catch (error) {
            console.error('Error getting locations:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Create new location
     */
    async createLocation(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const {
                name,
                location_type,
                address,
                city,
                region,
                latitude,
                longitude,
                franchise_owner_id,
                max_users,
                bandwidth_limit_mbps,
                operating_hours,
                contact_person,
                contact_phone,
                contact_email
            } = req.body;

            if (!name || !location_type || !city || !region) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const locationData = {
                name,
                location_type,
                address: address || null,
                city,
                region,
                latitude: latitude || null,
                longitude: longitude || null,
                franchise_owner_id: franchise_owner_id || null,
                max_users: max_users || 100,
                bandwidth_limit_mbps: bandwidth_limit_mbps || 100,
                operating_hours: operating_hours ? JSON.stringify(operating_hours) : null,
                contact_person: contact_person || null,
                contact_phone: contact_phone || null,
                contact_email: contact_email || null,
                is_active: 1
            };

            const location = await Location.create(locationData);

            // Log activity
            await db.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
                 VALUES (?, 'create_location', 'location', ?, ?)`,
                [user.id, location.id, `Created location: ${name}`]
            );

            res.json({
                success: true,
                message: 'Location created successfully',
                location
            });
        } catch (error) {
            console.error('Error creating location:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Update location
     */
    async updateLocation(req, res) {
        try {
            const { id } = req.params;
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const location = await Location.findById(id);

            if (!location) {
                return res.status(404).json({ error: 'Location not found' });
            }

            const allowedFields = [
                'name', 'location_type', 'address', 'city', 'region',
                'latitude', 'longitude', 'franchise_owner_id', 'max_users',
                'bandwidth_limit_mbps', 'operating_hours', 'contact_person',
                'contact_phone', 'contact_email', 'is_active'
            ];

            const updateData = {};
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            });

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            await Location.update(id, updateData);

            res.json({
                success: true,
                message: 'Location updated successfully'
            });
        } catch (error) {
            console.error('Error updating location:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Delete location
     */
    async deleteLocation(req, res) {
        try {
            const { id } = req.params;
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            // Check if location has active routers
            const [routers] = await db.query(
                'SELECT COUNT(*) as count FROM mikrotiks WHERE location_id = ? AND status = "online"',
                [id]
            );

            if (routers[0].count > 0) {
                return res.status(400).json({
                    error: 'Cannot delete location with active routers. Please deactivate routers first.'
                });
            }

            await Location.delete(id);

            // Log activity
            await db.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
                 VALUES (?, 'delete_location', 'location', ?, 'Deleted location')`,
                [user.id, id]
            );

            res.json({
                success: true,
                message: 'Location deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting location:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get location performance
     */
    async getLocationPerformance(req, res) {
        try {
            const { id } = req.params;
            const { start_date, end_date } = req.query;

            if (!start_date || !end_date) {
                return res.status(400).json({ error: 'Start date and end date required' });
            }

            const performance = await Location.getLocationPerformance(id, start_date, end_date);

            if (!performance) {
                return res.status(404).json({ error: 'Location not found' });
            }

            res.json({
                success: true,
                performance
            });
        } catch (error) {
            console.error('Error getting location performance:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get top locations by revenue
     */
    async getTopLocations(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const start_date = req.query.start_date || null;
            const end_date = req.query.end_date || null;

            const locations = await Location.getTopLocationsByRevenue(limit, start_date, end_date);

            res.json({
                success: true,
                locations
            });
        } catch (error) {
            console.error('Error getting top locations:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get nearby locations
     */
    async getNearbyLocations(req, res) {
        try {
            const { city, region } = req.query;
            const limit = parseInt(req.query.limit) || 10;

            const locations = await Location.getNearbyLocations(city, region, limit);

            res.json({
                success: true,
                locations
            });
        } catch (error) {
            console.error('Error getting nearby locations:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Assign router to location
     */
    async assignRouter(req, res) {
        try {
            const { location_id } = req.params;
            const { router_id } = req.body;
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            if (!router_id) {
                return res.status(400).json({ error: 'Router ID required' });
            }

            // Check if location exists
            const location = await Location.findById(location_id);
            if (!location) {
                return res.status(404).json({ error: 'Location not found' });
            }

            // Update router
            await db.query(
                'UPDATE mikrotiks SET location_id = ? WHERE id = ?',
                [location_id, router_id]
            );

            res.json({
                success: true,
                message: 'Router assigned to location successfully'
            });
        } catch (error) {
            console.error('Error assigning router:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get location statistics
     */
    async getLocationStats(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const [stats] = await db.query(`
                SELECT
                    COUNT(*) as total_locations,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_locations,
                    COUNT(CASE WHEN location_type = 'university' THEN 1 END) as universities,
                    COUNT(CASE WHEN location_type = 'hostel' THEN 1 END) as hostels,
                    COUNT(CASE WHEN location_type = 'market' THEN 1 END) as markets,
                    COUNT(CASE WHEN location_type = 'mall' THEN 1 END) as malls,
                    COUNT(CASE WHEN franchise_owner_id IS NOT NULL THEN 1 END) as franchised_locations
                FROM locations
            `);

            const [userStats] = await db.query(`
                SELECT
                    l.name as location_name,
                    COUNT(DISTINCT u.id) as user_count
                FROM locations l
                LEFT JOIN users u ON l.id = u.location_id
                WHERE l.is_active = 1
                GROUP BY l.id
                ORDER BY user_count DESC
                LIMIT 10
            `);

            res.json({
                success: true,
                stats: stats[0],
                top_locations_by_users: userStats
            });
        } catch (error) {
            console.error('Error getting location stats:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get detailed location statistics with revenue and user counts
     */
    async getLocationDetailedStats(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            // Get all locations with their user counts, revenue, and router info
            const [locationStats] = await db.execute(`
                SELECT
                    l.id,
                    l.name,
                    l.location_name,
                    l.city,
                    l.region,
                    l.location_type,
                    l.latitude,
                    l.longitude,
                    l.is_active,
                    fo.name as owner_name,
                    fo.phone_number as owner_phone,
                    (SELECT COUNT(*) FROM mikrotiks WHERE location_id = l.id) as router_count,
                    (SELECT COUNT(*) FROM mikrotiks WHERE location_id = l.id AND status = 'online') as online_routers,
                    (SELECT COUNT(DISTINCT u.id) FROM users u
                     JOIN mikrotiks m ON u.last_router_id = m.router_id
                     WHERE m.location_id = l.id AND u.role = 'customer') as total_users,
                    (SELECT COUNT(DISTINCT u.id) FROM users u
                     JOIN mikrotiks m ON u.last_router_id = m.router_id
                     WHERE m.location_id = l.id AND u.usage_until > NOW() AND u.role = 'customer') as active_users,
                    (SELECT COALESCE(SUM(u.moneyspent), 0) FROM users u
                     JOIN mikrotiks m ON u.last_router_id = m.router_id
                     WHERE m.location_id = l.id AND u.role = 'customer') as total_revenue,
                    (SELECT COUNT(DISTINCT u.id) FROM users u
                     JOIN mikrotiks m ON u.last_router_id = m.router_id
                     WHERE m.location_id = l.id AND u.moneyspent > 0 AND u.role = 'customer') as paid_users,
                    (SELECT COUNT(DISTINCT u.id) FROM users u
                     JOIN mikrotiks m ON u.last_router_id = m.router_id
                     WHERE m.location_id = l.id AND (u.moneyspent = 0 OR u.moneyspent IS NULL) AND u.role = 'customer') as ads_users
                FROM locations l
                LEFT JOIN users fo ON l.franchise_owner_id = fo.id
                ORDER BY total_revenue DESC
            `);

            // Get summary stats
            const totalLocations = locationStats.length;
            const totalRevenue = locationStats.reduce((sum, l) => sum + (parseFloat(l.total_revenue) || 0), 0);
            const totalUsers = locationStats.reduce((sum, l) => sum + (parseInt(l.total_users) || 0), 0);
            const totalActiveUsers = locationStats.reduce((sum, l) => sum + (parseInt(l.active_users) || 0), 0);
            const totalRouters = locationStats.reduce((sum, l) => sum + (parseInt(l.router_count) || 0), 0);

            // Top 5 by revenue
            const topByRevenue = locationStats.slice(0, 5);

            // Top 5 by active users
            const topByActiveUsers = [...locationStats].sort((a, b) => b.active_users - a.active_users).slice(0, 5);

            res.json({
                success: true,
                summary: {
                    totalLocations,
                    totalRevenue,
                    totalUsers,
                    totalActiveUsers,
                    totalRouters
                },
                locations: locationStats,
                topByRevenue,
                topByActiveUsers
            });
        } catch (error) {
            console.error('Error getting detailed location stats:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = locationController;
