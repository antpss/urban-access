const mongoose = require('mongoose');


const categoriaStruttura = [
    'ristorante',
    'bar',
    'negozio',
    'ufficio',
    'hotel',
    'studio_medico',
    'palestra',
    'altro'
];


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
                    && arr[0] >= -180 && arr[0] <= 180
                    && arr[1] >= -90  && arr[1] <= 90;
            },

            message: 'coordinate fuori range consentito'
        }
    }
}, { _id: false });//specifichiamo che non serve l'id perchè questo schema è dentro strutturaPrivata che ha un id


const accessibilitaSchema = new mongoose.Schema({
    rampa:                { type: Boolean, default: false },
    ascensore:            { type: Boolean, default: false },
    bagnoAccessibile:     { type: Boolean, default: false },
    ingressoSenzaGradini: { type: Boolean, default: false },
    parcheggioRiservato:  { type: Boolean, default: false }
}, { _id: false });


const strutturaPrivataSchema = new mongoose.Schema({

    nome: {
        type: String,
        required: [true, 'campo nome obbligatorio'],
        trim: true,
        minlength: [2, 'nome troppo breve (min 2 caratteri)'],
        maxlength: [100, 'nome troppo lungo (max 100 caratteri)']
    },
    categoria: {
        type: String,
        required: [true, 'campo categoria obbligatorio'],
        enum: {
            values: categoriaStruttura,
            message: 'categoria "{VALUE}" non ammessa'
        }
    },
    indirizzo: {
        type: String,
        required: [true, 'campo indirizzo obbligatorio'],
        trim: true,
        minlength: [5, 'indirizzo troppo breve'],
        maxlength: [200, 'indirizzo troppo lungo']
    },
    geolocalizzazione: {
        type: pointSchema,
        required: [true, 'campo geolocalizzazione obbligatorio']
    },
    proprietario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'proprietario obbligatorio']
    },
    numForzature: {
        type: Number,
        default: 0,
        min: 0
    },
    accessibilita: {
        type: accessibilitaSchema,
        default: () => ({})    //genera il sottodoc con tutti i default false
    },
    accessibile: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'strutture'
});

strutturaPrivataSchema.index({ geolocalizzazione: '2dsphere' });
const SOGLIA_BADGE = 3;

strutturaPrivataSchema.pre('save', function() {
    const a = this.accessibilita || {};
    const numTrue = [
        a.rampa, a.ascensore, a.bagnoAccessibile,
        a.ingressoSenzaGradini, a.parcheggioRiservato
    ].filter(Boolean).length;
    this.accessibile = numTrue >= SOGLIA_BADGE;
});

module.exports = mongoose.model('StrutturaPrivata', strutturaPrivataSchema);
module.exports.categoriaStruttura = categoriaStruttura;