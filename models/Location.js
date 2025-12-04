/**
 * Location Model
 * Manages physical locations (universities, markets, hostels, etc.)
 */

const BaseModel = require('./BaseModel');
const db = require('../config/database');

class Location extends BaseModel {
    constructor() {
        super('locations');
    }

    /**
     * Get location with router and owner details
     */
    async getLocationWithDetails(locationId) {
        try {
            const query = `
                SELECT
                    l.*,
                    u.name as franchise_owner_name,
                    u.phone_number as franchise_owner_phone,
                    u.email as franchise_owner_email,
                    u.commission_rate as franchise_commission_rate,
                    COUNT(DISTINCT m.id) as router_count,
                    COUNT(DISTINCT usr.id) as total_users,
                    SUM(CASE WHEN m.status = 'online' THEN m.active_users ELSE 0 END) as active_users
                FROM locations l
                LEFT JOIN users u ON l.franchise_owner_id = u.id
                LEFT JOIN mikrotiks m ON l.id = m.location_id
                LEFT JOIN users usr ON l.id = usr.location_id
                WHERE l.id = ?
                GROUP BY l.id
            `;

            const [rows] = await this.db.query(query, [locationId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting location with details:', error);
            throw error;
        }
    }

    /**
     * Get all locations with stats
     */
    async getAllWithStats() {
        try {
            const query = `
                SELECT
                    l.*,
                    u.name as franchise_owner_name,
                    COUNT(DISTINCT m.id) as router_count,
                    COUNT(DISTINCT usr.id) as total_users,
                    SUM(CASE WHEN m.status = 'online' THEN 1 ELSE 0 END) as online_routers,
                    SUM(CASE WHEN m.status = 'online' THEN m.active_users ELSE 0 END) as active_users
                FROM locations l
                LEFT JOIN users u ON l.franchise_owner_id = u.id
                LEFT JOIN mikrotiks m ON l.id = m.location_id
                LEFT JOIN users usr ON l.id = usr.location_id
                WHERE l.is_active = 1
                GROUP BY l.id
                ORDER BY l.created_at DESC
            `;

            const [rows] = await this.db.query(query);
            return rows;
        } catch (error) {
            console.error('Error getting locations with stats:', error);
            throw error;
        }
    }

    /**
     * Get locations by franchise owner
     */
    async getLocationsByFranchiseOwner(franchiseOwnerId) {
        try {
            const query = `
                SELECT
                    l.*,
                    COUNT(DISTINCT m.id) as router_count,
                    COUNT(DISTINCT usr.id) as total_users,
                    SUM(CASE WHEN m.status = 'online' THEN m.active_users ELSE 0 END) as active_users
                FROM locations l
                LEFT JOIN mikrotiks m ON l.id = m.location_id
                LEFT JOIN users usr ON l.id = usr.location_id
                WHERE l.franchise_owner_id = ?
                GROUP BY l.id
                ORDER BY l.created_at DESC
            `;

            const [rows] = await this.db.query(query, [franchiseOwnerId]);
            return rows;
        } catch (error) {
            console.error('Error getting locations by franchise owner:', error);
            throw error;
        }
    }

    /**
     * Get location performance metrics
     */
    async getLocationPerformance(locationId, startDate, endDate) {
        try {
            const query = `
                SELECT
                    l.id,
                    l.name,
                    COUNT(DISTINCT ucl.user_id) as unique_users,
                    COUNT(DISTINCT ucl.id) as total_connections,
                    SUM(ucl.session_duration) as total_session_time,
                    SUM(ucl.bytes_downloaded + ucl.bytes_uploaded) as total_data_used,
                    AVG(ucl.session_duration) as avg_session_duration,
                    COUNT(DISTINCT cc.id) as campaign_completions,
                    SUM(cc.cost_charged) as revenue_generated
                FROM locations l
                LEFT JOIN user_connection_logs ucl ON l.id = ucl.location_id
                    AND ucl.timestamp BETWEEN ? AND ?
                LEFT JOIN campaign_completions cc ON l.id = cc.location_id
                    AND cc.completed_at BETWEEN ? AND ?
                WHERE l.id = ?
                GROUP BY l.id
            `;

            const [rows] = await this.db.query(query, [startDate, endDate, startDate, endDate, locationId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting location performance:', error);
            throw error;
        }
    }

    /**
     * Get top locations by revenue
     */
    async getTopLocationsByRevenue(limit = 10, startDate = null, endDate = null) {
        try {
            let query = `
                SELECT
                    l.*,
                    u.name as franchise_owner_name,
                    COUNT(DISTINCT cc.id) as total_completions,
                    SUM(cc.cost_charged) as total_revenue,
                    COUNT(DISTINCT cc.user_id) as unique_users
                FROM locations l
                LEFT JOIN users u ON l.franchise_owner_id = u.id
                LEFT JOIN campaign_completions cc ON l.id = cc.location_id
            `;

            const params = [];

            if (startDate && endDate) {
                query += ` WHERE cc.completed_at BETWEEN ? AND ?`;
                params.push(startDate, endDate);
            }

            query += `
                GROUP BY l.id
                ORDER BY total_revenue DESC
                LIMIT ?
            `;
            params.push(limit);

            const [rows] = await this.db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error getting top locations:', error);
            throw error;
        }
    }

    /**
     * Update location settings
     */
    async updateLocationSettings(locationId, settings) {
        try {
            const allowedFields = [
                'max_users',
                'bandwidth_limit_mbps',
                'operating_hours',
                'contact_person',
                'contact_phone',
                'contact_email',
                'is_active'
            ];

            const updateData = {};
            allowedFields.forEach(field => {
                if (settings[field] !== undefined) {
                    updateData[field] = settings[field];
                }
            });

            if (Object.keys(updateData).length === 0) {
                return false;
            }

            await this.update(locationId, updateData);
            return true;
        } catch (error) {
            console.error('Error updating location settings:', error);
            throw error;
        }
    }

    /**
     * Get nearby locations (by city/region)
     */
    async getNearbyLocations(city = null, region = null, limit = 10) {
        try {
            let query = `
                SELECT l.*, COUNT(DISTINCT m.id) as router_count
                FROM locations l
                LEFT JOIN mikrotiks m ON l.id = m.location_id AND m.status = 'online'
                WHERE l.is_active = 1
            `;

            const params = [];

            if (city) {
                query += ` AND l.city = ?`;
                params.push(city);
            }

            if (region) {
                query += ` AND l.region = ?`;
                params.push(region);
            }

            query += ` GROUP BY l.id ORDER BY l.created_at DESC LIMIT ?`;
            params.push(limit);

            const [rows] = await this.db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error getting nearby locations:', error);
            throw error;
        }
    }
}

module.exports = new Location();
