const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    // ATTRIBUTI CLASSE UTENTE (Superclasse)
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
    ruolo: { 
        type: String, 
        enum: ['cittadino', 'proprietario', 'operatore'], 
        default: 'cittadino' 
    },
    autenticato: { 
        type: Boolean, 
        default: false 
    },
    notifiche: [{
        messaggio: String,
        letta: { type: Boolean, default: false },
        data: { type: Date, default: Date.now }
    }],

    // ATTRIBUTI CLASSE CITTADINO (Sottoclasse)
    nome: { 
        type: String, 
        required: function() { return this.ruolo === 'cittadino'; } 
    },
    cognome: { 
        type: String, 
        required: function() { return this.ruolo === 'cittadino'; } 
    },
    scoreAffidabilita: { 
        type: Number, 
        default: 0.0 
    },
    posizione: {
        latitudine: { type: Number },
        longitudine: { type: Number }
    },
    profiloDisabilita: { 
        type: String, 
        enum: ['motoria', 'visiva', 'uditiva', 'nessuna'], 
        default: 'nessuna' 
    },
    storicoPercorsi: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Percorso' 
    }],
    storicoSegnalazioni: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Segnalazione' 
    }]

}, { timestamps: true });


// Middleware: Hashing della password prima del salvataggio
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

module.exports = mongoose.model('User', userSchema);