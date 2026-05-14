const Cittadino = require('../models/Cittadino');
const { tipoDisabilita } = require('../models/Cittadino');


//rimuove campi sensibili/interni prima dell'invio al client
function sanitizeUser(userDoc) {
    const obj = userDoc.toObject();
    delete obj.password;
    delete obj.__v;
    delete obj.notifiche;
    return obj;
}

//whitelist dei campi modificabili via PATCH /users/me e relativi vincoli.
//per aggiungere un campo modificabile in futuro: AGGIUNGERE QUI ENTRY.
const CAMPI_MODIFICABILI = {
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

//PATCH /api/v1/users/me
exports.updateMe = async (req, res) => {
    try {
        const body = req.body || {};

        //si estraggono solo i campi presenti nella whitelist
        const campiPresentiNelBody = Object.keys(body).filter(
            k => Object.prototype.hasOwnProperty.call(CAMPI_MODIFICABILI, k)
        );

        //body senza nessun campo modificabile -> 400 (evita PATCH no-op)
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

        //scelta del modello in base al ruolo (per applicare il subschema)
        const Model = ruoloUtente === 'cittadino' ? Cittadino : null;
        if (!Model) {
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
        //seconda linea di difesa: validatori Mongoose
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