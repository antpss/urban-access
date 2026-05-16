const mongoose = require('mongoose');
const Segnalazione = require('./Segnalazione');

const segnalazionePrivataSchema = new mongoose.Schema({
    categoria: {
        type: String,
        required: [true, 'campo categoria obbligatorio'],
        enum: {
            values: [
                'mancanza_rampa',
                'bagno_non_accessibile',
                'ascensore_guasto',
                'spazi_interni_stretti',
                'altro'
            ],
            message: 'Categoria privata "{VALUE}" non ammessa'
        }
    },
    //objectId che punta alla struttura (aggregazione)
    strutturaAssociata: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StrutturaPrivata', 
        required: [true, 'strutturaAssociata è obbligatoria per una segnalazione privata']
    },
    //punteggio accumulato tramite crowdsourcing
    scoreAssociato: {
        type: Number,
        default: 0
    },
    //soglia minima per rendere visibile la segnalazione
    sogliaValidazione: {
        type: Number,
        default: 10     //default
    },
    //lista di chi ha supportato, per evitare voti doppi
    listaValidatori: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    //contatore per comportamenti anomali
    numAnomalie: {
        type: Number,
        default: 0
    },
    //soglia per l'allarme al comune
    sogliaAllarme: {
        type: Number,
        default: 5
    },
    //definisce se la segnalazione viene mostrata sulla mappa
    visibile: {
        type: Boolean,
        default: false
    }
});

segnalazionePrivataSchema.pre('validate', function() {
    //forza lo stato IN_VERIFICA se lo score non supera la soglia quando la segnalazione viene inserita
    if (this.isNew || this.scoreAssociato < this.sogliaValidazione) {
        if (this.stato === 'APERTA') {
            this.stato = 'IN_VERIFICA';
        }
    }

    //se è in IN_VERIFICA non deve essere visibile
    if (this.stato === 'IN_VERIFICA') {
        this.visibile = false;
    }

    //può essere APERTA solo se scoreAssociato >= sogliaValidazione
    if (this.stato === 'APERTA') {
        if (this.scoreAssociato < this.sogliaValidazione) {
            this.invalidate('stato', 'La segnalazione privata non può essere APERTA finché non raggiunge la soglia di validazione');
        } else {
            this.visibile = true; //diventa visibile
        }
    }
});

module.exports = Segnalazione.discriminator('privata', segnalazionePrivataSchema);