const Cittadino = require('../models/Cittadino');
const User = require('../models/User');


// funzione per ritornare un oggetto user senza i campi strettamente necessari (password, __v, notifiche)
function sanitizeUser(userDoc) {
    const obj = userDoc.toObject();
    delete obj.password;
    delete obj.__v;
    delete obj.notifiche;
    return obj;
}

exports.register = async (req, res) => {
    try {
        const existing = await User.findOne({email: req.body.email});
        if (existing) {
            return res.status(409).json({ error: 'Email già esistente' });
        }

        const {email, password, nome, cognome, profiloDisabilita, posizione} = req.body;
        const userData = {
            email: email,
            password,
            nome: nome,
            cognome: cognome
        };
        if(profiloDisabilita) userData.profiloDisabilita = profiloDisabilita;
        if(posizione) userData.posizione = posizione;

        const newCittadino = new Cittadino(userData);
        await newCittadino.save();

        console.log(`Nuovo cittadino registrato: ${email}`);

        const userResponse = sanitizeUser(newCittadino);

        return res
            .status(201)
            .location('/api/v1/users/' + newCittadino._id)
            .json({ message: 'Registrazione avvenuta con successo', user: userResponse });
    
    } catch (err) {
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
    }
};