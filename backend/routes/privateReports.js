const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, requireRole } = require('../middlewares/authJwt');
const { uploadFotoSegnalazione } = require('../middlewares/photoUploader');

// POST /api/v1/privateReports
router.post('/',
    verifyToken,
    requireRole('cittadino'),
    uploadFotoSegnalazione,
    reportController.createPrivateReport
);

// GET /api/v1/privateReports
router.get('/',
    verifyToken,
    reportController.getPrivateReports
);

module.exports = router;