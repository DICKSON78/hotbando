const db = require('../config/database');

class AgentsController {
    async getAgents(req, res) {
        try {
            const { location } = req.query;
            let query = 'SELECT id, name, phone, location FROM agents';
            let params = [];
            if (location) {
                query += ' WHERE location = ?';
                params = [location];
            }
            const [agents] = await db.execute(query, params);
            res.json({ success: true, data: agents });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async addAgent(req, res) {
        try {
            const { name, phone, location } = req.body;
            if (!name || !phone || !location) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            await db.execute(
                'INSERT INTO agents (name, phone, location, created_at) VALUES (?, ?, ?, NOW())',
                [name, phone, location]
            );
            res.json({ success: true, message: 'Agent added successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getAgentPerformance(req, res) {
        try {
            const { agentId } = req.params;
            const [sales] = await db.execute(
                'SELECT COUNT(*) as voucher_count, SUM(value) as total_sales FROM payments p JOIN batches b ON p.batch_id = b.id WHERE b.issuedto = ? AND p.is_used = 1',
                [agentId]
            );
            res.json({ success: true, data: sales[0] });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new AgentsController();