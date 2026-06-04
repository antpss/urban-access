const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middlewares/authJwt');

// GET /api/v1/admin/heatmap
//riservato agli operatori comunali: prima si verifica il token, poi si controlla che il ruolo sia 'operatore'
router.get('/heatmap',
    verifyToken,
    requireRole('operatore'),
    adminController.getHeatmap
);

module.exports = router;