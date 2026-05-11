const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    // attributi classe utente (superclasse)
    email: { 
        type: String, 
        required: [true, 'campo email obbligatorio'],
        unique: [true, 'email già esistente'], 
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'formato email non valido'] 
    },
    password: { 
        type: String, 
        required: true, 
        minlength: [8, 'lunghezza minima password 8 caratteri'] 
    },
    notifiche: [{
        messaggio: String,
        letta: { type: Boolean, default: false },
        data: { type: Date, default: Date.now }
    }],
    nome: { 
        type: String, 
        required: [true, 'campo nome obbligatorio'] 
    },
    cognome: { 
        type: String, 
        required: [true, 'campo cognome obbligatorio'] 
    },
}, {timestamps: true, discriminatorKey: 'ruolo', collection: 'users'});


// Middleware: Hashing della password prima del salvataggio
userSchema.pre('save', async function() {
    // Se la password non è stata modificata, esci (non serve next())
    if (!this.isModified('password')) return;

    // Hashing della password
    this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model('User', userSchema);