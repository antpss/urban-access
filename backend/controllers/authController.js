const jwt = require('jsonwebtoken');
const Cittadino = require('../models/Cittadino');
const Proprietario = require('../models/Proprietario');
const User = require('../models/User');


// funzione per ritornare un oggetto user senza i campi strettamente necessari (password, __v, notifiche)
function sanitizeUser(userDoc) {
    const obj = userDoc.toObject();
    delete obj.password;
    delete obj.__v;
    delete obj.notifiche;
    return obj;
}

// handler errori condiviso per validazione
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

    console.error(err);
    return res.status(500).json({ error: 'Errore interno del server' });
}

// registra cittadino
// POST /api/v1/auth/register/citizen
exports.registerCitizen = async (req, res) => {
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

// registrazione proprietario
// POST /api/v1/auth/register/owner
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
        
        // il proprietario richiede partitaIVA come campo specifico
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

// login utente
// POST /api/v1/auth/login
exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;

        if(typeof email !== 'string' || typeof password !== 'string'){
            return res.status(400).json({ error: 'Email e password devono essere stringhe' });
        }

        if(!email || !password) {
            const details = [];
            if (!email) details.push({ field: 'email', message: 'campo email obbligatorio' });
            if (!password) details.push({ field: 'password', message: 'campo password obbligatorio' });
            return res.status(400).json({ error: 'Validazione fallita', details });
        }

        // cerca utente per email e includi password per il confronto
        const user = await User.findOne({email: email.toLowerCase().trim()}).select('+password');
        if (!user) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        // generazione token JWT
        const token = jwt.sign(
            {userId: user._id, ruolo: user.ruolo},
            process.env.JWT_SECRET,
            // scadenza token in 24H
            {expiresIn: 86400}
        );

        console.log(`Login effettuato: ${user.email} (${user.ruolo})`);
        return res.status(200).json({
            message: 'Login avvenuto con successo',
            token,
            user: sanitizeUser(user)
        });
    } catch (err) {
        return handleError(err, res);
    }
};
