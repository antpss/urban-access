const jwt = require('jsonwebtoken');

//middleware: validazione token JWT
const verifyToken = function(req, res, next) {
    //estrazione token: body | query | header x-access-token | header Authorization: Bearer
    let token = req.body.token 
             || req.query.token 
             || req.headers['x-access-token'];

    //supporto aggiuntivo per Authorization: Bearer <token>
    if (!token && req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided.' });
    }

    //verifica firma e scadenza
    jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token not valid' });
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
                success: false, 
                message: 'Accesso negato: ruolo non autorizzato' 
            });
        }
        next();
    };
};

module.exports = { verifyToken, requireRole };