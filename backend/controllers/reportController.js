const mongoose = require('mongoose');
const Cittadino = require('../models/Cittadino');
const Segnalazione = require('../models/Segnalazione');
const SegnalazionePubblica = require('../models/SegnalazionePubblica');
const SegnalazionePrivata = require('../models/SegnalazionePrivata');
const StrutturaPrivata = require('../models/StrutturaPrivata');

const { categoriaPubblica } = require('../models/SegnalazionePubblica');
const { categoriaPrivata } = require('../models/SegnalazionePrivata');

const STATI_AMMESSI = ['APERTA', 'IN_VERIFICA', 'PRESA_IN_CARICO', 'RISOLTA', 'ARCHIVIATA'];

// funzione helper per validazione della bbox query
function parseBbox(bbox) {
    const parts = bbox.split(',').map(parseFloat);
    if (parts.length !== 4 || parts.some(Number.isNaN)) {
        return {error: 'formato atteso: minLng,minLat,maxLng,maxLat'};
    }
    const [minLng, minLat, maxLng, maxLat] = parts;
    if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
        return { error: 'coordinate fuori range' };
    }
    if (minLng >= maxLng || minLat >= maxLat) {
        return {error: 'minLng deve essere < maxLng e minLat < maxLat'};
    }
    return {box: [[minLng, minLat], [maxLng, maxLat]]};
}

//POST /api/v1/publicReports
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
        const fotoUrls = (req.files || []).map(f => `/uploads/reports/${f.filename}`);

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
            .location(`/api/v1/publicReports/${nuovaSegnalazione._id}`)
            .json({
                message: 'Segnalazione creata con successo',
                segnalazione: nuovaSegnalazione
            });

    } catch (err) {
        console.error('POST /publicReports', err);
        //se Mongoose rileva che i dati non rispettano lo schema definito (es. descrizione troppo corta)
        if (err.name === 'ValidationError') {
            const details = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({error: 'Validazione fallita', details});
        }
        
        //errore generico
        return res.status(500).json({error: 'Errore interno del server'});
    }
};

// POST /api/v1/privateReports
exports.createPrivateReport = async (req, res) => {
    try {
        const {descrizione, categoria, longitudine, latitudine, strutturaAssociata} = req.body;

        // converti le stringhe di coordinate in numeri
        const lng = parseFloat(longitudine);
        const lat = parseFloat(latitudine);
        if (Number.isNaN(lng) || Number.isNaN(lat)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{field: 'coordinate', message: 'longitudine e latitudine devono essere numeriche'}]
            });
        }

        // controllo che la stringa sia di HEX di 24 carattere per assicurare che sia un ObjectId valido
        const HEX24 = /^[a-fA-F0-9]{24}$/i;
        if (!strutturaAssociata || !HEX24.test(strutturaAssociata)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{field: 'strutturaAssociata', message: 'ID struttura mancante o non valido'}]
            });
        }

        //controllo se struttura associata esiste davverop
        const struttura = await StrutturaPrivata.findById(strutturaAssociata);
        if (!struttura) {
            return res.status(404).json({error: 'Struttura non trovata'});
        }

        const fotoUrls = (req.files || []).map(f => `/uploads/reports/${f.filename}`);

        //score iniziale = 1 + scoreAffidabilita dell'autore.
        // NB: un autore affidabile crea una segnalazione che può nascere già APERTA
        const autore = await Cittadino.findById(req.loggedUser.userId).select('scoreAffidabilita').lean();
        const scoreIniziale = 1 + (autore?.scoreAffidabilita ?? 0);

        const nuovaSegnalazione = new SegnalazionePrivata({
            descrizione,
            categoria,
            geolocalizzazione: {type: 'Point', coordinates: [lng, lat]},
            foto: fotoUrls,
            autore: req.loggedUser.userId,
            strutturaAssociata,
            scoreAssociato: scoreIniziale
        });

        // verifica persistenza della segnalazione privata
        await nuovaSegnalazione.save();

        // aggiorna lo storico segnalazioni del cittadino (ogni segnalazione è unica)
        await Cittadino.findByIdAndUpdate(
            req.loggedUser.userId,
            {$push: { storicoSegnalazioni: nuovaSegnalazione._id }}
        );

        return res.status(201).location(`/api/v1/privateReports/${nuovaSegnalazione._id}`).json({
            message: 'Segnalazione privata creata con successo ed in attesa di validazione',
            segnalazione: nuovaSegnalazione
        });
    }catch (err) {
        console.error('POST /privateReports', err);

        if (err.name === 'ValidationError') {
            const details = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({error: 'Validazione fallita', details});
        }

        if (err.name === 'CastError') {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{field: err.path, message: 'tipo non valido'}]
            })
        }

        return res.status(500).json({error: 'Errore interno del server'});
    }
};

// GET /api/v1/publicReports
exports.getPublicReports = async (req, res) => {
    try {
        const {bbox, stato, categoria} = req.query;
        const filter = {tipo: 'pubblica'};

        if (bbox) {
            const parsed = parseBbox(bbox);
            if (parsed.error) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{field: 'bbox', message: parsed.error}]
                });
            }
            filter.geolocalizzazione = {$geoWithin: { $box: parsed.box }};
        }

        if (stato) {
            if (!STATI_AMMESSI.includes(stato)) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'stato', message: `valore non ammesso. Ammessi: ${STATI_AMMESSI.join(', ')}` }]
                });
            }
            filter.stato = stato;
        }

        if(categoria){
            if(!categoriaPubblica.includes(categoria)){
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'categoria', message: `valore non ammesso. Ammessi: ${categoriaPubblica.join(', ')}` }]
                });
            }
            filter.categoria = categoria;
        }

        const segnalazioni = await Segnalazione.find(filter).select('-__v -bloccaModifica').lean();

        return res.status(200).json({
            count: segnalazioni.length,
            segnalazioni
        });

    } catch (err) {
        console.error('GET /publicReports', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/v1/privateReports
exports.getPrivateReports = async (req, res) => {
    try {
        const {bbox, stato, categoria} = req.query;
        const filter = {tipo: 'privata'};

        if (bbox) {
            const parsed = parseBbox(bbox);
            if (parsed.error) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{field: 'bbox', message: parsed.error}]
                });
            }
            filter.geolocalizzazione = {$geoWithin: {$box: parsed.box}};
        }

        if (stato) {
            if (!STATI_AMMESSI.includes(stato)) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'stato', message: `valore non ammesso. Ammessi: ${STATI_AMMESSI.join(', ')}` }]
                });
            }
            filter.stato = stato;
        }

        if(categoria){
            if(!categoriaPrivata.includes(categoria)){
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'categoria', message: `valore non ammesso. Ammessi: ${categoriaPrivata.join(', ')}` }]
                });
            }
            filter.categoria = categoria;
        }

        // valido subito strutturaAssociata, serve per decidere lo scope
        const { strutturaAssociata } = req.query;
        if (strutturaAssociata) {
            const HEX24 = /^[a-fA-F0-9]{24}$/;
            if (!HEX24.test(strutturaAssociata)) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'strutturaAssociata', message: 'ObjectId non valido' }]
                });
            }
            filter.strutturaAssociata = strutturaAssociata;
        }

        let isOwnerOfStructure = false;
        if (req.loggedUser.ruolo === 'proprietario' && strutturaAssociata) {
            const struttura = await StrutturaPrivata
                .findById(strutturaAssociata)
                .select('proprietario')
                .lean();
            if (struttura && struttura.proprietario.toString() === req.loggedUser.userId) {
                isOwnerOfStructure = true;
            }
        }

        const { proprietario } = req.query;
        if (proprietario) {
            const HEX24 = /^[a-fA-F0-9]{24}$/;
            if (!HEX24.test(proprietario)) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'proprietario', message: 'ObjectId non valido' }]
                });
            }
            // autorizzazione: puoi filtrare solo per il TUO id (anti-IDOR)
            if (proprietario !== req.loggedUser.userId) {
                return res.status(403).json({
                    error: 'Accesso negato. Puoi filtrare solo per il tuo id.'
                });
            }
            // recupero gli _id delle strutture possedute e li uso in $in
            const mieStrutture = await StrutturaPrivata
                .find({ proprietario })
                .select('_id')
                .lean();
            const ids = mieStrutture.map(s => s._id);
            // se non possiede strutture, nessuna privata può corrispondere
            filter.strutturaAssociata = { $in: ids };
        }

        const isOwnerQuery = (req.loggedUser.ruolo === 'proprietario'
            && proprietario === req.loggedUser.userId);

        const puoVedereTutto = req.loggedUser.ruolo === 'operatore'
            || isOwnerOfStructure
            || isOwnerQuery;

        if (!puoVedereTutto && !stato) {
            filter.stato = { $in: ['IN_VERIFICA', 'APERTA'] };
        }

        const segnalazioni = await Segnalazione.find(filter).select('-__v -bloccaModifica -listaValidatori -numAnomalie').lean();

        return res.status(200).json({
            count: segnalazioni.length,
            segnalazioni
        });

    } catch (err) {
        console.error('GET /privateReports', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PATCH /api/v1/privateReports/:id/stato
exports.updatePrivateReportState = async (req, res) => {
    try {
        const { id } = req.params;
        const { stato } = req.body || {};

        const HEX24 = /^[a-fA-F0-9]{24}$/;
        if (!HEX24.test(id)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'id', message: 'ObjectId non valido' }]
            });
        }

        if (stato !== 'RISOLTA') {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'stato', message: 'transizione non ammessa: ammesso solo "RISOLTA"' }]
            });
        }

        const segnalazione = await SegnalazionePrivata.findById(id);
        if (!segnalazione) {
            return res.status(404).json({ error: 'Segnalazione privata non trovata' });
        }

        // ownership: il proprietario loggato deve possedere la struttura associata
        const struttura = await StrutturaPrivata.findById(segnalazione.strutturaAssociata);
        if (!struttura) {
            return res.status(404).json({ error: 'Struttura associata non trovata' });
        }
        if (struttura.proprietario.toString() !== req.loggedUser.userId) {
            return res.status(403).json({
                error: 'Accesso negato. Puoi chiudere solo le segnalazioni sulle tue strutture.'
            });
        }

        if (!['IN_VERIFICA', 'APERTA'].includes(segnalazione.stato)) {
            return res.status(409).json({
                error: `Transizione non valida: una segnalazione in stato ${segnalazione.stato} non può essere chiusa.`
            });
        }

        segnalazione.stato = 'RISOLTA';
        await segnalazione.save();

        console.log(`Segnalazione privata ${id} chiusa (RISOLTA) dal proprietario ${req.loggedUser.userId}`);

        return res.status(200).json({
            message: 'Segnalazione contrassegnata come risolta',
            segnalazione
        });

    } catch (err) {
        console.error('[PATCH /privateReports/:id/stato]', err);
        if (err.name === 'ValidationError') {
            const details = Object.values(err.errors).map(e => ({
                field: e.path, message: e.message
            }));
            return res.status(400).json({ error: 'Validazione fallita', details });
        }
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};