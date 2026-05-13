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
const JWT_SECRET = process.env.JWT_SECRET;

if(!MONGO_URI){
    console.error("[FATAL] MONGO_URI non definito.");
    process.exit(1);
}

//boot check JWT_SECRET
if(!JWT_SECRET){
    console.error("[FATAL] JWT_SECRET non definito.");
    process.exit(1);
}

const app = express();
let server;

app.use(cors());
app.use(express.json());

//health check
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Urban Access API is running' });
});

//rotte pubbliche
app.use('/api/v1/auth', authRoutes);

//404 JSON per API non trovate (PRIMA del fallback SPA)
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint non trovato' });
});

//frontend SPA (fallback)
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/', 'index.html'));
});

//connessione DB e avvio
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to Database:', mongoose.connection.name);  //log nome DB per verifica
        server = app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    })
    .catch((err) => console.error('Errore di connessione:', err));

//graceful shutdown
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