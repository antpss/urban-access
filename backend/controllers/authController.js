const jwt = require('jsonwebtoken');
const Cittadino = require('../models/Cittadino');
const Proprietario = require('../models/Proprietario');
const User = require('../models/User');


//rimuove campi sensibili/interni prima dell'invio al client
function sanitizeUser(userDoc) {
    const obj = userDoc.toObject();
    delete obj.password;
    delete obj.__v;
    delete obj.notifiche;
    return obj;
}

//genera un JWT con payload minimo (userId + ruolo), scadenza 2h
function generaToken(user) {
    return jwt.sign(
        { userId: user._id, ruolo: user.ruolo },
        process.env.JWT_SECRET,
        { expiresIn: 7200 }
    );
}

//handler errori condiviso
function handleError(err, res) {
    if (err.name === 'ValidationError') {
        const details = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        return res.status(400).json({ error: 'Validazione fallita', details });
    }
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({ error: `"${field}" già esistente` });
    }
    console.error(err);
    return res.status(500).json({ error: 'Errore interno del server' });
}

// POST /api/v1/auth/register/citizen
exports.registerCitizen = async (req, res) => {
    try {
        const { email, password, nome, cognome } = req.body;
        const userData = { email, password, nome, cognome };

        const newCittadino = new Cittadino(userData);
        await newCittadino.save();

        console.log(`Nuovo cittadino registrato: ${email}`);

        const token = generaToken(newCittadino);
        const userResponse = sanitizeUser(newCittadino);

        return res
            .status(201)
            .location('/api/v1/users/' + newCittadino._id)
            .json({
                message: 'Registrazione avvenuta con successo',
                token,
                user: userResponse
            });

    } catch (err) {
        return handleError(err, res);
    }
};

// POST /api/v1/auth/register/owner
exports.registerOwner = async (req, res) => {
    try {
        const { email, password, nome, cognome, partitaIVA } = req.body;
        const userData = { email, password, nome, cognome, partitaIVA };

        const newProprietario = new Proprietario(userData);
        await newProprietario.save();

        console.log(`Nuovo proprietario registrato: ${email}`);

        const token = generaToken(newProprietario);
        const userResponse = sanitizeUser(newProprietario);

        return res
            .status(201)
            .location('/api/v1/users/' + newProprietario._id)
            .json({
                message: 'Registrazione avvenuta con successo',
                token,
                user: userResponse
            });

    } catch (err) {
        return handleError(err, res);
    }
};

// POST /api/v1/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        //check presenza (PRIMA del check tipo, per messaggi più utili)
        if (!email || !password) {
            const details = [];
            if (!email) details.push({ field: 'email', message: 'campo email obbligatorio' });
            if (!password) details.push({ field: 'password', message: 'campo password obbligatorio' });
            return res.status(400).json({ error: 'Validazione fallita', details });
        }

        //check tipo
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Email e password devono essere stringhe' });
        }

        //lookup con select esplicito della password
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
        if (!user) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const token = generaToken(user);

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