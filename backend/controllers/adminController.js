const mongoose = require('mongoose');
const Segnalazione = require('../models/Segnalazione');
const { categoriaPubblica } = require('../models/SegnalazionePubblica');
const StrutturaPrivata = require('../models/StrutturaPrivata');

//stati considerati "attivi" per la heatmap: criticità ancora aperte sul territorio
//esclusi di proposito: PRESA_IN_CARICO, RISOLTA, ARCHIVIATA
const STATI_ATTIVI = ['APERTA', 'IN_VERIFICA'];

//whitelist dei campi su cui è ammesso ordinare nella dashboard (US20).
//motivo: passare un campo arbitrario a .sort() di Mongoose è una superficie
//di abuso (ordinamento su campo non indicizzato -> scan + sort in memoria = DoS,
//oltre a leak di campi interni). Si ammettono solo campi noti e sensati.
const ORDER_BY_AMMESSI = ['createdAt', 'updatedAt', 'categoria', 'stato'];

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

// GET /api/v1/admin/reports?stato=&categoria=&from=&to=&orderBy=&order=&page=&limit=
// US20 - Dashboard segnalazioni pubbliche: lista filtrabile, ordinata e paginata.
exports.getReportsDashboard = async (req, res) => {
    try {
        const { stato, categoria, from, to, orderBy, order } = req.query;

        //filtro di base: dashboard operatore = SOLO segnalazioni pubbliche.
        //forzato server-side: il client non può ampliare lo scope alle private.
        const filter = { tipo: 'pubblica' };

        //--- filtro stato ---
        //la dashboard tratta SOLO segnalazioni pubbliche. Stati lavorabili dal
        //punto di vista operativo: APERTA (da pianificare) e PRESA_IN_CARICO
        //(in lavorazione, US21). IN_VERIFICA è escluso: riservato alle private
        //(vincolo OCL, una pubblica non è mai IN_VERIFICA).
        const STATI_DASHBOARD = ['APERTA', 'PRESA_IN_CARICO'];
        if (stato) {
            if (!STATI_DASHBOARD.includes(stato)) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'stato', message: `valore non ammesso. Ammessi: ${STATI_DASHBOARD.join(', ')}` }]
                });
            }
            filter.stato = stato;
        } else {
            //default: entrambi gli stati lavorabili.
            filter.stato = { $in: STATI_DASHBOARD };
        }

        //--- filtro categoria ---
        //validato contro l'enum delle categorie pubbliche.
        if (categoria) {
            if (!categoriaPubblica.includes(categoria)) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'categoria', message: `valore non ammesso. Ammessi: ${categoriaPubblica.join(', ')}` }]
                });
            }
            filter.categoria = categoria;
        }

        //--- filtro temporale su createdAt ---
        if (from || to) {
            filter.createdAt = {};
            if (from) {
                const d = new Date(from);
                if (Number.isNaN(d.getTime())) {
                    return res.status(400).json({
                        error: 'Validazione fallita',
                        details: [{ field: 'from', message: 'data non valida (atteso ISO 8601)' }]
                    });
                }
                filter.createdAt.$gte = d;
            }
            if (to) {
                const d = new Date(to);
                if (Number.isNaN(d.getTime())) {
                    return res.status(400).json({
                        error: 'Validazione fallita',
                        details: [{ field: 'to', message: 'data non valida (atteso ISO 8601)' }]
                    });
                }
                filter.createdAt.$lte = d;
            }
            if (from && to && filter.createdAt.$gte > filter.createdAt.$lte) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'to', message: 'to deve essere >= from' }]
                });
            }
        }

        //--- ordinamento (whitelist obbligatoria) ---
        const campoOrdinamento = orderBy || 'createdAt';
        if (!ORDER_BY_AMMESSI.includes(campoOrdinamento)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'orderBy', message: `valore non ammesso. Ammessi: ${ORDER_BY_AMMESSI.join(', ')}` }]
            });
        }
        //direzione: default desc (più recenti prima).
        let direzione = -1;
        if (order) {
            if (order !== 'asc' && order !== 'desc') {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'order', message: "valore non ammesso. Ammessi: asc, desc" }]
                });
            }
            direzione = order === 'asc' ? 1 : -1;
        }
        const sort = { [campoOrdinamento]: direzione };

        //--- paginazione ---
        //page default 1, limit default 20 (max 100). Validazione difensiva sugli interi.
        let page = parseInt(req.query.page, 10);
        if (Number.isNaN(page)) page = 1;
        if (page < 1) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'page', message: 'page deve essere un intero >= 1' }]
            });
        }
        let limit = parseInt(req.query.limit, 10);
        if (Number.isNaN(limit)) limit = 20;
        if (limit < 1 || limit > 100) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'limit', message: 'limit deve essere un intero tra 1 e 100' }]
            });
        }
        const skip = (page - 1) * limit;

        //query dati + conteggio totale in parallelo (il count usa lo stesso filtro).
        const [segnalazioni, totalItems] = await Promise.all([
            Segnalazione.find(filter)
                .select('-__v -bloccaModifica')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Segnalazione.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return res.status(200).json({
            count: segnalazioni.length,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages
            },
            segnalazioni
        });

    } catch (err) {
        console.error('GET /admin/reports', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PATCH /api/v1/admin/reports/:id/presa-in-carico
//operatore prende in carico una segnalazione pubblica APERTA
//transizione consentita: APERTA -> PRESA_IN_CARICO. Assegna enteCompetente = operatore (dal JWT)
exports.presaInCarico = async (req, res) => {
    try {
        const { id } = req.params;

        //validazione ObjectId prima di toccare il DB: id malformato -> 400.
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'id', message: 'ObjectId non valido' }]
            });
        }

        const segnalazione = await Segnalazione.findOne({ _id: id, tipo: 'pubblica' });
        if (!segnalazione) {
            return res.status(404).json({ error: 'Segnalazione pubblica non trovata' });
        }

        if (segnalazione.stato !== 'APERTA') {
            return res.status(409).json({
                error: 'La segnalazione non è in stato APERTA: impossibile prenderla in carico'
            });
        }

        //enteCompetente preso dal JWT (anti-IDOR): operatore non può assegnare la presa in carico ad altro operatore
        segnalazione.stato = 'PRESA_IN_CARICO';
        segnalazione.enteCompetente = req.loggedUser.userId;
        await segnalazione.save();

        return res.status(200).json({
            message: 'Segnalazione presa in carico con successo',
            segnalazione
        });

    } catch (err) {
        console.error('PATCH /admin/reports/:id/presa-in-carico', err);
        if (err.name === 'ValidationError') {
            const details = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ error: 'Validazione fallita', details });
        }
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};


//PATCH /api/v1/admin/privateReports/:id
//US23 Forzatura stato segnalazione privata da parte dell'operatore
//bypassa ownership e soglia di validazione crowd
const STATI_FORZABILI = ['APERTA', 'ARCHIVIATA', 'RISOLTA'];

exports.forzaStatoPrivata = async (req, res) => {
    try {
        const { id } = req.params;
        const { stato, motivazione } = req.body || {};

        //validazione ObjectId prima di toccare il db
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'id', message: 'ObjectId non valido' }]
            });
        }

        //stato target obbligatorio e ristretto alla whitelist
        if (!stato || !STATI_FORZABILI.includes(stato)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'stato', message: `valore non ammesso. Ammessi: ${STATI_FORZABILI.join(', ')}` }]
            });
        }

        //motivazione obbligatoria minimo 10 caratteri
        if (!motivazione || typeof motivazione !== 'string' || motivazione.trim().length < 10) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'motivazione', message: 'la motivazione è obbligatoria (minimo 10 caratteri)' }]
            });
        }

        //findOne con tipo 'privata' sul modello base
        const segnalazione = await Segnalazione.findOne({ _id: id, tipo: 'privata' });
        if (!segnalazione) {
            return res.status(404).json({ error: 'Segnalazione privata non trovata' });
        }

        //applico la modifica
        segnalazione.stato = stato;
        segnalazione.visibile = (stato === 'APERTA');
        segnalazione.motivazioneForzatura = motivazione.trim();

        //flag transitorio dice al pre('validate') di saltare il vincolo di soglia crowd
        segnalazione._forzaturaOperatore = true;

        await segnalazione.save();

        //incremento atomico del contatore sulla struttura
        await StrutturaPrivata.findByIdAndUpdate(
            segnalazione.strutturaAssociata,
            { $inc: { numForzature: 1 } }
        );

        return res.status(200).json({
            message: 'Stato della segnalazione modificato con successo',
            segnalazione
        });

    } catch (err) {
        console.error('PATCH /admin/privateReports/:id', err);
        if (err.name === 'ValidationError') {
            const details = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ error: 'Validazione fallita', details });
        }
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/v1/admin/structures?categoria=&minAnomalie=&orderBy=&order=
exports.getStructuresDashboard = async (req, res) => {
    try {
        const { categoria, minAnomalie, orderBy, order } = req.query;

        const filter = {};

        //--- filtro categoria (enum struttura) ---
        const CATEGORIE_STRUTTURA = [
            'ristorante', 'bar', 'negozio', 'ufficio',
            'hotel', 'studio_medico', 'palestra', 'altro'
        ];
        if (categoria) {
            if (!CATEGORIE_STRUTTURA.includes(categoria)) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'categoria', message: `valore non ammesso. Ammessi: ${CATEGORIE_STRUTTURA.join(', ')}` }]
                });
            }
            filter.categoria = categoria;
        }

        //filtro minAnomalie: solo strutture con almeno N anomalie (per isolare i casi critici)
        if (minAnomalie !== undefined) {
            const n = parseInt(minAnomalie, 10);
            if (Number.isNaN(n) || n < 0) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'minAnomalie', message: 'deve essere un intero >= 0' }]
                });
            }
            filter.numAnomalieStruttura = { $gte: n };
        }

        //ordinamento (whitelist)
        const ORDER_BY_AMMESSI = ['numAnomalieStruttura', 'numForzature', 'nome', 'createdAt'];
        const campoOrdinamento = orderBy || 'numAnomalieStruttura';
        if (!ORDER_BY_AMMESSI.includes(campoOrdinamento)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'orderBy', message: `valore non ammesso. Ammessi: ${ORDER_BY_AMMESSI.join(', ')}` }]
            });
        }
        let direzione = -1; //default desc: i più problematici in cima
        if (order) {
            if (order !== 'asc' && order !== 'desc') {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'order', message: 'valore non ammesso. Ammessi: asc, desc' }]
                });
            }
            direzione = order === 'asc' ? 1 : -1;
        }

        const strutture = await StrutturaPrivata
            .find(filter)
            .select('-__v')
            .sort({ [campoOrdinamento]: direzione })
            .lean();

        return res.status(200).json({
            count: strutture.length,
            strutture
        });

    } catch (err) {
        console.error('GET /admin/structures', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};
