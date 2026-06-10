const User = require('../models/User');
const Cittadino = require('../models/Cittadino');
const Proprietario = require('../models/Proprietario');
const Operatore = require('../models/Operatore');
const { tipoDisabilita } = require('../models/Cittadino');

const StrutturaPrivata = require('../models/StrutturaPrivata');
const SegnalazionePubblica = require('../models/SegnalazionePubblica');
const SegnalazionePrivata = require('../models/SegnalazionePrivata');

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

// DELETE /api/v1/users/me
exports.deleteMe = async (req, res) => {
    try {
        const { password } = req.body || {};

        if (!password || typeof password !== 'string') {
            return res.status(400).json({
                error: 'Validazione fallita',
                details: [{ field: 'password', message: 'campo password obbligatorio' }]
            });
        }

        const userId = req.loggedUser.userId;
        const ruolo = req.loggedUser.ruolo;

        // fetch dell'utente con password per verifica re-auth
        const user = await User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        // verifica permessi di cancellazione (check della password)
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        // eliminazione dal database dei dati relativi all'utente
        // notare che prima vengono eliminate le dipendenze e poi l'utetnte stesso

        await SegnalazionePrivata.deleteMany({ autore: userId });

        // le segnalazioni pubbliche delle quali l'utente è autore vengono semplicemente anonimizzate
        // questo fa sì che rimangano comunque visibili al pubblico (possono essere d'aiuto comunque)
        await SegnalazionePubblica.updateMany(
            { autore: userId },
            { $set: { autore: null } }
        );

        await SegnalazionePrivata.updateMany(
            { listaValidatori: userId },
            { $pull: { listaValidatori: userId } }
        );

        if (ruolo === 'proprietario') {
            const strutture = await StrutturaPrivata
                .find({ proprietario: userId })
                .select('_id')
                .lean();
            const struttureIds = strutture.map(s => s._id);

            if (struttureIds.length > 0) {
                await SegnalazionePrivata.deleteMany({
                    strutturaAssociata: { $in: struttureIds }
                });
                await StrutturaPrivata.deleteMany({ proprietario: userId });
            }
        }

        await User.findByIdAndDelete(userId);

        console.log(`Account eliminato (GDPR): ${user.email} (${ruolo})`);

        return res.status(200).json({
            message: 'Account eliminato con successo'
        });

    } catch (err) {
        console.error('[DELETE /users/me]', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};