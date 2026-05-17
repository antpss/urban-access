const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authJwt');

// PATCH /api/v1/users/me
//aggiornamento parziale del profilo dell'utente autenticato.
//l'autorizzazione per-campo viene gestita nel controller.
router.patch('/me', verifyToken, userController.updateMe);

module.exports = router;