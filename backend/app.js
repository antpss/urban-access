require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

require('./models/User');
require('./models/Cittadino');
require('./models/Proprietario');
require('./models/Segnalazione');
require('./models/SegnalazionePubblica');
require('./models/SegnalazionePrivata');
require('./models/StrutturaPrivata');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const publicReportsRoutes = require('./routes/publicReports');
const privateReportsRoutes = require('./routes/privateReports');
const structuresRoutes = require('./routes/struttura');
const routingRoutes = require('./routes/routing');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Urban Access API is running' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/publicReports', publicReportsRoutes);
app.use('/api/v1/privateReports', privateReportsRoutes);
app.use('/api/v1/structures', structuresRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', routingRoutes);

// error handler multer (uguale a prima)
app.use('/api', (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const fieldMap = {
            LIMIT_FILE_SIZE: 'dimensione file superiore a 5MB',
            LIMIT_FILE_COUNT: 'massimo 5 foto per segnalazione',
            LIMIT_UNEXPECTED_FILE: 'formato file non supportato'
        };
        return res.status(400).json({
            error: 'Validazione fallita',
            details: [{
                field: err.field || 'foto',
                message: fieldMap[err.code] || err.message
            }]
        });
    }
    if (err && err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
            error: 'Validazione fallita',
            details: [{ field: 'foto', message: err.message }]
        });
    }
    if (!err) {
        return res.status(404).json({ error: 'Endpoint non trovato' });
    }
    return res.status(500).json({ error: 'Errore interno del server' });
});

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint non trovato' });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/', 'index.html'));
});

module.exports = app;