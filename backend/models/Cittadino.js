const mongoose = require('mongoose');
const User = require('./User');

const tipoDisabilita = ['sediaARotelle', 'cecita', 'sordita', 'ausilioDeambulazione'];

const cittadinoSchema = new mongoose.Schema({
    // attributi classe cittadino (estende User)
    profiloDisabilita: {
        type: [{
            type: String,
            enum: tipoDisabilita
        }],
        default: []
    },
    scoreAffidabilita: {
        type: Number,
        default: 0,
        min: [0, 'lo score non può essere negativo'],
    },
    posizione: {
        latitudine: { type: Number, min: -90, max: 90 },
        longitudine: { type: Number, min: -180, max: 180 }
    },
    storicoPercorsi: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Percorso'
    }],
    storicoSegnalazioni: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Segnalazione'
    }],
});

module.exports = User.discriminator('cittadino', cittadinoSchema);
module.exports.tipoDisabilita = tipoDisabilita;