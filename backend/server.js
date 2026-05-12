require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('./models/User');
require('./models/Cittadino');
require('./models/Proprietario');

const authRoutes = require('./routes/auth');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if(!MONGO_URI){
    console.error("[FATAL] MONGO_URI non definito.");
    process.exit(1);
}

const app = express();
let server;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Urban Access API is running' });
});

// monta la route per la registrazione
app.use('/api/v1/auth', authRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/', 'index.html'));
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