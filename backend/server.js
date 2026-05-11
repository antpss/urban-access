require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User'); // qui importa il modello User.js

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if(!MONGO_URI){
    console.error("[FATAL] MONGO_URI non definito.");
    process.exit(1);
}

const app = express();
let server; // <--- Dichiarazione corretta (con gemini, verificare con claude eventualmente)

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Urban Access API is running' });
});

// ROTTA REGISTRAZIONE (US1) 
app.post('/api/v1/auth/register', async (req, res) => {
    try {
        const { email, password, nome, cognome } = req.body;

        // 1. Controllo se l'utente esiste già
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Mail già esistente' });
        }

        // 2. Creazione utente (l'hashing avviene nel middleware di User.js)
        const newUser = new User({ email, password, nome, cognome });
        await newUser.save();

        console.log(`[DB] Nuovo utente registrato: ${email}`);
        res.status(201).json({ message: 'Registrazione completata con successo!' });

    } catch (error) {
        console.error('[ERROR]', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
});

// Connessione DB e avvio
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to Database');
        server = app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    })
    .catch((err) => console.error('Errore di connessione:', err));

// Graceful shutdown 
const shutdown = async (signal) => {
    console.log(`\n[SHUTDOWN] Ricevuto ${signal}, chiusura in corso...`);
    if (server) {
        server.close(async () => {
            await mongoose.connection.close();
            console.log('[SHUTDOWN] Connessione DB chiusa.');
            process.exit(0);
        });
    } else {
        await mongoose.connection.close();
        process.exit(0);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));