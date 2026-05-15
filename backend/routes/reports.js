const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, requireRole } = require('../middlewares/authJwt');
const { uploadFotoSegnalazione } = require('../middlewares/photoUploader');

// POST /api/v1/reports/public
//chain: auth → autorizzazione ruolo → parsing multipart → controller
router.post('/public',
    verifyToken,
    requireRole('cittadino'),
    uploadFotoSegnalazione,
    reportController.createPublicReport
);

module.exports = router;