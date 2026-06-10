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
    //punteggio accumulato tramite crowdsourcing (somma degli scoreAffidabilita dei validatori).
    //alla creazione viene impostato dal controller a 1 + scoreAffidabilita dell'autore.
    scoreAssociato: {
        type: Number,
        default: 1
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
    //definisce se la segnalazione viene mostrata sulla mappa (ormai derivabile da `stato`)
    visibile: {
        type: Boolean,
        default: false
    },
    motivazioneForzatura: {
        type: String,
        default: null,
        maxlength: 500
    },
    //true quando la penalità all'autore (ingresso in ARCHIVIATA da smentita) è già stata
    //applicata: garantisce idempotenza, la penalità scatta una sola volta nel ciclo di vita.
    penalitaApplicata: {
        type: Boolean,
        default: false
    }
});

//deriva lo stato di una segnalazione privata "viva" dal suo scoreAssociato.
//Restituisce lo stato calcolato; non applica side-effect (li gestisce il pre-validate).
function statoDaScore(scoreAssociato, sogliaValidazione) {
    if (scoreAssociato <= 0) return 'ARCHIVIATA';
    if (scoreAssociato >= sogliaValidazione) return 'APERTA';
    return 'IN_VERIFICA';
}
segnalazionePrivataSchema.statics.statoDaScore = statoDaScore;

segnalazionePrivataSchema.pre('validate', function() {
    //forzatura operatore: bypassa interamente la derivazione automatica.
    //lo score può cambiare ma lo stato resta quello imposto dall'operatore.
    if (this._forzaturaOperatore === true) {
        return;
    }

    //stati terminali / bloccati: non si ricalcola nulla, restano congelati e invisibili.
    if (this.stato === 'RISOLTA' || this.stato === 'ARCHIVIATA') {
        this.visibile = false;
        this.bloccaModifica = true;
        return;
    }

    
    const nuovoStato = statoDaScore(this.scoreAssociato, this.sogliaValidazione);
    this.stato = nuovoStato;

    //coerenza visibilità: visibile finché non terminale.
    if (nuovoStato === 'ARCHIVIATA') {
        this.visibile = false;
        this.bloccaModifica = true;
    } else {
        this.visibile = true;
    }
});

module.exports = Segnalazione.discriminator('privata', segnalazionePrivataSchema);
module.exports.categoriaPrivata = categoriaPrivata;