require('dotenv').config();
const mongoose = require('mongoose');

//importa i modelli: User PRIMA, poi il discriminator Operatore.
//l'import del discriminator registra il sotto-schema su Mongoose.
require('./models/User');
const Operatore = require('./models/Operatore');

//credenziali dell'operatore di test
const DATI_OPERATORE = {
    email: 'operatore1@comunetn.it',
    password: 'montecauriol', //in chiaro: la hasha l'hook pre('save')
    nome: 'Franco',
    cognome: 'Operatore',
    matricola: 'OP-001'
    //enteAppartenenza omesso: default 'Comune di Trento'
};

async function main() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/urbanaccess';
    await mongoose.connect(uri);
    console.log('Connesso a', uri);

    //evita duplicati se lo script viene rieseguito
    const esistente = await Operatore.findOne({ email: DATI_OPERATORE.email });
    if (esistente) {
        console.log('Operatore già presente:', esistente.email, '(_id:', esistente._id.toString() + ')');
        await mongoose.disconnect();
        return;
    }

    const operatore = new Operatore(DATI_OPERATORE);
    await operatore.save(); //hook che hasha la password

    console.log('Operatore creato con successo:');
    console.log('  _id:      ', operatore._id.toString());
    console.log('  email:    ', operatore.email);
    console.log('  ruolo:    ', operatore.ruolo);
    console.log('  matricola:', operatore.matricola);
    console.log('  ente:     ', operatore.enteAppartenenza);
    console.log('\nCredenziali di login: email =', DATI_OPERATORE.email, '| password =', DATI_OPERATORE.password);

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Errore nel seed:', err.message);
    process.exit(1);
});