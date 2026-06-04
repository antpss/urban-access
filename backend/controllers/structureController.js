const StrutturaPrivata = require('../models/StrutturaPrivata');
const Proprietario = require('../models/Proprietario');

//rimuove campi interni prima della risposta
function sanitizeStruttura(strutturaDoc) {
    const obj = strutturaDoc.toObject();
    delete obj.__v;
    return obj;
}

// POST /api/v1/structures
exports.createStructure = async (req, res) => {
    try {
        //destructuring esplicito: ignora qualsiasi campo non previsto nel body
        //(es. se il client tenta di passare `proprietario`, viene scartato)
        const { nome, categoria, indirizzo, geolocalizzazione } = req.body;

        //il proprietario viene SEMPRE derivato dal JWT, mai dal body
        //req.loggedUser è popolato dal middleware verifyToken
        const proprietarioId = req.loggedUser.userId;

        //validazione strutturale del campo geolocalizzazione PRIMA di passarlo a Mongoose
        if (!geolocalizzazione || typeof geolocalizzazione !== 'object') {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{
                    field: 'geolocalizzazione',
                    message: 'campo obbligatorio, deve essere un oggetto GeoJSON Point'
                }]
            });
        }

        const nuovaStruttura = new StrutturaPrivata({
            nome,
            categoria,
            indirizzo,
            geolocalizzazione,
            proprietario: proprietarioId
        });

        //save() triggera tutti i validatori dello schema (Mongoose)
        //gli errori finiscono nel catch come ValidationError
        await nuovaStruttura.save();

        
        await Proprietario.findByIdAndUpdate(
            proprietarioId,
            { $push: { strutture: nuovaStruttura._id } }
        );

        console.log(`Nuova struttura registrata: ${nuovaStruttura._id} (proprietario: ${proprietarioId})`);

        //201 Created + header Location
        //il client può usare l'URI per GET successivi senza dover parsare il body
        return res
            .status(201)
            .location(`/api/v1/structures/${nuovaStruttura._id}`)
            .json({
                message: 'Struttura registrata con successo',
                struttura: sanitizeStruttura(nuovaStruttura)
            });

    } catch (err) {
        console.error('[POST /structures]', err);

        //errori di validazione Mongoose (es. categoria non ammessa, coordinate fuori range)
        if (err.name === 'ValidationError') {
            const details = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ error: 'Validazione fallita', details });
        }

        //CastError: ObjectId malformato o tipo incompatibile (es. number atteso, ricevuto stringa)
        if (err.name === 'CastError') {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: err.path, message: 'tipo non valido' }]
            });
        }

        return res.status(500).json({ error: 'Errore interno del server' });
    }
};


const CATEGORIE_AMMESSE = [
    'ristorante', 'bar', 'negozio', 'ufficio',
    'hotel', 'studio_medico', 'palestra', 'altro'
];
const HEX24 = /^[a-fA-F0-9]{24}$/;
 
//GET /api/v1/structures
exports.getStructures = async (req, res) =>{
    try {
        const {bbox, categoria, proprietario} = req.query;
        const filter = {};
 
        //filtro bbox
        if (bbox) {
            const parts = bbox.split(',').map(parseFloat);
            if (parts.length !== 4 || parts.some(Number.isNaN)){
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'bbox', message: 'formato atteso: minLng,minLat,maxLng,maxLat' }]
                });
            }
            const [minLng, minLat, maxLng, maxLat] = parts;
 

            //check range coordinate valide
            if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'bbox', message: 'coordinate fuori range' }]
                });
            }

            //check min < max
            if (minLng >= maxLng || minLat >= maxLat) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'bbox', message: 'minLng deve essere < maxLng e minLat < maxLat' }]
                });
            }
 
            //sfrutta l'indice 2dsphere su geolocalizzazione
            filter.geolocalizzazione = {
                $geoWithin: { $box: [[minLng, minLat], [maxLng, maxLat]] }
            };
        }
 
        
        //filtro categoria
        if (categoria) {
            if (!CATEGORIE_AMMESSE.includes(categoria)) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{
                        field: 'categoria',
                        message: `valore non ammesso. Ammessi: ${CATEGORIE_AMMESSE.join(', ')}`
                    }]
                });
            }
            filter.categoria = categoria;
        }
 
        //filtro proprietario
        //flag che decide se includere il campo proprietario nella risposta
        //true solo se è il proprietario a richiedere la lista delle sue strutture
        let includeOwnerField = false;
 
        if (proprietario) {
            //validazione formato
            if (!HEX24.test(proprietario)) {
                return res.status(400).json({
                    error: 'Validazione fallita',
                    details: [{ field: 'proprietario', message: 'ObjectId non valido' }]
                });
            }
            //autorizzazione: solo se l'id coincide con quello del JWT
            if (proprietario !== req.loggedUser.userId) {
                return res.status(403).json({
                    error: 'Accesso negato. Puoi filtrare solo per il tuo id.'
                });
            }
            filter.proprietario = proprietario;
            includeOwnerField = true;
        }
 
        //esecuzione query
        //la projection esclude __v sempre, e proprietario quando non legittimato
        const projection = includeOwnerField
            ? '-__v'
            : '-__v -proprietario';
 
        const strutture = await StrutturaPrivata
            .find(filter)
            .select(projection)
            .sort({ createdAt: -1 })
            .lean();
 
        return res.status(200).json({
            count: strutture.length,
            strutture
        });
 
    } catch (err) {
        console.error('[GET /structures]', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

//GET /api/v1/structures/:id
exports.getStructureById = async (req, res) => {
    try {
        const { id } = req.params;

        //valido il formato PRIMA della query
        if (!HEX24.test(id)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'id', message: 'ObjectId non valido' }]
            });
        }

        const struttura = await StrutturaPrivata.findById(id);
        if (!struttura) {
            return res.status(404).json({ error: 'Struttura non trovata' });
        }

        //mostro proprietario solo se è lui stesso a chiedere altrimenti lo nascondo
        const obj = sanitizeStruttura(struttura);
        if (struttura.proprietario.toString() !== req.loggedUser.userId) {
            delete obj.proprietario;
        }

        return res.status(200).json({ struttura: obj });

    } catch (err) {
        console.error('[GET /structures/:id]', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};


//campi di accessibilità ammessi nel body 
const CAMPI_ACCESSIBILITA = [
    'rampa', 'ascensore', 'bagnoAccessibile',
    'ingressoSenzaGradini', 'parcheggioRiservato'
];

//PATCH /api/v1/structures/:id/accessibilita
exports.updateAccessibilita = async (req, res) =>{
    try {
        const { id } = req.params;
        const body = req.body || {};

        if (!HEX24.test(id)) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'id', message: 'ObjectId non valido' }]
            });
        }

        //tengo solo i campi in whitelist tutto il resto  viene scartato
        const details = [];
        const campiDaApplicare = {};
        for (const campo of CAMPI_ACCESSIBILITA) {

            if (Object.prototype.hasOwnProperty.call(body, campo)){
                if (typeof body[campo] !== 'boolean') {
                    details.push({ field: campo, message: 'deve essere un valore booleano' });
                } else {
                    campiDaApplicare[campo] = body[campo];
                }
            }
        }

        if (details.length > 0){
            return res.status(400).json({ error: 'Validazione fallita', details });
        }

        //almeno un campo valido deve essere presente
        if (Object.keys(campiDaApplicare).length === 0) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'body', message: 'nessun campo di accessibilità valido presente' }]
            });
        }


        const struttura = await StrutturaPrivata.findById(id);
        if (!struttura) {
            return res.status(404).json({ error: 'Struttura non trovata' });
        }


        //qui si verifica che sia il proprietario di questa struttura
        if (struttura.proprietario.toString() !== req.loggedUser.userId) {
            return res.status(403).json({
                error: 'Accesso negato. Puoi modificare solo le tue strutture.'
            });
        }

        //applico solo i campi passati; quelli non presenti restano invariati
        for (const campo of Object.keys(campiDaApplicare)) {
            struttura.accessibilita[campo] = campiDaApplicare[campo];
        }

        //save() triggera l'hook pre('save') che ricalcola 'accessibile'
        await struttura.save();

        console.log(`Accessibilità aggiornata: ${struttura._id} -> accessibile=${struttura.accessibile}`);

        return res.status(200).json({
            message: 'Accessibilità aggiornata con successo',
            struttura: sanitizeStruttura(struttura)
        });

    } catch (err) {
        
        console.error('[PATCH /structures/:id/accessibilita]', err);
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
