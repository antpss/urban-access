const mongoose = require('mongoose');
const Cittadino = require('../models/Cittadino');
const SegnalazionePubblica = require('../models/SegnalazionePubblica');
const SegnalazionePrivata = require('../models/SegnalazionePrivata');
const StrutturaPrivata = require('../models/StrutturaPrivata');

//POST /api/v1/reports/public
exports.createPublicReport = async (req, res) => {
    try {
        const { descrizione, categoria, longitudine, latitudine } = req.body;

        //campi testuali come stringhe: covnersione esplicita in numeri
        const lng = parseFloat(longitudine);
        const lat = parseFloat(latitudine);
        
        //check sicurezza: se i valori non sono numeri validi, blocca subito la richiesta
        if (Number.isNaN(lng) || Number.isNaN(lat)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'coordinate', message: 'longitudine e latitudine devono essere numeriche' }]
            });
        }

        //estrapolazione degli URL relativi delle foto salvate dal middleware (servite da express.static su /uploads)
        const fotoUrls = (req.files || []).map(f => `/uploads/segnalazioni/${f.filename}`);

        const nuovaSegnalazione = new SegnalazionePubblica({
            descrizione,
            categoria,
            geolocalizzazione: { type: 'Point', coordinates: [lng, lat] },
            foto: fotoUrls,
            autore: req.loggedUser.userId
        });
        
        //salvataggio segnalazione nel db  
        await nuovaSegnalazione.save();

        //aggiornamento storico del cittadino
        await Cittadino.findByIdAndUpdate(
            req.loggedUser.userId,
            { $push: { storicoSegnalazioni: nuovaSegnalazione._id } }
        );

        //risposta di successo inviata al client
        return res
            .status(201)
            .location(`/api/v1/reports/${nuovaSegnalazione._id}`)
            .json({
                message: 'Segnalazione creata con successo',
                segnalazione: nuovaSegnalazione
            });

    } catch (err) {
        console.error("ERRORE REPORT CONTROLLER:", err);
        //se Mongoose rileva che i dati non rispettano lo schema definito (es. descrizione troppo corta)
        if (err.name === 'ValidationError') {
            const details = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ error: 'Validazione fallita', details });
        }
        
        //errore generico
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/v1/reports/private
exports.createPrivateReport = async (req, res) => {
    try {
        const {descrizione, categoria, longitudine, latitudine, strutturaAssociata} = req.body;

        // converti le stringhe di coordinate in numeri
        const lng = parseFloat(longitudine);
        const lat = parseFloat(latitudine);
        if (Number.isNaN(lng) || Number.isNaN(lat)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'coordinate', message: 'longitudine e latitudine devono essere numeriche' }]
            });
        }

        // validazione strutturaAssociata come ObjectId valido
        if (!strutturaAssociata || !mongoose.Types.ObjectId.isValid(strutturaAssociata)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'strutturaAssociata', message: 'ID struttura mancante o non valido' }]
            });
        }

        //controllo se struttura associata esiste davverop
        const struttura = await StrutturaPrivata.findById(strutturaAssociata);
        if (!struttura) {
            return res.status(404).json({
                error: 'Struttura non trovata'
            });
        }

        const fotoUrls = (req.files || []).map(f => `/uploads/segnalazioni/${f.filename}`);

        const nuovaSegnalazione = new SegnalazionePrivata({
            descrizione,
            categoria,
            geolocalizzazione: { type: 'Point', coordinates: [lng, lat] },
            foto: fotoUrls,
            autore: req.loggedUser.userId,
            strutturaAssociata
        });

        // verifica persistenza della segnalazione privata
        await nuovaSegnalazione.save();

        // aggiorna lo storico segnalazioni del cittadino (ogni segnalazione è unica)
        await Cittadino.findByIdAndUpdate(
            req.loggedUser.userId,
            { $push: { storicoSegnalazioni: nuovaSegnalazione._id } }
        );

        return res.status(201).location(`/api/v1/reports/${nuovaSegnalazione._id}`).json({
            message: 'Segnalazione privata creata con successo ed in attesa di validazione',
            segnalazione: nuovaSegnalazione
        });
    }catch (err) {
        console.error("ERRORE REPORT CONTROLLER:", err);

        if (err.name === 'ValidationError') {
            const details = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ error: 'Validazione fallita', details });
        }

        if (err.name === 'CastError') {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: err.path, message: 'tipo non valido' }]
            })
        }

        return res.status(500).json({ error: 'Errore interno del server' });
    }
};