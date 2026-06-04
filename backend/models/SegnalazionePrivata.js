const mongoose = require('mongoose');
const Segnalazione = require('./Segnalazione');

const categoriaPrivata = [
    'mancanza_rampa',
    'bagno_non_accessibile',
    'ascensore_guasto',
    'spazi_interni_stretti',
    'altro'
];

const segnalazionePrivataSchema = new mongoose.Schema({
    categoria: {
        type: String,
        required: [true, 'campo categoria obbligatorio'],
        enum: {
            values: categoriaPrivata,
            message: 'Categoria privata "{VALUE}" non ammessa'
        }
    },
    //objectId che punta alla struttura (aggregazione)
    strutturaAssociata: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StrutturaPrivata',
        required: [true, 'strutturaAssociata è obbligatoria per una segnalazione privata']
    },
    //punteggio accumulato tramite crowdsourcing (somma degli scoreAffidabilita dei validatori)
    scoreAssociato: {
        type: Number,
        default: 0
    },
    //soglia minima per validare la segnalazione
    sogliaValidazione: {
        type: Number,
        default: 10
    },
    //lista di chi ha supportato (mantenuta per riferimento; l'anti-doppio-voto è su collection 'validazioni')
    listaValidatori: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    //contatore per comportamenti anomali (US future)
    numAnomalie: {
        type: Number,
        default: 0
    },
    sogliaAllarme: {
        type: Number,
        default: 5
    },
    //definisce se la segnalazione viene mostrata sulla mappa (derivabile da `stato`)
    visibile: {
        type: Boolean,
        default: false
    }
});

segnalazionePrivataSchema.pre('validate', function() {
    //alla creazione una segnalazione privata nasce SEMPRE IN_VERIFICA (non ancora validata dal crowd)
    if (this.isNew && (this.stato === 'APERTA' || this.stato == null)) {
        this.stato = 'IN_VERIFICA';
    }


    if (this.stato === 'IN_VERIFICA') {
        this.visibile = true;
    }

    //può essere APERTA (validata) solo se scoreAssociato >= sogliaValidazione
    if (this.stato === 'APERTA') {
        if (this.scoreAssociato < this.sogliaValidazione) {
            this.invalidate('stato', 'La segnalazione privata non può essere APERTA finché non raggiunge la soglia di validazione');
        } else {
            this.visibile = true;
        }
    }
});

module.exports = Segnalazione.discriminator('privata', segnalazionePrivataSchema);
module.exports.categoriaPrivata = categoriaPrivata;