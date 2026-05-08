const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    //ATTRIBUTI CLASSE UTENTE
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        trim: true 
    },
    password: { 
        type: String, 
        required: true, 
        minlength: 8 
    },
    nome: { type: String, required: true },
    cognome: { type: String, required: true },
    dataNascita: { type: Date },
    codiceFiscale: { type: String, uppercase: true },
    
    //Gestione Ruoli (Discriminatore)
    ruolo: { 
        type: String, 
        enum: ['cittadino', 'proprietario', 'operatore'], 
        default: 'cittadino' 
    },

    //ATTRIBUTI CLASSE CITTADINO
    profiloDisabilita: { 
        type: String, 
        enum: ['motoria', 'visiva', 'uditiva', 'nessuna'], 
        default: 'nessuna' 
    },
    telefono: { type: String },
    
    //liste di riferimento (ID che puntano ad altre collezioni)
    segnalazioniInviate: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Segnalazione' 
    }],
    itinerariSalvati: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Percorso' 
    }],
    notifiche: [{
        messaggio: String,
        letta: { type: Boolean, default: false },
        data: { type: Date, default: Date.now }
    }]

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);