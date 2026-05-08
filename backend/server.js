require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// DEBUG: Vediamo se carica la stringa (cancella questo log dopo il test!)
console.log("URI caricato:", process.env.MONGO_URI); 

const dbURI = process.env.MONGO_URI;

if (!dbURI) {
    console.error("ERRORE: La variabile MONGO_URI non è definita nel file .env!");
    process.exit(1); // Ferma il server se non c'è l'URI
}

mongoose.connect(dbURI)
  .then(() => console.log('Connesso al database online di MongoDB!'))
  .catch((err) => console.error('Errore di connessione:', err));