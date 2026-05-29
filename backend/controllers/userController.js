const User = require('../models/User');
const Cittadino = require('../models/Cittadino');
const Proprietario = require('../models/Proprietario');
const Operatore = require('../models/Operatore');
const { tipoDisabilita } = require('../models/Cittadino');


//rimuove campi sensibili/interni prima dell'invio al client
function sanitizeUser(userDoc) {
    const obj = userDoc.toObject();
    delete obj.password;
    delete obj.__v;
    delete obj.notifiche;
    return obj;
}

//mappa ruolo -> Model (discriminator). findByIdAndUpdate sul modello specifico applica i validator del subschema oltre a quelli di User.
const MODEL_BY_RUOLO = {
    cittadino: Cittadino,
    proprietario: Proprietario,
    operatore: Operatore
};

//validatore stringa non vuota (dopo trim), usato sia per nome che per cognome
function validateNonEmptyString(value) {
    if (typeof value !== 'string') return 'deve essere una stringa';
    if (value.trim().length === 0) return 'non può essere vuoto';
    return null;
}

//whitelist dei campi modificabili via PATCH /users/me e relativi vincoli.
//formato: { ruoliAmmessi: [...], validate: fn, transform?: fn }
const CAMPI_MODIFICABILI = {
    nome: {
        ruoliAmmessi: ['cittadino', 'proprietario', 'operatore'],
        validate: validateNonEmptyString,
        transform: (value) => value.trim()
    },
    cognome: {
        ruoliAmmessi: ['cittadino', 'proprietario', 'operatore'],
        validate: validateNonEmptyString,
        transform: (value) => value.trim()
    },
    profiloDisabilita: {
        ruoliAmmessi: ['cittadino'],
        validate: (value) => {
            if (!Array.isArray(value)) {
                return 'deve essere un array';
            }
            const invalid = value.filter(
                v => typeof v !== 'string' || !tipoDisabilita.includes(v)
            );
            if (invalid.length > 0) {
                return `valori non ammessi: ${invalid.join(', ')}`;
            }
            return null;
        },
        transform: (value) => [...new Set(value)]
    }
};


//GET /api/v1/users/me
exports.getMe = async (req, res) => {
    try {
        //findById sul modello base User
        const user = await User.findById(req.loggedUser.userId);

        if (!user) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        return res.status(200).json({
            user: sanitizeUser(user)
        });

    } catch (err) {
        console.error('[GET /users/me]', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};


//PATCH /api/v1/users/me
exports.updateMe = async (req, res) => {
    try {
        const body = req.body || {};

        //si estraggono solo i campi presenti nella whitelist
        const campiPresentiNelBody = Object.keys(body).filter(
            k => Object.prototype.hasOwnProperty.call(CAMPI_MODIFICABILI, k)
        );

        //body senza nessun campo modificabile
        if (campiPresentiNelBody.length === 0) {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'body', message: 'nessun campo modificabile presente' }]
            });
        }

        //check ruolo per ciascun campo
        const ruoloUtente = req.loggedUser.ruolo;
        for (const campo of campiPresentiNelBody) {
            const config = CAMPI_MODIFICABILI[campo];
            if (!config.ruoliAmmessi.includes(ruoloUtente)) {
                return res.status(403).json({
                    error: `Modifica del campo "${campo}" non permessa per il ruolo "${ruoloUtente}"`
                });
            }
        }

        //validazione per ciascun campo
        const details = [];
        const updatePayload = {};
        for (const campo of campiPresentiNelBody) {
            const config = CAMPI_MODIFICABILI[campo];
            const errorMsg = config.validate(body[campo]);
            if (errorMsg) {
                details.push({ field: campo, message: errorMsg });
            } else {
                updatePayload[campo] = config.transform
                    ? config.transform(body[campo])
                    : body[campo];
            }
        }

        if (details.length > 0) {
            return res.status(400).json({ error: 'Validazione fallita', details });
        }

        //scelta del modello discriminator in base al ruolo dell'utente loggato.
        //usare il Model specifico (non User base) garantisce che eventuali
        //validatori del subschema scattino tramite { runValidators: true }.
        const Model = MODEL_BY_RUOLO[ruoloUtente];
        if (!Model) {
            //caso difensivo: ruolo non mappato. Non dovrebbe mai accadere se il JWT contiene solo ruoli noti
            return res.status(403).json({ error: 'Ruolo non supportato per questa operazione' });
        }

        //update atomico
        const userAggiornato = await Model.findByIdAndUpdate(
            req.loggedUser.userId,
            updatePayload,
            { new: true, runValidators: true }
        );

        if (!userAggiornato) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        console.log(`Profilo aggiornato: ${userAggiornato.email} -> campi: [${campiPresentiNelBody.join(', ')}]`);

        return res.status(200).json({
            message: 'Profilo aggiornato con successo',
            user: sanitizeUser(userAggiornato)
        });

    } catch (err) {
        //validatori Mongoose
        if (err.name === 'ValidationError') {
            const details = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ error: 'Validazione fallita', details });
        }
        console.error('[PATCH /users/me]', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};