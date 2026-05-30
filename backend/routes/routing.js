const express = require('express');
const router = express.Router();
const routingController = require('../controllers/routingController');
const {verifyToken} = require('../middlewares/authJwt');

// GET /api/v1/geocode?q=<indirizzo>
router.get('/geocode', verifyToken, routingController.geocodeAddress);

// GET /api/v1/routes?to=<lng,lat>
router.get('/routes', verifyToken, routingController.calculateRoute);

module.exports = router;