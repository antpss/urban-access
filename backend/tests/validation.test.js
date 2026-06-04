// Test suite US10
// POST /api/v1/privateReports/:id/validations

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../app');

const SegnalazionePrivata = require('../models/SegnalazionePrivata');
const ValidazioneSegnalazione = require('../models/ValidazioneSegnalazione');
const Cittadino = require('../models/Cittadino');
const User = require('../models/User'); //importato per essere sicuri

const CITIZEN_ID = '65a3f4e7b8d9c1f4a2e5b6c7';
const FAKE_REPORT_ID = '65b4f4e7b8d9c1f4a2e5b6a9';

const tokenCittadino = jwt.sign(
    { userId: CITIZEN_ID, ruolo: 'cittadino' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
);

describe('POST /api/v1/privateReports/:id/validations - US10 Conferma Segnalazione Privata', () => {

    let sessionMock;

    //chiusura connessioni residue mongoose
    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(() => {
        //mock della transazione Mongoose
        sessionMock = {
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            abortTransaction: jest.fn(),
            endSession: jest.fn()
        };
        jest.spyOn(mongoose, 'startSession').mockResolvedValue(sessionMock);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Helper universale per mockare le query Mongoose (supporta await diretto e .session)
    const mockQueryUniversal = (model, method, returnValue) => {
        jest.spyOn(model, method).mockImplementation(() => {
            const promise = Promise.resolve(returnValue);
            promise.session = jest.fn().mockReturnValue(promise);
            return promise;
        });
    };

    //helper per mockare findById().session(...)
    const mockFindByIdChained = (model, returnValue) => {
        const sessionFn = jest.fn().mockResolvedValue(returnValue);
        jest.spyOn(model, 'findById').mockReturnValue({ session: sessionFn });
        return sessionFn;
    };

    test('400: ObjectId della segnalazione non valido (non hex24)', async () => {
        const res = await request(app)
            .post('/api/v1/privateReports/id-sbagliato/validations')
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('id');
        expect(mongoose.startSession).not.toHaveBeenCalled();
    });

    test('404: Segnalazione privata non trovata', async () => {
        mockFindByIdChained(SegnalazionePrivata, null);

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/validations`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Segnalazione privata non trovata');
        expect(sessionMock.abortTransaction).toHaveBeenCalled();
    });

    test('409: Cittadino ha già validato questa segnalazione (E11000 Duplicate Key)', async () => {
        //mock segnalazione trovata con listaValidatori inizializzata
        const fakeReport = { 
            _id: FAKE_REPORT_ID, 
            stato: 'IN_VERIFICA',
            listaValidatori: []
        };
        mockFindByIdChained(SegnalazionePrivata, fakeReport);

        //mock utente trovato
        mockFindByIdChained(Cittadino, { _id: CITIZEN_ID, scoreAffidabilita: 5 });

        //mock di save e create per simulare duplicate key
        const duplicateErr = new Error('E11000 duplicate key');
        duplicateErr.code = 11000;
        jest.spyOn(ValidazioneSegnalazione.prototype, 'save').mockRejectedValue(duplicateErr);
        jest.spyOn(ValidazioneSegnalazione, 'create').mockRejectedValue(duplicateErr);

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/validations`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(409);
        expect(res.body.error).toContain('Hai già validato questa segnalazione');
        expect(sessionMock.abortTransaction).toHaveBeenCalled();
    });

    test('201: Voto registrato con successo ma SOGLIA NON RAGGIUNTA', async () => {
        const fakeReport = { 
            _id: FAKE_REPORT_ID, 
            stato: 'IN_VERIFICA', 
            scoreAssociato: 2, 
            sogliaValidazione: 10,
            listaValidatori: [], 
            save: jest.fn().mockResolvedValue(true)
        };
        mockFindByIdChained(SegnalazionePrivata, fakeReport);
        mockFindByIdChained(Cittadino, { _id: CITIZEN_ID, scoreAffidabilita: 3 });

        //mock creazione corretta
        jest.spyOn(ValidazioneSegnalazione.prototype, 'save').mockResolvedValue(true);
        jest.spyOn(ValidazioneSegnalazione, 'create').mockResolvedValue([{ _id: 'fake-val-id' }]);

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/validations`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(201);
        expect(res.body.statoSegnalazione).toBe('IN_VERIFICA');
        expect(res.body.message).toContain('Voto registrato');
        
        expect(sessionMock.commitTransaction).toHaveBeenCalled();
        expect(fakeReport.save).toHaveBeenCalled();
    });

    test('201: Voto registrato, SOGLIA RAGGIUNTA -> Segnalazione validata (APERTA) e punti distribuiti', async () => {
        const fakeReport = { 
            _id: FAKE_REPORT_ID, 
            stato: 'IN_VERIFICA', 
            scoreAssociato: 8, //con il peso del voto supererà 10
            sogliaValidazione: 10,
            listaValidatori: [], 
            save: jest.fn().mockResolvedValue(true)
        };
        
        mockFindByIdChained(SegnalazionePrivata, fakeReport);
        mockFindByIdChained(Cittadino, { _id: CITIZEN_ID, scoreAffidabilita: 5 }); // 8 + 5 = 13 (supera la soglia)

        jest.spyOn(ValidazioneSegnalazione.prototype, 'save').mockResolvedValue(true);
        jest.spyOn(ValidazioneSegnalazione, 'create').mockResolvedValue([{ _id: 'fake-val-id' }]);

        // Mock universali per le operazioni critiche (evitano il timeout di buffering)
        mockQueryUniversal(ValidazioneSegnalazione, 'find', [{ validatore: CITIZEN_ID, save: jest.fn() }]);
        mockQueryUniversal(ValidazioneSegnalazione, 'updateMany', { modifiedCount: 1 });
        
        // Mock per entrambi i modelli Utente (Cittadino o User generico)
        mockQueryUniversal(Cittadino, 'find', [{ _id: CITIZEN_ID, save: jest.fn() }]);
        mockQueryUniversal(Cittadino, 'updateMany', { modifiedCount: 1 });
        mockQueryUniversal(User, 'find', [{ _id: CITIZEN_ID, save: jest.fn() }]);
        mockQueryUniversal(User, 'updateMany', { modifiedCount: 1 });

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/validations`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(201);
        //controlla che il controller abbia impostato lo stato su APERTA
        expect(res.body.statoSegnalazione).toBe('APERTA'); 
        expect(sessionMock.commitTransaction).toHaveBeenCalled();
        expect(fakeReport.save).toHaveBeenCalled();
    });

    test('401/403: Controllo Autenticazione e Ruolo', async () => {
        //senza token
        let res = await request(app).post(`/api/v1/privateReports/${FAKE_REPORT_ID}/validations`);
        expect(res.status).toBe(401);

        //con token di un proprietario
        const tokenProprietario = jwt.sign({ userId: CITIZEN_ID, ruolo: 'proprietario' }, process.env.JWT_SECRET);
        res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/validations`)
            .set('Authorization', `Bearer ${tokenProprietario}`);
        
        expect(res.status).toBe(403);
        expect(mongoose.startSession).not.toHaveBeenCalled();
    });
});