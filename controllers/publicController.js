/**
 * Public Controller - Handles public website forms
 */

const db = require('../config/database');

// Submit Partner Application
async function submitPartnerApplication(req, res) {
    try {
        const {
            fullName,
            location,
            businessType,
            packageType,
            phoneNumber,
            email,
            message
        } = req.body;

        // Validation
        if (!fullName || !location || !businessType || !packageType || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Tafadhali jaza taarifa zote zinazohitajika'
            });
        }

        // Validate phone number format (Tanzanian)
        const phoneRegex = /^(\+?255|0)[67]\d{8}$/;
        if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
            return res.status(400).json({
                success: false,
                message: 'Namba ya simu si sahihi. Tafadhali andika namba sahihi'
            });
        }

        // Insert into database
        await db.execute(
            `INSERT INTO partner_applications
             (full_name, location, business_type, package_type, phone_number, email, message, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [fullName, location, businessType, packageType, phoneNumber, email || null, message || null]
        );

        res.json({
            success: true,
            message: 'Asante! Ombi lako limepokelewa. Tutawasiliana nawe haraka iwezekanavyo.'
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
        const { name, email, message } = req.body;

        // Validation
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Tafadhali jaza taarifa zote zinazohitajika'
            });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Barua pepe si sahihi. Tafadhali andika barua pepe sahihi'
            });
        }

        // Insert into database
        await db.execute(
            `INSERT INTO contact_messages (name, email, message, status, created_at)
             VALUES (?, ?, ?, 'unread', NOW())`,
            [name, email, message]
        );

        res.json({
            success: true,
            message: 'Asante kwa ujumbe wako! Tutakujibu haraka iwezekanavyo.'
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
    updateContactMessageStatus
};
