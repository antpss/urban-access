// Test suite US8
// GET /api/v1/geocode  e  GET /api/v1/routes
// i servizi sono simulati, non si testano se Valhalla o Nominatim funzionano

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const geocodingService = require('../services/geocodingService');
const routingService = require('../services/routingService');
const {POS_TRENTO} = require('../config/routing');

describe('Routing & Geocoding API', () => {
 
    const CITIZEN_ID = '65a3f4e7b8d9c1f4a2e5b6c7';
 
    const tokenCittadino = jwt.sign(
        { userId: CITIZEN_ID, ruolo: 'cittadino' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );
 
    let geocodeSpy, routeSpy;
 
    afterEach(() => {
        if (geocodeSpy) geocodeSpy.mockRestore();
        if (routeSpy) routeSpy.mockRestore();
    });
 
    // GET /api/v1/geocode?q=<indirizzo>
    describe('GET /api/v1/geocode', () => {
 
        test('200: query valida. Lista di candidati normalizzati', async () => {
            const candidatiFake = [
                { label: 'Piazza del Duomo, Trento, Italia', lng: 11.1214267, lat: 46.0673519 }
            ];
            geocodeSpy = jest.spyOn(geocodingService, 'geocode')
                .mockResolvedValue(candidatiFake);
 
            const res = await request(app)
                .get('/api/v1/geocode?q=Piazza Duomo Trento')
                .set('Authorization', `Bearer ${tokenCittadino}`);
 
            expect(res.status).toBe(200);
            expect(res.body.count).toBe(1);
            expect(res.body.candidati).toHaveLength(1);
            expect(res.body.candidati[0]).toMatchObject({
                label: expect.stringContaining('Duomo'),
                lng: 11.1214267,
                lat: 46.0673519
            });
            expect(geocodeSpy).toHaveBeenCalledWith('Piazza Duomo Trento');
        });
 
        test('400: query troppo corta (min. 3 char). ValidationError, service mai chiamato', async () => {
            geocodeSpy = jest.spyOn(geocodingService, 'geocode').mockResolvedValue([]);
 
            const res = await request(app)
                .get('/api/v1/geocode?q=ab')
                .set('Authorization', `Bearer ${tokenCittadino}`);
 
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validazione fallita');
            expect(res.body.details[0]).toMatchObject({ field: 'q' });
            expect(geocodeSpy).not.toHaveBeenCalled();
        });
 
        test('502: il service di geocoding fallisce. Errore di servizio non disponibile', async () => {
            // simula Nominatim irraggiungibile: il service lancia con statusCode 502
            const err = new Error('Nominatim down');
            err.statusCode = 502;
            geocodeSpy = jest.spyOn(geocodingService, 'geocode').mockRejectedValue(err);
 
            const res = await request(app)
                .get('/api/v1/geocode?q=Piazza Duomo Trento')
                .set('Authorization', `Bearer ${tokenCittadino}`);
 
            expect(res.status).toBe(502);
            expect(res.body.error).toMatch(/geocoding non disponibile/i);
        });
 
        test('401: token mancante. Service mai chiamato', async () => {
            geocodeSpy = jest.spyOn(geocodingService, 'geocode').mockResolvedValue([]);
 
            const res = await request(app).get('/api/v1/geocode?q=Trento');
 
            expect(res.status).toBe(401);
            // invariante: nessuna chiamata al servizio esterno se l'auth fallisce
            expect(geocodeSpy).not.toHaveBeenCalled();
        });
    });
 
    // GET /api/v1/routes?to=<lng,lat>
    describe('GET /api/v1/routes', () => {
 
        const percorsoFake = {
            geometry: {
                type: 'LineString',
                coordinates: [[11.121115, 46.066743], [11.121305, 46.0673]]
            },
            distance: 79,
            duration: 56
        };
 
        test('200: destinazione valida. Percorso con origine hardcoded Trento', async () => {
            routeSpy = jest.spyOn(routingService, 'calculateRoute')
                .mockResolvedValue(percorsoFake);
 
            const res = await request(app)
                .get('/api/v1/routes?to=11.1214267,46.0673519')
                .set('Authorization', `Bearer ${tokenCittadino}`);
 
            expect(res.status).toBe(200);
            expect(res.body.geometry.type).toBe('LineString');
            expect(res.body.distance).toBe(79);
            expect(res.body.duration).toBe(56);
            expect(res.body.origin).toMatchObject({ lng: POS_TRENTO[0], lat: POS_TRENTO[1] });
            expect(res.body.destination).toMatchObject({ lng: 11.1214267, lat: 46.0673519 });
            const [originArg, destArg] = routeSpy.mock.calls[0];
            expect(originArg).toMatchObject({ lng: POS_TRENTO[0], lat: POS_TRENTO[1] });
            expect(destArg).toMatchObject({ lng: 11.1214267, lat: 46.0673519 });
        });
 
        test('400: coordinate fuori range. ValidationError, service mai chiamato', async () => {
            routeSpy = jest.spyOn(routingService, 'calculateRoute')
                .mockResolvedValue(percorsoFake);
 
            const res = await request(app)
                .get('/api/v1/routes?to=999,999')
                .set('Authorization', `Bearer ${tokenCittadino}`);
 
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validazione fallita');
            expect(res.body.details[0]).toMatchObject({ field: 'to' });
            expect(routeSpy).not.toHaveBeenCalled();
        });
 
        test('422: destinazione irraggiungibile (no path)', async () => {
            // simula Valhalla che risponde "no path": il service lancia con statusCode 422
            const err = new Error('Nessun percorso pedonale verso la destinazione');
            err.statusCode = 422;
            routeSpy = jest.spyOn(routingService, 'calculateRoute').mockRejectedValue(err);
 
            const res = await request(app)
                // simula punto irraggiungibile
                .get('/api/v1/routes?to=13.5,44.0')
                .set('Authorization', `Bearer ${tokenCittadino}`);
 
            expect(res.status).toBe(422);
            expect(res.body.error).toMatch(/raggiungibile/i);
        });
 
        test('502: motore di routing irraggiungibile', async () => {
            // simula Valhalla spento: il service lancia con statusCode 502
            const err = new Error('Servizio di routing irraggiungibile');
            err.statusCode = 502;
            routeSpy = jest.spyOn(routingService, 'calculateRoute').mockRejectedValue(err);
 
            const res = await request(app)
                .get('/api/v1/routes?to=11.1214267,46.0673519')
                .set('Authorization', `Bearer ${tokenCittadino}`);
 
            expect(res.status).toBe(502);
            expect(res.body.error).toMatch(/non disponibile/i);
        });
 
        test('401: token mancante. Service mai chiamato', async () => {
            routeSpy = jest.spyOn(routingService, 'calculateRoute')
                .mockResolvedValue(percorsoFake);
 
            const res = await request(app).get('/api/v1/routes?to=11.1214267,46.0673519');
 
            expect(res.status).toBe(401);
            expect(routeSpy).not.toHaveBeenCalled();
        });
    });
});