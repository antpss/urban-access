const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'reports');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

//whitelist di estenzioni
const ESTENSIONI_AMMESSE = {'image/jpeg': '.jpg', 'image/png':  '.png', 'image/webp': '.webp'};


const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOAD_DIR),
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
        }
    }),
    fileFilter: (req, file, cb) => {
        //check estensione
        if (!ESTENSIONI_AMMESSE[file.mimetype]) {
            return cb(new Error(`Estensione "${file.mimetype}" non ammessa`), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024, files: 5 }
});

//converte qualsiasi errore multer in 400 JSON coerente
const uploadFotoSegnalazione = (req, res, next) => {
    upload.array('foto', 5)(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                error: 'Upload fallito, controlla i vincoli su immagini',
                details: [{ field: 'foto', message: err.message }]
            });
        }
        next();
    });
};

module.exports = { uploadFotoSegnalazione, UPLOAD_DIR };