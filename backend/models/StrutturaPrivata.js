const mongoose = require('mongoose');

const statoStruttura = ['attiva', 'dismessa'];

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
    }
}, {
    timestamps: true,
    collection: 'strutture'
});

strutturaPrivataSchema.index({ geolocalizzazione: '2dsphere' });

strutturaPrivataSchema.index({ proprietario: 1, stato: 1 });

module.exports = mongoose.model('StrutturaPrivata', strutturaPrivataSchema);
module.exports.categoriaStruttura = categoriaStruttura;