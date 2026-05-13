const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// rotta registrazione per nuovo cittadino
router.post('/register/citizen', authController.registerCitizen);


// rotta registrazione per nuovo proprietario
router.post('/register/owner', authController.registerOwner);

module.exports = router;