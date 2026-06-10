// Test suite US20
// GET /api/v1/admin/reports

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

describe('GET /api/v1/admin/reports - US20 Dashboard Segnalazioni', () => {

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    //costruisce un finto query-builder Mongoose: select/sort/skip/limit ritornano lo
    // stesso oggetto (chaining), lean() risolve con i documenti passati.
    //restituisce builder + spy sui metodi, così i test possono ispezionare gli argomenti.
    const makeQueryBuilder = (docs) => {
        const builder = {
            select: jest.fn(() => builder),
            sort: jest.fn(() => builder),
            skip: jest.fn(() => builder),
            limit: jest.fn(() => builder),
            lean: jest.fn(() => Promise.resolve(docs))
        };
        return builder;
    };

    //mock combniato di find (chainable) + countDocuments
    const mockFindAndCount = (docs, total) => {
        const builder = makeQueryBuilder(docs);
        const findSpy = jest.spyOn(Segnalazione, 'find').mockReturnValue(builder);
        const countSpy = jest.spyOn(Segnalazione, 'countDocuments').mockResolvedValue(total);
        return { builder, findSpy, countSpy };
    };

    test('401: nessun token', async () => {
        const res = await request(app).get('/api/v1/admin/reports');
        expect(res.status).toBe(401);
    });

    test('403: token di un cittadino (ruolo non operatore), il DB non viene toccato', async () => {
        const findSpy = jest.spyOn(Segnalazione, 'find');
        const countSpy = jest.spyOn(Segnalazione, 'countDocuments');

        const res = await request(app)
            .get('/api/v1/admin/reports')
            .set('Authorization', `Bearer ${tokenCittadino}`);

        expect(res.status).toBe(403);
        expect(findSpy).not.toHaveBeenCalled();
        expect(countSpy).not.toHaveBeenCalled();
    });

    test('200: happy path senza filtri, forma risposta + paginazione corretta', async () => {
        const docsMock = [
            { _id: '1', tipo: 'pubblica', descrizione: 'aaaaaaaaaa', categoria: 'marciapiede_rotto', stato: 'APERTA' },
            { _id: '2', tipo: 'pubblica', descrizione: 'bbbbbbbbbb', categoria: 'altro', stato: 'APERTA' }
        ];
        mockFindAndCount(docsMock, 42);

        const res = await request(app)
            .get('/api/v1/admin/reports')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);              // elementi nella pagina
        expect(res.body.segnalazioni).toEqual(docsMock);
        expect(res.body.pagination).toEqual({
            page: 1,
            limit: 20,
            totalItems: 42,
            totalPages: 3,                           // ceil(42/20)
            hasPrev: false,
            hasNext: true
        });
    });

    test('200: scope forzato a tipo=pubblica e stato default APERTA nel filtro find', async () => {
        const { findSpy } = mockFindAndCount([], 0);

        const res = await request(app)
            .get('/api/v1/admin/reports')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        const filtro = findSpy.mock.calls[0][0];
        expect(filtro.tipo).toBe('pubblica');
        expect(filtro.stato).toEqual({ $in: ['APERTA', 'PRESA_IN_CARICO'] });    
    });

    test('200: categoria valida inserita nel filtro', async () => {
        const { findSpy } = mockFindAndCount([], 0);

        const res = await request(app)
            .get('/api/v1/admin/reports?categoria=marciapiede_rotto')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        expect(findSpy.mock.calls[0][0].categoria).toBe('marciapiede_rotto');
    });

    test('200: from+to validi inseriti nel filtro come $gte/$lte su createdAt', async () => {
        const { findSpy } = mockFindAndCount([], 0);

        const from = '2026-01-01T00:00:00.000Z';
        const to = '2026-06-01T23:59:59.999Z';
        const res = await request(app)
            .get(`/api/v1/admin/reports?from=${from}&to=${to}`)
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        const filtro = findSpy.mock.calls[0][0];
        expect(filtro.createdAt.$gte).toEqual(new Date(from));
        expect(filtro.createdAt.$lte).toEqual(new Date(to));
    });

    test('200: orderBy+order si traducono in sort({campo: direzione})', async () => {
        const { builder } = mockFindAndCount([], 0);

        const res = await request(app)
            .get('/api/v1/admin/reports?orderBy=categoria&order=asc')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        //sort è il primo metodo chainato con argomento d'interesse
        expect(builder.sort).toHaveBeenCalledWith({ categoria: 1 });
    });

    test('200: sort di default = createdAt desc quando orderBy/order assenti', async () => {
        const { builder } = mockFindAndCount([], 0);

        const res = await request(app)
            .get('/api/v1/admin/reports')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        expect(builder.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    test('200: paginazione - page=2 limit=10 produce skip=10 e limit=10', async () => {
        const { builder } = mockFindAndCount([], 100);

        const res = await request(app)
            .get('/api/v1/admin/reports?page=2&limit=10')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(200);
        expect(builder.skip).toHaveBeenCalledWith(10);  // (2-1)*10
        expect(builder.limit).toHaveBeenCalledWith(10);
        expect(res.body.pagination.hasPrev).toBe(true);
        expect(res.body.pagination.hasNext).toBe(true); // pagina 2 di 10
    });

    test('400: stato non ammesso (IN_VERIFICA) rifiutato, DB non toccato', async () => {
        const findSpy = jest.spyOn(Segnalazione, 'find');

        const res = await request(app)
            .get('/api/v1/admin/reports?stato=IN_VERIFICA')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('stato');
        expect(findSpy).not.toHaveBeenCalled();
    });

    test('400: categoria non ammessa rifiutata, DB non toccato', async () => {
        const findSpy = jest.spyOn(Segnalazione, 'find');

        const res = await request(app)
            .get('/api/v1/admin/reports?categoria=categoria_inventata')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('categoria');
        expect(findSpy).not.toHaveBeenCalled();
    });

    test('400: orderBy fuori whitelist rifiutato, DB non toccato', async () => {
        const findSpy = jest.spyOn(Segnalazione, 'find');

        const res = await request(app)
            .get('/api/v1/admin/reports?orderBy=autore')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('orderBy');
        expect(findSpy).not.toHaveBeenCalled();
    });

    test('400: order non valido (diverso da asc/desc) rifiutato', async () => {
        const findSpy = jest.spyOn(Segnalazione, 'find');

        const res = await request(app)
            .get('/api/v1/admin/reports?order=ascendente')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('order');
        expect(findSpy).not.toHaveBeenCalled();
    });

    test('400: limit fuori range (>100) rifiutato', async () => {
        const findSpy = jest.spyOn(Segnalazione, 'find');

        const res = await request(app)
            .get('/api/v1/admin/reports?limit=500')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('limit');
        expect(findSpy).not.toHaveBeenCalled();
    });

    test('400: page < 1 rifiutato', async () => {
        const findSpy = jest.spyOn(Segnalazione, 'find');

        const res = await request(app)
            .get('/api/v1/admin/reports?page=0')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('page');
        expect(findSpy).not.toHaveBeenCalled();
    });

    test('400: from non è una data valida', async () => {
        const findSpy = jest.spyOn(Segnalazione, 'find');

        const res = await request(app)
            .get('/api/v1/admin/reports?from=spazzatura')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('from');
        expect(findSpy).not.toHaveBeenCalled();
    });

    test('500: errore del DB gestito', async () => {
        //find chainable ma lean() rigetta: simula guasto a valle del Promise.all
        const builder = {
            select: jest.fn(() => builder),
            sort: jest.fn(() => builder),
            skip: jest.fn(() => builder),
            limit: jest.fn(() => builder),
            lean: jest.fn(() => Promise.reject(new Error('DB down')))
        };
        jest.spyOn(Segnalazione, 'find').mockReturnValue(builder);
        jest.spyOn(Segnalazione, 'countDocuments').mockResolvedValue(0);

        const res = await request(app)
            .get('/api/v1/admin/reports')
            .set('Authorization', `Bearer ${tokenOperatore}`);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Errore interno del server');
    });
});