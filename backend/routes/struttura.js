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

//GET /api/v1/structures/:id  
router.get('/:id',
    verifyToken,
    structureController.getStructureById
);

//PATCH /api/v1/structures/:id/accessibility
router.patch('/:id/accessibility',
    verifyToken,
    requireRole('proprietario'),
    structureController.updateAccessibility
);

module.exports = router;
