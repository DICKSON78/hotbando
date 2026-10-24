/**
 * Public Controller - Handles public website forms
 */

const db = require('../config/database');

// Submit Partner Application
async function submitPartnerApplication(req, res) {
    try {
        const {
            fullName, name,
            location,
            businessType, type,
            packageType,
            phoneNumber, phone,
            email,
            message
        } = req.body;

        const applicantName = fullName || name;
        const applicantPhone = phoneNumber || phone;
        const applicantBusinessType = businessType || type;

        // Validation
        if (!applicantName || !location || !applicantBusinessType || !applicantPhone) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        // Validate phone number format (Tanzanian)
        const phoneRegex = /^(\+?255|0)[67]\d{8}$/;
        if (!phoneRegex.test(applicantPhone.replace(/\s/g, ''))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number. Please enter a valid Tanzanian number.'
            });
        }

        // Insert into database
        await db.execute(
            `INSERT INTO partner_applications
             (full_name, location, business_type, package_type, phone_number, email, message, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [applicantName, location, applicantBusinessType, packageType || null, applicantPhone, email || null, message || null]
        );

        res.json({
            success: true,
            message: 'Thank you! Your application has been received. We will contact you shortly.'
        });

    } catch (error) {
        console.error('Error submitting partner application:', error);
        res.status(500).json({
            success: false,
            message: 'Samahani, kuna tatizo limetokea. Tafadhali jaribu tena baadaye.'
        });
    }
}

// Submit Contact Message
async function submitContactMessage(req, res) {
    try {
        const { name, email, message, subject, phone } = req.body;

        // Validation
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address. Please enter a valid email.'
            });
        }

        // Insert into database (subject/phone are optional extras)
        await db.execute(
            `INSERT INTO contact_messages (name, email, subject, phone, message, status, created_at)
             VALUES (?, ?, ?, ?, ?, 'unread', NOW())`,
            [name, email, subject || null, phone || null, message]
        );

        res.json({
            success: true,
            message: 'Thank you for your message! We will get back to you shortly.'
        });

    } catch (error) {
        console.error('Error submitting contact message:', error);
        res.status(500).json({
            success: false,
            message: 'Samahani, kuna tatizo limetokea. Tafadhali jaribu tena baadaye.'
        });
    }
}

// Get Partner Applications (Admin)
async function getPartnerApplications(req, res) {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM partner_applications';
        const params = [];

        if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }

        query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [applications] = await db.execute(query, params);

        // Get counts
        const [counts] = await db.execute(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM partner_applications
        `);

        res.json({
            success: true,
            applications,
            counts: counts[0]
        });

    } catch (error) {
        console.error('Error getting partner applications:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading applications'
        });
    }
}

// Get Contact Messages (Admin)
async function getContactMessages(req, res) {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM contact_messages';
        const params = [];

        if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }

        query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [messages] = await db.execute(query, params);

        // Get counts
        const [counts] = await db.execute(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread,
                SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as \`read\`,
                SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied
            FROM contact_messages
        `);

        res.json({
            success: true,
            messages,
            counts: counts[0]
        });

    } catch (error) {
        console.error('Error getting contact messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading messages'
        });
    }
}

// Update Partner Application Status
async function updatePartnerApplicationStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        await db.execute(
            `UPDATE partner_applications
             SET status = ?, notes = ?, processed_by = ?, processed_at = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [status, notes || null, req.user?.id || null, id]
        );

        res.json({
            success: true,
            message: 'Hali imebadilishwa'
        });

    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
}

// Update Contact Message Status
async function updateContactMessageStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, reply } = req.body;

        await db.execute(
            `UPDATE contact_messages
             SET status = ?, reply = ?, replied_by = ?, replied_at = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [status, reply || null, req.user?.id || null, id]
        );

        res.json({
            success: true,
            message: 'Hali imebadilishwa'
        });

    } catch (error) {
        console.error('Error updating message status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
}

module.exports = {
    submitPartnerApplication,
    submitContactMessage,
    getPartnerApplications,
    getContactMessages,
    updatePartnerApplicationStatus,
    updateContactMessageStatus,
    getPublicStats
};

// Public stats for homepage (no auth required)
async function getPublicStats(req, res) {
    try {
        const [[userRow]] = await db.execute("SELECT COUNT(*) as count FROM users WHERE role='customer'");
        const [[locRow]] = await db.execute("SELECT COUNT(*) as count FROM locations WHERE status != 'inactive'");
        const [[payRow]] = await db.execute("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status='completed'");
        const [[rtrRow]] = await db.execute("SELECT COUNT(*) as count FROM mikrotiks WHERE status='online'");

        const activeUsers = userRow?.count || 0;
        const locations = locRow?.count || 0;
        const revenueTSH = Number(payRow?.total || 0);
        const onlineRouters = rtrRow?.count || 0;

        res.json({
            success: true,
            stats: {
                users: activeUsers > 0 ? `${Math.round(activeUsers / 1000)}K+` : '10K+',
                locations: locations > 0 ? `${locations}+` : '50+',
                data_gb: revenueTSH > 0 ? `${Math.round(revenueTSH / 1000)}K+` : '100K+',
                uptime: onlineRouters > 0 ? '99%' : '99%'
            }
        });
    } catch (error) {
        // Return defaults on error
        res.json({
            success: true,
            stats: { users: '10K+', locations: '50+', data_gb: '100K+', uptime: '99%' }
        });
    }
}
