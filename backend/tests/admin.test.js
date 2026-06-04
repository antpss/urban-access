// Test suite US19
// GET /api/v1/admin/heatmap

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../app');

const Segnalazione = require('../models/Segnalazione');

const OPERATORE_ID = '65a3f4e7b8d9c1f4a2e5b6c7';
const CITIZEN_ID = '65a3f4e7b8d9c1f4a2e5b6c8';

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

describe('GET /api/v1/admin/heatmap - US19 Generazione Heatmap', () => {

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    //helper per mockare Segnalazione.aggregate (ritorna direttamente una Promise)
    const mockAggregate = (returnValue) => {
        jest.spyOn(Segnalazione, 'aggregate').mockResolvedValue(returnValue);
    };

    test('401: nessun token', async () => {
        const res = await request(app).get('/api/v1/admin/heatmap');
        expect(res.status).toBe(401);
    });

    test('403: token di un cittadino (ruolo non operatore)', async () => {
        const aggregateSpy = jest.spyOn(Segnalazione, 'aggregate');

        const res = await request(app)
            .get('/api/v1/admin/heatmap')
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(403);
        //il controller non deve nemmeno partire se il ruolo è bloccato dal middleware
        expect(aggregateSpy).not.toHaveBeenCalled();
    });

    test('200: happy path senza filtri, ritorna celle e forma risposta corretta', async () => {
        const celleMock = [
            { lat: 46.067, lng: 11.121, count: 7, countAperta: 5, countInVerifica: 2 },
            { lat: 46.069, lng: 11.125, count: 3, countAperta: 0, countInVerifica: 3 }
        ];
        mockAggregate(celleMock);

        const res = await request(app)
            .get('/api/v1/admin/heatmap')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);
        expect(res.body.precision).toBe(3); //default
        expect(res.body.celle).toEqual(celleMock);
    });

    test('200: senza stato, il match include entrambi gli stati attivi', async () => {
        const aggregateSpy = jest.spyOn(Segnalazione, 'aggregate').mockResolvedValue([]);

        const res = await request(app)
            .get('/api/v1/admin/heatmap')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        //primo stadio della pipeline = $match; verifico che lo stato sia { $in: [...] }
        const pipeline = aggregateSpy.mock.calls[0][0];
        const matchStage = pipeline[0].$match;
        expect(matchStage.stato).toEqual({ $in: ['APERTA', 'IN_VERIFICA'] });
    });

    test('200: con stato=APERTA, il match filtra solo APERTA', async () => {
        const aggregateSpy = jest.spyOn(Segnalazione, 'aggregate').mockResolvedValue([]);

        const res = await request(app)
            .get('/api/v1/admin/heatmap?stato=APERTA')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        const matchStage = aggregateSpy.mock.calls[0][0][0].$match;
        expect(matchStage.stato).toBe('APERTA');
    });

    test('400: stato non attivo (es. RISOLTA) rifiutato, aggregate non chiamato', async () => {
        const aggregateSpy = jest.spyOn(Segnalazione, 'aggregate');

        const res = await request(app)
            .get('/api/v1/admin/heatmap?stato=RISOLTA')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('stato');
        expect(aggregateSpy).not.toHaveBeenCalled();
    });

    test('400: precision fuori range', async () => {
        const aggregateSpy = jest.spyOn(Segnalazione, 'aggregate');

        const res = await request(app)
            .get('/api/v1/admin/heatmap?precision=9')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('precision');
        expect(aggregateSpy).not.toHaveBeenCalled();
    });

    test('400: from non è una data valida', async () => {
        const aggregateSpy = jest.spyOn(Segnalazione, 'aggregate');

        const res = await request(app)
            .get('/api/v1/admin/heatmap?from=spazzatura')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('from');
        expect(aggregateSpy).not.toHaveBeenCalled();
    });

    test('400: to precedente a from', async () => {
        const aggregateSpy = jest.spyOn(Segnalazione, 'aggregate');

        const res = await request(app)
            .get('/api/v1/admin/heatmap?from=2026-06-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('to');
        expect(aggregateSpy).not.toHaveBeenCalled();
    });

    test('200: precision custom valida applicata e riflessa in risposta', async () => {
        mockAggregate([]);

        const res = await request(app)
            .get('/api/v1/admin/heatmap?precision=4')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        expect(res.body.precision).toBe(4);
    });

    test('200: from+to validi inseriti nel match come $gte/$lte su createdAt', async () => {
        const aggregateSpy = jest.spyOn(Segnalazione, 'aggregate').mockResolvedValue([]);

        const from = '2026-01-01T00:00:00.000Z';
        const to = '2026-06-01T23:59:59.999Z';
        const res = await request(app)
            .get(`/api/v1/admin/heatmap?from=${from}&to=${to}`)
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        const matchStage = aggregateSpy.mock.calls[0][0][0].$match;
        expect(matchStage.createdAt.$gte).toEqual(new Date(from));
        expect(matchStage.createdAt.$lte).toEqual(new Date(to));
    });

    test('500: errore di aggregate gestito', async () => {
        jest.spyOn(Segnalazione, 'aggregate').mockRejectedValue(new Error('DB down'));

        const res = await request(app)
            .get('/api/v1/admin/heatmap')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Errore interno del server');
    });
});