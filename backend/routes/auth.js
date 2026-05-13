const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

//rotta registrazione per nuovo cittadino
router.post('/register/citizen', authController.registerCitizen);


//rotta registrazione per nuovo proprietario
router.post('/register/owner', authController.registerOwner);

//rotta login per utente (cittadino o proprietario)
router.post('/login', authController.login);

module.exports = router;