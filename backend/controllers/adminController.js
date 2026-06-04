const Segnalazione = require('../models/Segnalazione');

//stati considerati "attivi" per la heatmap: criticità ancora aperte sul territorio
//esclusi di proposito: PRESA_IN_CARICO, RISOLTA, ARCHIVIATA
const STATI_ATTIVI = ['APERTA', 'IN_VERIFICA'];

// GET /api/v1/admin/heatmap?stato=&from=&to=&precision=
exports.getHeatmap = async (req, res) => {
    try {
        const { stato, from, to } = req.query;

        //precision: numero di decimali per il binning della griglia
        // default 3 (~111 m). Clamp difensivo a [1,5].
        let precision = parseInt(req.query.precision, 10);
        if (Number.isNaN(precision)) precision = 3;
        if (precision < 1 || precision > 5) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'precision', message: 'precision deve essere un intero tra 1 e 5' }]
            });
        }

        //costruzione del filtro di match (prima dell'aggregazione)
        const match = {};

        //filtro stato: se assente, prendo entrambi gli stati attivi.
        if (stato) {
            if (!STATI_ATTIVI.includes(stato)) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'stato', message: `valore non ammesso. Ammessi: ${STATI_ATTIVI.join(', ')}` }]
                });
            }
            match.stato = stato;
        } else {
            match.stato = { $in: STATI_ATTIVI };
        }

        //filtro temporale su createdAt (generato da timestamps:true).
        if (from || to) {
            match.createdAt = {};
            if (from) {
                const d = new Date(from);
                if (Number.isNaN(d.getTime())) {
                    return res.status(400).json({
                        error: 'Validazione fallita',
                        details: [{ field: 'from', message: 'data non valida (atteso ISO 8601)' }]
                    });
                }
                match.createdAt.$gte = d;
            }
            if (to) {
                const d = new Date(to);
                if (Number.isNaN(d.getTime())) {
                    return res.status(400).json({
                        error: 'Validazione fallita',
                        details: [{ field: 'to', message: 'data non valida (atteso ISO 8601)' }]
                    });
                }
                match.createdAt.$lte = d;
            }
            if (from && to && match.createdAt.$gte > match.createdAt.$lte) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'to', message: 'to deve essere >= from' }]
                });
            }
        }

        //aggregation pipeline: binning lato DB
        //fattore di arrotondamento: per precision=3 -> 1000. round(coord * 1000) / 1000 == troncamento a 3 decimali sulla griglia.
        const factor = Math.pow(10, precision);

        const pipeline = [
            { $match: match },
            {
                $project: {
                    stato: 1,
                    cellLng: {
                        $divide: [
                            { $round: [{ $multiply: [{ $arrayElemAt: ['$geolocalizzazione.coordinates', 0] }, factor] }, 0] },
                            factor
                        ]
                    },
                    cellLat: {
                        $divide: [
                            { $round: [{ $multiply: [{ $arrayElemAt: ['$geolocalizzazione.coordinates', 1] }, factor] }, 0] },
                            factor
                        ]
                    }
                }
            },
            {
                //raggruppare per cella; conto totale e per stato in un solo passaggio
                $group: {
                    _id: { lat: '$cellLat', lng: '$cellLng' },
                    count: { $sum: 1 },
                    countAperta: {
                        $sum: { $cond: [{ $eq: ['$stato', 'APERTA'] }, 1, 0] }
                    },
                    countInVerifica: {
                        $sum: { $cond: [{ $eq: ['$stato', 'IN_VERIFICA'] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    lat: '$_id.lat',
                    lng: '$_id.lng',
                    count: 1,
                    countAperta: 1,
                    countInVerifica: 1
                }
            },
            { $sort: { count: -1 } }
        ];

        const celle = await Segnalazione.aggregate(pipeline);

        return res.status(200).json({
            count: celle.length,
            precision,
            celle
        });

    } catch (err) {
        console.error('GET /admin/heatmap', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};