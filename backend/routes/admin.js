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

// GET /api/v1/admin/reports
//dashboard segnalazioni pubbliche (lista filtrabile, ordinata, paginata)
router.get('/reports',
    verifyToken,
    requireRole('operatore'),
    adminController.getReportsDashboard
);

// PATCH /api/v1/admin/reports/:id/presa-in-carico
//operatore prende in carico una segnalazione pubblica APERTA
router.patch('/reports/:id/presa-in-carico',
    verifyToken,
    requireRole('operatore'),
    adminController.presaInCarico
);

// PATCH /api/v1/admin/privateReports/:id
router.patch('/privateReports/:id',
    verifyToken,
    requireRole('operatore'),
    adminController.forzaStatoPrivata
);

module.exports = router;