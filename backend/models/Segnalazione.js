const mongoose = require('mongoose');

const statoSegnalazione = ['APERTA', 'IN_VERIFICA', 'PRESA_IN_CARICO', 'RISOLTA', 'ARCHIVIATA'];

//subschema GeoJSON Point
const pointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
    },
    coordinates: {
        type: [Number],
        required: [true, 'coordinate obbligatorie'],
        validate: {
            validator: function(arr) {
                return Array.isArray(arr) 
                    && arr.length === 2
                    && arr[0] >= -180 && arr[0] <= 180   //longitudine
                    && arr[1] >= -90  && arr[1] <= 90;   //latitudine
            },
            message: 'coordinate non valide: atteso [lng, lat] con lng∈[-180,180], lat∈[-90,90]'
        }
    }
}, { _id: false });

const segnalazioneSchema = new mongoose.Schema({
    geolocalizzazione: {
        type: pointSchema,
        required: [true, 'campo geolocalizzazione obbligatorio']
    },
    descrizione: {
        type: String,
        required: [true, 'campo descrizione obbligatorio'],
        trim: true,
        minlength: [10, 'descrizione troppo breve (min 10 caratteri)'],
        maxlength: [1000, 'descrizione troppo lunga (max 1000 caratteri)']
    },
    categoria: {
        type: String,
        required: [true, 'campo categoria obbligatorio']
    },
    foto: {
        //array di path relativi (es. "/uploads/segnalazioni/abc123.jpg")
        type: [String],
        default: [],
        validate: {
            validator: (arr) => arr.length <= 5,
            message: 'massimo 5 foto per segnalazione'
        }
    },
    stato: {
        type: String,
        enum: statoSegnalazione,
        default: 'APERTA'
    },
    autore: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'autore obbligatorio']
    },
    bloccaModifica: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    discriminatorKey: 'tipo',               //pubblica - privata
    collection: 'reports'
});

//INDICE 2DSPHERE: abilita query $near, $geoWithin, $geoIntersects
segnalazioneSchema.index({ geolocalizzazione: '2dsphere' });

//indice composto utile per query frequenti (es. "pubbliche aperte")
segnalazioneSchema.index({ tipo: 1, stato: 1 });

module.exports = mongoose.model('Segnalazione', segnalazioneSchema);
module.exports.statoSegnalazione = statoSegnalazione;