// Test suite US10_2 - Smentita Segnalazione Privata
// POST /api/v1/privateReports/:id/disputes

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../app');

const SegnalazionePrivata = require('../models/SegnalazionePrivata');
const ValidazioneSegnalazione = require('../models/ValidazioneSegnalazione');
const Cittadino = require('../models/Cittadino');

const CITIZEN_ID = '65a3f4e7b8d9c1f4a2e5b6c7';   // chi smentisce
const AUTHOR_ID = '65a3f4e7b8d9c1f4a2e5b6d8';    // autore della segnalazione
const FAKE_REPORT_ID = '65b4f4e7b8d9c1f4a2e5b6a9';

const tokenCittadino = jwt.sign(
    { userId: CITIZEN_ID, ruolo: 'cittadino' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
);

describe('POST /api/v1/privateReports/:id/disputes - US27 Smentita Segnalazione Privata', () => {

    let sessionMock;

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(() => {
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

    // mock di findById(...).session(...) -> ritorna returnValue
    const mockFindByIdChained = (model, returnValue) => {
        const sessionFn = jest.fn().mockResolvedValue(returnValue);
        jest.spyOn(model, 'findById').mockReturnValue({ session: sessionFn });
        return sessionFn;
    };

    // quando lo stesso model riceve due findById diversi (segnalazione poi votante, o autore),
    // si usa mockReturnValueOnce in sequenza
    const mockFindByIdSequence = (model, values) => {
        const spy = jest.spyOn(model, 'findById');
        values.forEach(v => {
            spy.mockReturnValueOnce({ session: jest.fn().mockResolvedValue(v) });
        });
        return spy;
    };

    test('400: ObjectId della segnalazione non valido (non hex24)', async () => {
        const res = await request(app)
            .post('/api/v1/privateReports/id-sbagliato/disputes')
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('id');
        expect(mongoose.startSession).not.toHaveBeenCalled();
    });

    test('401: nessun token', async () => {
        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`);
        expect(res.status).toBe(401);
        expect(mongoose.startSession).not.toHaveBeenCalled();
    });

    test('403: token di un proprietario (ruolo non cittadino), DB non toccato', async () => {
        const tokenProprietario = jwt.sign(
            { userId: CITIZEN_ID, ruolo: 'proprietario' }, process.env.JWT_SECRET
        );
        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`)
            .set('Authorization', `Bearer ${tokenProprietario}`);

        expect(res.status).toBe(403);
        expect(mongoose.startSession).not.toHaveBeenCalled();
    });

    test('404: Segnalazione privata non trovata', async () => {
        mockFindByIdChained(SegnalazionePrivata, null);

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Segnalazione privata non trovata');
        expect(sessionMock.abortTransaction).toHaveBeenCalled();
    });

    test('409: stato terminale non smentibile (ARCHIVIATA)', async () => {
        mockFindByIdChained(SegnalazionePrivata, {
            _id: FAKE_REPORT_ID, stato: 'ARCHIVIATA', autore: AUTHOR_ID, bloccaModifica: true
        });

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(409);
        expect(sessionMock.abortTransaction).toHaveBeenCalled();
    });

    test('409: RISOLTA blocca anche la smentita', async () => {
        mockFindByIdChained(SegnalazionePrivata, {
            _id: FAKE_REPORT_ID, stato: 'RISOLTA', autore: AUTHOR_ID, bloccaModifica: true
        });

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(409);
    });

    test('403: non puoi smentire una tua segnalazione (autore == votante)', async () => {
        // segnalazione il cui autore coincide con chi chiama
        mockFindByIdChained(SegnalazionePrivata, {
            _id: FAKE_REPORT_ID, stato: 'IN_VERIFICA', autore: CITIZEN_ID
        });

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(403);
        expect(res.body.error).toContain('Non puoi smentire');
        expect(sessionMock.abortTransaction).toHaveBeenCalled();
    });

    test('409: utente ha già votato questa segnalazione (E11000)', async () => {
        mockFindByIdChained(SegnalazionePrivata, {
            _id: FAKE_REPORT_ID, stato: 'IN_VERIFICA', autore: AUTHOR_ID
        });
        mockFindByIdChained(Cittadino, { _id: CITIZEN_ID, scoreAffidabilita: 5 });

        const dup = new Error('E11000 duplicate key'); dup.code = 11000;
        jest.spyOn(ValidazioneSegnalazione, 'create').mockRejectedValue(dup);

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(409);
        expect(res.body.error).toContain('già votato');
        expect(sessionMock.abortTransaction).toHaveBeenCalled();
    });

    test('201: smentita registrata, NESSUNA archiviazione (score resta > 0)', async () => {
        // IN_VERIFICA a 8, votante con peso 5 -> 3, resta IN_VERIFICA
        const fakeReport = {
            _id: FAKE_REPORT_ID, stato: 'IN_VERIFICA', autore: AUTHOR_ID,
            scoreAssociato: 8, sogliaValidazione: 10, penalitaApplicata: false,
            save: jest.fn().mockImplementation(function () {
                // simula il pre('validate'): score 3 -> IN_VERIFICA
                this.stato = this.scoreAssociato <= 0 ? 'ARCHIVIATA'
                    : (this.scoreAssociato >= this.sogliaValidazione ? 'APERTA' : 'IN_VERIFICA');
                return Promise.resolve(true);
            })
        };
        // findById: prima la segnalazione, poi il votante (Cittadino)
        mockFindByIdChained(SegnalazionePrivata, fakeReport);
        mockFindByIdChained(Cittadino, { _id: CITIZEN_ID, scoreAffidabilita: 5 });

        jest.spyOn(ValidazioneSegnalazione, 'create').mockResolvedValue([{ _id: 'v1' }]);

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(201);
        expect(res.body.archiviata).toBe(false);
        expect(res.body.statoSegnalazione).toBe('IN_VERIFICA');
        expect(res.body.scoreAssociato).toBe(3);
        expect(res.body.penalitaAutore).toBe(0);
        expect(sessionMock.commitTransaction).toHaveBeenCalled();
        expect(fakeReport.save).toHaveBeenCalled();
    });

    test('201: smentita porta in ARCHIVIATA e applica penalita all\'autore', async () => {
        // IN_VERIFICA a 3, votante peso 5 -> -2 -> ARCHIVIATA
        const fakeReport = {
            _id: FAKE_REPORT_ID, stato: 'IN_VERIFICA', autore: AUTHOR_ID,
            scoreAssociato: 3, sogliaValidazione: 10, penalitaApplicata: false,
            save: jest.fn().mockImplementation(function () {
                this.stato = this.scoreAssociato <= 0 ? 'ARCHIVIATA'
                    : (this.scoreAssociato >= this.sogliaValidazione ? 'APERTA' : 'IN_VERIFICA');
                return Promise.resolve(true);
            })
        };
        // findById SegnalazionePrivata -> report
        mockFindByIdChained(SegnalazionePrivata, fakeReport);
        // findById Cittadino: 1) votante (peso 5), 2) autore (scoreAff 8 -> penalita ceil(8/2)=4 -> 4)
        const autoreDoc = { _id: AUTHOR_ID, scoreAffidabilita: 8, save: jest.fn().mockResolvedValue(true) };
        mockFindByIdSequence(Cittadino, [
            { _id: CITIZEN_ID, scoreAffidabilita: 5 },
            autoreDoc
        ]);

        jest.spyOn(ValidazioneSegnalazione, 'create').mockResolvedValue([{ _id: 'v1' }]);

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(201);
        expect(res.body.archiviata).toBe(true);
        expect(res.body.statoSegnalazione).toBe('ARCHIVIATA');
        expect(res.body.scoreAssociato).toBe(-2);
        // penalita = ceil(8/2) = 4; autore da 8 a 4
        expect(res.body.penalitaAutore).toBe(4);
        expect(autoreDoc.save).toHaveBeenCalled();
        expect(fakeReport.penalitaApplicata).toBe(true);
        expect(sessionMock.commitTransaction).toHaveBeenCalled();
    });

    test('201: penalita clamp a 1 (autore con score basso non scende sotto 1)', async () => {
        const fakeReport = {
            _id: FAKE_REPORT_ID, stato: 'IN_VERIFICA', autore: AUTHOR_ID,
            scoreAssociato: 1, sogliaValidazione: 10, penalitaApplicata: false,
            save: jest.fn().mockImplementation(function () {
                this.stato = this.scoreAssociato <= 0 ? 'ARCHIVIATA' : 'IN_VERIFICA';
                return Promise.resolve(true);
            })
        };
        mockFindByIdChained(SegnalazionePrivata, fakeReport);
        // autore con scoreAff 1: ceil(1/2)=1 -> 1-1=0 -> clamp a 1 -> penalita effettiva 0
        const autoreDoc = { _id: AUTHOR_ID, scoreAffidabilita: 1, save: jest.fn().mockResolvedValue(true) };
        mockFindByIdSequence(Cittadino, [
            { _id: CITIZEN_ID, scoreAffidabilita: 1 },  // votante peso 1 -> 1-1=0 -> ARCHIVIATA
            autoreDoc
        ]);

        jest.spyOn(ValidazioneSegnalazione, 'create').mockResolvedValue([{ _id: 'v1' }]);

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(201);
        expect(res.body.archiviata).toBe(true);
        // autore era 1, clamp a 1 -> penalita effettiva 0
        expect(res.body.penalitaAutore).toBe(0);
        expect(autoreDoc.scoreAffidabilita).toBe(1);
    });

    test('201: smentita su APERTA la fa retrocedere a IN_VERIFICA', async () => {
        // APERTA a 11, votante peso 5 -> 6 -> IN_VERIFICA (sotto soglia 10)
        const fakeReport = {
            _id: FAKE_REPORT_ID, stato: 'APERTA', autore: AUTHOR_ID,
            scoreAssociato: 11, sogliaValidazione: 10, penalitaApplicata: false,
            save: jest.fn().mockImplementation(function () {
                this.stato = this.scoreAssociato <= 0 ? 'ARCHIVIATA'
                    : (this.scoreAssociato >= this.sogliaValidazione ? 'APERTA' : 'IN_VERIFICA');
                return Promise.resolve(true);
            })
        };
        mockFindByIdChained(SegnalazionePrivata, fakeReport);
        mockFindByIdChained(Cittadino, { _id: CITIZEN_ID, scoreAffidabilita: 5 });

        jest.spyOn(ValidazioneSegnalazione, 'create').mockResolvedValue([{ _id: 'v1' }]);

        const res = await request(app)
            .post(`/api/v1/privateReports/${FAKE_REPORT_ID}/disputes`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(201);
        expect(res.body.archiviata).toBe(false);
        expect(res.body.statoSegnalazione).toBe('IN_VERIFICA');
        expect(res.body.scoreAssociato).toBe(6);
        // i punti gia distribuiti ai validatori NON vengono revocati: nessuna penalita qui
        expect(res.body.penalitaAutore).toBe(0);
    });
});