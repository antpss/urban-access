const mongoose = require('mongoose');
const User = require('./User');

const operatoreSchema = new mongoose.Schema({
    // attributi classe operatore (estende User)
    matricola: {
        type: String,
        required: [true, 'campo matricola obbligatorio'],
        unique: true,
        trim: true
    },
    enteAppertenenza: {
        type: String,
        required: [true, 'campo ente di appartenenza obbligatorio'],
        default: 'Comune di Trento'
    }
});

module.exports = User.discriminator('Operatore', operatoreSchema);