const mongoose = require('mongoose');
const User = require('./User');

const proprietarioStrutturaSchema = new mongoose.Schema({
    // attributi classe proprietario (estende User)
    partitaIVA: {
        type: String,
        required: [true, 'campo partita IVA obbligatorio'],
        unique: true,
        trim: true,
        match: [/^\d{11}$/, 'formato partita IVA non valido'] // la partita IVA deve essere di 11 cifre
    },
    ragioneSociale: {
        type: String,
        required: [true, 'campo ragione sociale obbligatorio'],
    },
    strutture: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StrutturaPrivata'
    }]
});

module.exports = User.discriminator('proprietario', proprietarioStrutturaSchema);