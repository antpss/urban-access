
const mongoose = require('mongoose');
const Segnalazione = require('./Segnalazione');

const segnalazionePubblicaSchema = new mongoose.Schema({
    //attributi specifici
    enteCompetente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',     //DA CAMBIARE IN OPERATORECOMUNE QUANDO SI MODELLERÀ
        default: null    //null finché non viene assegnato un operatore
    }
});


segnalazionePubblicaSchema.pre('validate', function(next) {
    if (this.stato === 'IN_VERIFICA') {
        return next(new Error('una SegnalazionePubblica non può essere in stato IN_VERIFICA'));
    }
    next();
});

module.exports = Segnalazione.discriminator('pubblica', segnalazionePubblicaSchema);