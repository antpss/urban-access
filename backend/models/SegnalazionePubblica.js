const mongoose = require('mongoose');
const Segnalazione = require('./Segnalazione');

const segnalazionePubblicaSchema = new mongoose.Schema({
    categoria: {
        type: String,
        required: [true, 'campo categoria obbligatorio'],
        enum: {
            values: [
                'marciapiede_rotto',
                'ostacolo_temporaneo',
                'auto_sosta_vietata',
                'scalino_non_segnalato',
                'pavimentazione_dissestata',
                'semaforo_non_accessibile',
                'altro'
            ],
            message: 'Categoria pubblica "{VALUE}" non ammessa'
        }
    },
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