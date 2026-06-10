const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, requireRole } = require('../middlewares/authJwt');
const { uploadFotoSegnalazione } = require('../middlewares/photoUploader');

// POST /api/v1/publicReports
router.post('/',
    verifyToken,
    requireRole('cittadino'),
    uploadFotoSegnalazione,
    reportController.createPublicReport
);

// GET /api/v1/publicReports
router.get('/',
    verifyToken,
    reportController.getPublicReports
);

module.exports = router;
