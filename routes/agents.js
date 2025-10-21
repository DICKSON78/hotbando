const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');

router.get('/', agentsController.getAgents);
router.post('/', agentsController.addAgent);
router.get('/performance/:agentId', agentsController.getAgentPerformance);

module.exports = router;