const Cittadino = require('../models/Cittadino');
const Proprietario = require('../models/Proprietario');
const User = require('../models/User');


//funzione per ritornare un oggetto user senza i campi strettamente necessari (password, __v, notifiche)
function sanitizeUser(userDoc) {
    const obj = userDoc.toObject();
    delete obj.password;
    delete obj.__v;
    delete obj.notifiche;
    return obj;
}

//gestore errori di validazione di Mongoose - centralizzato per evitare duplicazione
function handleError(err, res) {
    if (err.name === 'ValidationError') {
        const details = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        return res.status(400).json({
            error: 'Validazione fallita',
            details
        });
    }
    //gestione errore di duplicato (es. partitaIVA o email gia' presenti)
    // if (err.code === 11000) {
    //     const field = Object.keys(err.keyPattern)[0];
    //     return res.status(409).json({ error: `Valore per il campo "${field}" gia' esistente` });
    // }
    console.error(err);
    return res.status(500).json({ error: 'Errore interno del server' });
}

//REGISTRAZIONE CITTADINO - POST /api/v1/auth/register
exports.register = async (req, res) => {
    try {
        const existing = await User.findOne({email: req.body.email});
        if (existing) {
            return res.status(409).json({ error: 'Email già esistente' });
        }

        const {email, password, nome, cognome} = req.body;
        const userData = {
            email: email,
            password: password,
            nome: nome,
            cognome: cognome
        };

        const newCittadino = new Cittadino(userData);
        await newCittadino.save();

        console.log(`Nuovo cittadino registrato: ${email}`);

        const userResponse = sanitizeUser(newCittadino);

        return res
            .status(201)
            .location('/api/v1/users/' + newCittadino._id)
            .json({ message: 'Registrazione avvenuta con successo', user: userResponse });
    
    } catch (err) {
        return handleError(err, res);
    }
};

//REGISTRAZIONE PROPRIETARIO - POST /api/v1/auth/register/owner
exports.registerOwner = async (req, res) => {
    try {
        const existing = await User.findOne({email: req.body.email});
        if (existing) {
            return res.status(409).json({ error: 'Email già esistente' });
        }
        const existing1 = await User.findOne({partitaIVA: req.body.partitaIVA});
        if (existing1) {
            return res.status(409).json({ error: 'Partita IVA già esistente' });
        }
        
        //il proprietario richiede partitaIVA come campo specifico
        const {email, password, nome, cognome, partitaIVA} = req.body;
        const userData = {
            email: email,
            password: password,
            nome: nome,
            cognome: cognome,
            partitaIVA: partitaIVA
        };

        const newProprietario = new Proprietario(userData);
        await newProprietario.save();

        console.log(`Nuovo proprietario registrato: ${email}`);

        const userResponse = sanitizeUser(newProprietario);

        return res
            .status(201)
            .location('/api/v1/users/' + newProprietario._id)
            .json({ message: 'Registrazione avvenuta con successo', user: userResponse });
    
    } catch (err) {
        return handleError(err, res);
    }
};