const express = require('express');
const router = express.Router();
const structureController = require('../controllers/structureController');
const { verifyToken, requireRole } = require('../middlewares/authJwt');
 
// POST /api/v1/structures
//catena middleware:
router.post('/',
    verifyToken,
    requireRole('proprietario'),
    structureController.createStructure
);

//GET /api/v1/structures
router.get('/',
    verifyToken,
    structureController.getStructures
);

module.exports = router;
