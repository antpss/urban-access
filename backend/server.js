require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if(!MONGO_URI){
    console.error("[FATAL] MONGO_URI non definito. Assicurati di avere un file .env con la variabile MONGO_URI definita correttamente");
    process.exit(1);
}



const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to Database');
        server = app.listen(process.env.PORT || 3000, () => {
            console.log(`Server listening on port ${process.env.PORT || 3000}`);
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