const jwt = require('jsonwebtoken');

//middleware: validazione token JWT
const verifyToken = function(req, res, next) {
    let token;

    //cerca token nel body SOLO se req.body è stato parsato ed esiste
    if (req.body && req.body.token) {
        token = req.body.token;
    } 
    //altrimenti cerca nella query string SOLO se req.query esiste
    else if (req.query && req.query.token) {
        token = req.query.token;
    } 
    //altrimenti cerca nell'header x-access-token SOLO se req.headers esiste
    else if (req.headers && req.headers['x-access-token']) {
        token = req.headers['x-access-token'];
    }

    //supporto aggiuntivo per Authorization: Bearer <token>
    if (!token && req.headers && req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7); //slicer per Bearer
        }
    }

    //se alla fine di tutti i controlli non c'è nessun token, blocca la richiesta
    if (!token) {
        return res.status(401).json({ error: 'Token mancante' });
    }

    //verifica firma e scadenza
    jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token scaduto' });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Token non valido' });
            }
            return res.status(401).json({ error: 'Token non valido o scaduto' });
        }
        //token valido: payload disponibile per i route handler successivi
        req.loggedUser = decoded;
        next();
    });
};

//factory middleware: restrizione per ruolo 
const requireRole = function(...allowedRoles) {
    return function(req, res, next) {
        if (!req.loggedUser || !allowedRoles.includes(req.loggedUser.ruolo)) {
            return res.status(403).json({ 
                error: 'Accesso negato: ruolo non autorizzato' 
            });
        }
        next();
    };
};

module.exports = { verifyToken, requireRole };