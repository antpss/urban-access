const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, requireRole } = require('../middlewares/authJwt');
const { uploadFotoSegnalazione } = require('../middlewares/photoUploader');

// POST /api/v1/reports/public
router.post('/public',
    verifyToken,
    requireRole('cittadino'),
    uploadFotoSegnalazione,
    reportController.createPublicReport
);

// POST /api/v1/reports/private
router.post('/private',
    verifyToken,
    requireRole('cittadino'),
    uploadFotoSegnalazione,
    reportController.createPrivateReport
);

// GET /api/v1/reports
router.get('/', 
    verifyToken,
    reportController.getReports
)
module.exports = router;