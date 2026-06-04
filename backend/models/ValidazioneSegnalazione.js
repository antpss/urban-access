const mongoose = require('mongoose');

const validazioneSegnalazioneSchema = new mongoose.Schema({
    segnalazione: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Segnalazione',                 
        required: [true, 'segnalazione obbligatoria']
    },
    validatore: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'validatore obbligatorio']
    },
    tipo: {
        type: String,
        enum: ['conferma'],              
        default: 'conferma'
    },
    // snapshot del peso del voto = scoreAffidabilita del validatore AL MOMENTO del voto
    pesoVoto: {
        type: Number,
        required: true,
        min: 0
    },
    haContribuitoAllaValidazione: {
        type: Boolean,
        default: false
    },
    puntiAssegnati: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true,
    collection: 'validazioni'
});

//un solo voto per coppia (validatore, segnalazione). Unico a livello DB -> atomicità delegata a MongoDB.
//due voti concorrenti dello stesso utente => E11000 duplicate key, intercettato come 409.
validazioneSegnalazioneSchema.index({ validatore: 1, segnalazione: 1 }, { unique: true });

// indice per contare/elencare velocemente i validatori di una segnalazione
validazioneSegnalazioneSchema.index({ segnalazione: 1 });

module.exports = mongoose.model('ValidazioneSegnalazione', validazioneSegnalazioneSchema);