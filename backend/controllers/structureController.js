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
