require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI) {
    console.error("MONGO_URI non definito in .env");
    process.exit(1);
}

if (!JWT_SECRET) {
    console.error("JWT_SECRET non definito in .env");
    process.exit(1);
}

let server;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to Database:', mongoose.connection.name);
        server = app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    })
    .catch((err) => console.error('Errore di connessione:', err));

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