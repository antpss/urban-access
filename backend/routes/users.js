const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authJwt');

// PATCH /api/v1/users/me
//aggiornamento parziale del profilo dell'utente autenticato, l'autorizzazione per-campo viene gestita nel controller.
router.patch('/me', verifyToken, userController.updateMe);

// GET /api/v1/users/me
// lettura profilo utente autenticato
router.get('/me', verifyToken, userController.getMe);

// DELETE /api/v1/users/me
// cancellazione definitica dell'account dell'utente autenticato
router.delete('/me', verifyToken, userController.deleteMe);

module.exports = router;