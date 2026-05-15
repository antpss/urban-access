const mongoose = require('mongoose');
const Segnalazione = require('./Segnalazione');

const segnalazionePubblicaSchema = new mongoose.Schema({
    // attributi specifici
    enteCompetente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',     // DA CAMBIARE IN OPERATORECOMUNE QUANDO SI MODELLERÀ
        default: null    // null finché non viene assegnato un operatore
    }
});

segnalazionePubblicaSchema.pre('validate', function() {
    if (this.stato === 'IN_VERIFICA') {
        throw new Error('Una Segnalazione Pubblica non può mai trovarsi in stato IN_VERIFICA');
    }
});

module.exports = Segnalazione.discriminator('pubblica', segnalazionePubblicaSchema);