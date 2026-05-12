const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// rotta registrazione per nuovo cittadino
router.post('/register', authController.register);

module.exports = router;