// Test suite US21
// PATCH /api/v1/admin/reports/:id/presa-in-carico

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../app');

const Segnalazione = require('../models/Segnalazione');

const OPERATORE_ID = '65a3f4e7b8d9c1f4a2e5b6c7';
const CITIZEN_ID = '65a3f4e7b8d9c1f4a2e5b6c8';
const VALID_REPORT_ID = '6a208fa89bb994923937f27f';

const tokenOperatore = jwt.sign(
    { userId: OPERATORE_ID, ruolo: 'operatore' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
);

const tokenCittadino = jwt.sign(
    { userId: CITIZEN_ID, ruolo: 'cittadino' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
);

describe('PATCH /api/v1/admin/reports/:id/presa-in-carico - US21 Presa in carico', () => {

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('401: nessun token', async () => {
        const res = await request(app).patch(`/api/v1/admin/reports/${VALID_REPORT_ID}/presa-in-carico`);
        expect(res.status).toBe(401);
    });

    test('403: token di un cittadino (ruolo non operatore), il DB non viene toccato', async () => {
        const findOneSpy = jest.spyOn(Segnalazione, 'findOne');

        const res = await request(app)
            .patch(`/api/v1/admin/reports/${VALID_REPORT_ID}/presa-in-carico`)
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(403);
        expect(findOneSpy).not.toHaveBeenCalled();
    });

    test('400: id segnalazione non è un ObjectId valido, il DB non viene toccato', async () => {
        const findOneSpy = jest.spyOn(Segnalazione, 'findOne');

        const res = await request(app)
            .patch('/api/v1/admin/reports/id-invalido/presa-in-carico')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('id');
        expect(findOneSpy).not.toHaveBeenCalled();
    });

    test('404: segnalazione non trovata o non pubblica', async () => {
        jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(null);

        const res = await request(app)
            .patch(`/api/v1/admin/reports/${VALID_REPORT_ID}/presa-in-carico`)
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Segnalazione pubblica non trovata');
    });

    test('409: segnalazione trovata ma non in stato APERTA', async () => {
        const mockDoc = { _id: VALID_REPORT_ID, stato: 'PRESA_IN_CARICO' };
        jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(mockDoc);

        const res = await request(app)
            .patch(`/api/v1/admin/reports/${VALID_REPORT_ID}/presa-in-carico`)
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(409);
        expect(res.body.error).toContain('non è in stato APERTA');
    });

    test('200: happy path, stato aggiornato, enteCompetente assegnato da JWT, save chiamato', async () => {
        //mock del documento Mongoose con metodo save()
        const mockDoc = {
            _id: VALID_REPORT_ID,
            stato: 'APERTA',
            enteCompetente: null,
            save: jest.fn().mockResolvedValue(true)
        };
        jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(mockDoc);

        const res = await request(app)
            .patch(`/api/v1/admin/reports/${VALID_REPORT_ID}/presa-in-carico`)
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Segnalazione presa in carico con successo');
        
        //ùverifiche sulle mutazioni in-memory del documento prima del save
        expect(mockDoc.stato).toBe('PRESA_IN_CARICO');
        expect(mockDoc.enteCompetente).toBe(OPERATORE_ID);
        expect(mockDoc.save).toHaveBeenCalled();
    });

    test('400: validazione Mongoose fallisce al save() (es. manca autore storico)', async () => {
        const mockDoc = {
            _id: VALID_REPORT_ID,
            stato: 'APERTA',
            enteCompetente: null,
            save: jest.fn().mockImplementation(() => {
                const err = new Error('ValidationError');
                err.name = 'ValidationError';
                err.errors = {
                    autore: { path: 'autore', message: 'autore obbligatorio' }
                };
                return Promise.reject(err);
            })
        };
        jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(mockDoc);

        const res = await request(app)
            .patch(`/api/v1/admin/reports/${VALID_REPORT_ID}/presa-in-carico`)
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validazione fallita');
        expect(res.body.details).toContainEqual({
            field: 'autore',
            message: 'autore obbligatorio'
        });
    });

    test('500: errore generico del DB gestito', async () => {
        jest.spyOn(Segnalazione, 'findOne').mockRejectedValue(new Error('DB down'));

        const res = await request(app)
            .patch(`/api/v1/admin/reports/${VALID_REPORT_ID}/presa-in-carico`)
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Errore interno del server');
    });
});