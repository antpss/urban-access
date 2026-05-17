# UrbanAccess

> Sistema di mappatura collaborativa dell'accessibilità urbana basato su crowdsourcing.

UrbanAccess è una web application sviluppata nell'ambito del corso di **Ingegneria del Software** (A.A. 2025/2026, Università di Trento) che permette ai cittadini di mappare in tempo reale le barriere architettoniche presenti sul territorio urbano. Il sistema supera i limiti delle mappe statiche tradizionali integrando segnalazioni dinamiche, profili di disabilità personalizzati e meccanismi di validazione comunitaria basati su uno score di affidabilità.

---

## Indice

- [Obiettivi](#obiettivi)
- [Attori del sistema](#attori-del-sistema)
- [Stack tecnologico](#stack-tecnologico)
- [Architettura](#architettura)
- [Funzionalità principali](#funzionalità-principali)
- [Struttura del repository](#struttura-del-repository)
- [Setup e avvio](#setup-e-avvio)
- [Documentazione API](#documentazione-api)
- [Team](#team)

---

## Obiettivi

Il progetto si propone di:

- **Mappare dinamicamente l'accessibilità urbana** tramite segnalazioni in tempo reale.
- **Fornire percorsi personalizzati** in base al profilo di disabilità dell'utente (motoria, visiva, uditiva, ausilio di deambulazione).
- **Incentivare la partecipazione civica** attraverso logiche di crowdsourcing.
- **Facilitare l'interazione tra stakeholder** (Cittadini, Proprietari di Strutture, Comune).
- **Garantire l'affidabilità delle segnalazioni** tramite un sistema a punteggio e una soglia di validazione aggregata.

## Attori del sistema

Il sistema distingue quattro tipologie di attori:

| Attore | Descrizione |
|---|---|
| **Cittadino** | Utente registrato con profilo di disabilità. Può inserire segnalazioni e validare quelle altrui. |
| **Proprietario di Struttura** | Gestisce le segnalazioni relative alle proprie strutture private (negozi, ristoranti, hotel, ecc.). |
| **Operatore del Comune** | Prende in carico le segnalazioni su suolo pubblico e monitora le anomalie ricorrenti. |

## Stack tecnologico

Il progetto è implementato sul seguente stack:

- **MongoDB** (con Mongoose) come database NoSQL document-based, sfruttando l'indice `2dsphere` per le query geospaziali.
- **Express.js** come framework backend per esporre le API RESTful in formato JSON.
- **Vue.js** come framework frontend SPA, in comunicazione esclusiva via AJAX/Fetch.
- **Node.js** come runtime JavaScript.

Tecnologie e librerie di supporto: **JWT** (autenticazione stateless), **bcrypt** (hashing password), **Multer** (upload multipart per le foto delle segnalazioni), **OpenAPI 3.0** (specifica delle API), **Apiary** e **SwaggerUI** (visualizzazione e testing della documentazione).

## Architettura

Il sistema segue un'architettura **client-server stateless** con separazione netta tra backend e frontend:

- Il backend espone API RESTful versionate sotto il prefisso `/api/v1/`.
- L'autenticazione è gestita tramite **JWT** trasmessi nell'header `Authorization: Bearer <token>`.
- Le password sono hashate con **bcrypt** (12 salt rounds) prima del salvataggio sul DB.
- Le risorse principali (`Segnalazione`, `User`) sfruttano il pattern **Discriminator** di Mongoose per modellare gerarchie di classi (pubblica/privata, cittadino/proprietario/operatore).
- Il frontend è una **SPA Vue** che consuma le API senza server-side rendering.

## Funzionalità principali

Le funzionalità implementate o in roadmap coprono:

- **Registrazione e login** differenziati per cittadini e proprietari di strutture.
- **Profilo di disabilità** configurabile dal cittadino per personalizzare la visualizzazione della mappa.
- **Segnalazioni pubbliche** (su suolo pubblico) gestite direttamente dal Comune.
- **Segnalazioni private** (su strutture) soggette a un processo di validazione comunitario: una segnalazione diventa visibile solo al raggiungimento di una soglia di score aggregato.
- **Visualizzazione su mappa** con filtri per stato, tipo, categoria e area geografica (bounding box).
- **Upload di foto** a corredo delle segnalazioni, con vincoli su formato e dimensione.
- **Gestione delle anomalie ricorrenti** e notifiche al Comune al superamento di soglie di allarme.

## Struttura del repository

```
urban-access/
│
├── backend/                          # API Express + Mongoose
│   ├── controllers/                  # Logica di business per ogni risorsa
│   │   ├── authController.js
│   │   ├── reportController.js
│   │   └── userController.js
│   │
│   ├── middlewares/                  # Middleware riusabili
│   │   ├── authJwt.js                # Verifica token JWT e ruoli
│   │   └── photoUploader.js          # Upload multipart via Multer
│   │
│   ├── models/                       # Schemi Mongoose
│   │   ├── Cittadino.js              # Discriminator di User
│   │   ├── Operatore.js              # Discriminator di User
│   │   ├── Proprietario.js           # Discriminator di User
│   │   ├── Segnalazione.js           # Superclasse segnalazione
│   │   ├── SegnalazionePrivata.js    # Discriminator di Segnalazione
│   │   ├── SegnalazionePubblica.js   # Discriminator di Segnalazione
│   │   ├── StrutturaPrivata.js
│   │   └── User.js                   # Superclasse utente
│   │
│   ├── node_modules/
│   │
│   ├── routes/                       # Definizione degli endpoint
│   │   ├── auth.js
│   │   ├── reports.js
│   │   └── users.js
│   │
│   ├── uploads/reports/              # Storage locale delle foto caricate
│   │
│   ├── .env                          # Variabili d'ambiente (non versionato)
│   ├── package-lock.json
│   ├── package.json
│   └── server.js                     # Entry point dell'applicazione
│
├── docs/                             # Documentazione di progetto
│   └── oa3.yaml                      # Specifica OpenAPI 3.0
│
├── frontend/                         # SPA Vue.js
│   ├── node_modules/
│   │
│   ├── src/
│   │   ├── assets/
│   │   │   └── style.css
│   │   │
│   │   ├── router/                   # Vue Router
│   │   │   └── index.js
│   │   │
│   │   ├── services/                 # Client API
│   │   │   └── auth.js
│   │   │
│   │   ├── views/                    # Pagine dell'applicazione
│   │   │   ├── FormSegnalazione.vue
│   │   │   ├── FormSegnalazionePrivata.vue
│   │   │   ├── Home.vue
│   │   │   ├── LoginView.vue
│   │   │   ├── Mappa.vue
│   │   │   ├── RegisterView.vue
│   │   │   └── SelectDisability.vue
│   │   │
│   │   ├── App.vue
│   │   └── main.js
│   │
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   └── tailwind.config.js
│
├── .gitignore
├── package-lock.json
└── README.md
```

## Setup e avvio

### Prerequisiti

- Node.js (versione LTS)
- MongoDB attivo localmente oppure URI a un cluster MongoDB Atlas
- npm

### Variabili d'ambiente

Creare un file `.env` nella cartella `backend/` con le seguenti chiavi:

```env
PORT=8000
MONGO_URI=<mongodb_server_url>
JWT_SECRET=<chiave_segreta_robusta>
```

### Installazione e avvio

```bash
# Backend
cd backend
npm install
npm start

# Frontend (in un'altra shell)
cd frontend
npm install
npm run dev
```

## Documentazione API

La specifica completa delle API è disponibile in formato **OpenAPI 3.0** nel file `docs/oa3.yaml` e visualizzabile tramite:

- **Apiary**: link al progetto disponibile nel report di Milestone.
- **SwaggerUI**: utilizzato in parallelo per il testing degli endpoint.

Tutti gli endpoint sono esposti sotto il prefisso `/api/v1/` e restituiscono risposte in formato JSON. Gli endpoint protetti richiedono un token JWT valido. Per l'implementazione degli endpoint si è adottata la metodologia RESTful e stateless.

## Team

Progetto sviluppato dal **Gruppo 17** del corso di Ingegneria del Software, Università di Trento, A.A. 2025/2026.

| Nome | Matricola |
|---|---|
| Andrea Boarini | 244129 |
| Antonio Possemato | 244262 |
| Giovanni Todesco | 244645 |

---

*Documento di riferimento: Deliverable D1 (Analisi dei Requisiti), Deliverable D2 (Diagramma Componenti, delle Classi e OCL), Report Milestone 3 (Sprint #1).*