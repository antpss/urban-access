const {POS_TRENTO} = require('../config/routing');
const geocodingService = require('../services/geocodingService');
const routingService = require('../services/routingService');

// GET /api/v1/geocode?q=<indirizzo>
exports.geocodeAddress = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || typeof q !== 'string' || q.trim().length < 3) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'q', message: 'parametro di ricerca obbligatorio (min 3 caratteri)' }]
            });
        }

        const candidati = await geocodingService.geocode(q.trim());

        return res.status(200).json({
            count: candidati.length,
            candidati
        });

    } catch (err) {
        console.error('[GET /geocode]', err);
        return res.status(err.statusCode || 500).json({
            error: err.statusCode === 502 ? 'Servizio di geocoding non disponibile' : 'Errore interno del server'
        });
    }
};

// GET /api/v1/routes?to=<lng,lat>
// attualmente l'origine è hardcoded a Trento centro
exports.calculateRoute = async (req, res) => {
    try {
        const {to} = req.query;

        if (!to || typeof to !== 'string') {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'to', message: 'destinazione obbligatoria, formato: lng,lat' }]
            });
        }

        const parts = to.split(',').map(parseFloat);
        if (parts.length !== 2 || parts.some(Number.isNaN)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'to', message: 'formato atteso: lng,lat (due numeri)' }]
            });
        }

        const [lng, lat] = parts;
        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'to', message: 'coordinate fuori range' }]
            });
        }

        // Origine fissa, da sostituire in futuro con geolocalizzazione utente
        const origin = { lng: POS_TRENTO[0], lat: POS_TRENTO[1] };
        const destination = {lng, lat};

        const percorso = await routingService.calculateRoute(origin, destination);

        return res.status(200).json({
            origin,
            destination,
            ...percorso
        });

    } catch (err) {
        console.error('[GET /routes]', err);

        if (err.statusCode === 422) {
            return res.status(422).json({
                error: 'Nessun percorso pedonale raggiungibile verso la destinazione indicata'
            });
        }
        if (err.statusCode === 502) {
            return res.status(502).json({
                error: 'Servizio di routing temporaneamente non disponibile'
            });
        }
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};