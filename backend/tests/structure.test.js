// Test suite US7
// POST /api/v1/structures

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const StrutturaPrivata = require('../models/StrutturaPrivata');
const Proprietario = require('../models/Proprietario');

const OWNER_ID = '65a3f4e7b8d9c1f4a2e5b6c8';
const CITIZEN_ID = '65a3f4e7b8d9c1f4a2e5b6c7';
const OTHER_OWNER_ID = '00000000000000000000beef';
const FAKE_STRUCTURE_ID = '65b4f4e7b8d9c1f4a2e5b6a9';
 
const tokenProprietario = jwt.sign(
    { userId: OWNER_ID, ruolo: 'proprietario' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
);
const tokenCittadino = jwt.sign(
    { userId: CITIZEN_ID, ruolo: 'cittadino' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
);

const payloadValido = () => ({
    nome: 'Bar Centrale',
    categoria: 'bar',
    indirizzo: 'Via Belenzani 14, 38122 Trento TN',
    geolocalizzazione: { type: 'Point', coordinates: [11.1217, 46.0667] }
});

describe('POST /api/v1/structures - US7 Registrazione Struttura', () => {
 
 
 
    let saveSpy, findByIdAndUpdateSpy;
 
    beforeEach(() => {
        // di default save() ha successo: popola _id e timestamps come farebbe Mongoose
        saveSpy = jest.spyOn(StrutturaPrivata.prototype, 'save').mockImplementation(function() {
            this._id = FAKE_STRUCTURE_ID;
            this.createdAt = new Date('2026-05-15T10:00:00.000Z');
            this.updatedAt = new Date('2026-05-15T10:00:00.000Z');
            return Promise.resolve(this);
        });
        findByIdAndUpdateSpy = jest.spyOn(Proprietario, 'findByIdAndUpdate')
            .mockResolvedValue({ _id: OWNER_ID });
    });
 
    afterEach(() => {
        saveSpy.mockRestore();
        findByIdAndUpdateSpy.mockRestore();
    });

    test('201: registra struttura, deriva proprietario dal JWT (non dal body), aggiorna Proprietario.strutture', async () => {
        const payloadConSpoof = { ...payloadValido(), proprietario: OTHER_OWNER_ID };
        const res = await request(app)
            .post('/api/v1/structures')
            .set('Authorization', `Bearer ${tokenProprietario}`)
            .send(payloadConSpoof);
 
        expect(res.status).toBe(201);
        expect(res.headers.location).toBe(`/api/v1/structures/${FAKE_STRUCTURE_ID}`);
        expect(res.body.message).toBe('Struttura registrata con successo');
        expect(res.body.struttura).toMatchObject({
            nome: 'Bar Centrale',
            categoria: 'bar',
            indirizzo: 'Via Belenzani 14, 38122 Trento TN'
        });
 
        const documentoSalvato = saveSpy.mock.instances[0];
        expect(documentoSalvato.proprietario.toString()).toBe(OWNER_ID);
        expect(documentoSalvato.proprietario.toString()).not.toBe(OTHER_OWNER_ID);
 
        expect(findByIdAndUpdateSpy).toHaveBeenCalledWith(
            OWNER_ID,
            { $push: { strutture: expect.anything() } }
        );
    });
 
    test('400: categoria fuori enum. ValidationError gestita dal controller', async () => {
        saveSpy.mockImplementation(() => {
            const err = new Error('ValidationError');
            err.name = 'ValidationError';
            err.errors = {
                categoria: { path: 'categoria', message: 'categoria "discoteca" non ammessa' }
            };
            return Promise.reject(err);
        });
 
        const res = await request(app)
            .post('/api/v1/structures')
            .set('Authorization', `Bearer ${tokenProprietario}`)
            .send({ ...payloadValido(), categoria: 'discoteca' });
 
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validazione fallita');
        expect(res.body.details).toContainEqual({
            field: 'categoria',
            message: 'categoria "discoteca" non ammessa'
        });
    });

    test('400: geolocalizzazione mancante. Controller blocca PRIMA di chiamare save()', async () => {
        const { geolocalizzazione, ...payloadSenzaGeo } = payloadValido();
 
        const res = await request(app)
            .post('/api/v1/structures')
            .set('Authorization', `Bearer ${tokenProprietario}`)
            .send(payloadSenzaGeo);
 
        expect(res.status).toBe(400);
        expect(res.body.details[0]).toMatchObject({
            field: 'geolocalizzazione',
            message: expect.stringContaining('GeoJSON Point')
        });
 
        expect(saveSpy).not.toHaveBeenCalled();
    });
 
    test('401: token mancante. verifyToken blocca, save mai chiamato', async () => {
        const res = await request(app)
            .post('/api/v1/structures')
            .send(payloadValido());
 
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Token mancante');
        // invariante: nessuna operazione di scrittura se l'autenticazione fallisce
        expect(saveSpy).not.toHaveBeenCalled();
    });
 
    test('403: token cittadino. requireRole(proprietario) blocca, save mai chiamato', async () => {
        const res = await request(app)
            .post('/api/v1/structures')
            .set('Authorization', `Bearer ${tokenCittadino}`)
            .send(payloadValido());
 
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Accesso negato: ruolo non autorizzato');
        expect(saveSpy).not.toHaveBeenCalled();
    });
});



describe('GET /api/v1/structures - US7 Lista Strutture con filtri', () => {
 
    
    const mockFindChain = (returnValue) => {
        const leanFn = jest.fn().mockResolvedValue(returnValue);
        const sortFn = jest.fn().mockReturnValue({ lean: leanFn });
        const selectFn = jest.fn().mockReturnValue({ sort: sortFn });
        return jest.spyOn(StrutturaPrivata, 'find').mockReturnValue({
            select: selectFn,
            //esposti per ispezione nei test
            _selectFn: selectFn,
            _sortFn: sortFn,
            _leanFn: leanFn
        });
    };
 
    let findSpy;
 
    afterEach(() => {
        if (findSpy) findSpy.mockRestore();
    });
 
    test('200: proprietario richiede le sue strutture → lista filtrata + campo proprietario incluso', async () => {
        const struttureFake = [
            {
                _id: FAKE_STRUCTURE_ID,
                nome: 'Bar Centrale',
                categoria: 'bar',
                indirizzo: 'Via Belenzani 14, Trento',
                geolocalizzazione: { type: 'Point', coordinates: [11.1217, 46.0667] },
                proprietario: OWNER_ID,
                createdAt: '2026-05-15T10:00:00.000Z'
            }
        ];
        findSpy = mockFindChain(struttureFake);
 
        const res = await request(app)
            .get(`/api/v1/structures?proprietario=${OWNER_ID}`)
            .set('Authorization', `Bearer ${tokenProprietario}`);
 
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(1);
        expect(res.body.strutture).toHaveLength(1);
        expect(res.body.strutture[0].proprietario).toBe(OWNER_ID);
 
        expect(findSpy).toHaveBeenCalledWith({ proprietario: OWNER_ID });

        const projectionArg = findSpy.mock.results[0].value._selectFn.mock.calls[0][0];
        expect(projectionArg).toBe('-__v');
    });
 
    test('200: cittadino fa GET senza filtro proprietario → lista globale SENZA campo proprietario', async () => {
        const struttureFake = [
            {
                _id: FAKE_STRUCTURE_ID,
                nome: 'Bar Centrale',
                categoria: 'bar',
                indirizzo: 'Via Belenzani 14, Trento',
                geolocalizzazione: { type: 'Point', coordinates: [11.1217, 46.0667] },
                createdAt: '2026-05-15T10:00:00.000Z'

            }
        ];
        findSpy = mockFindChain(struttureFake);
 
        const res = await request(app)
            .get('/api/v1/structures')
            .set('Authorization', `Bearer ${tokenCittadino}`);
 
        expect(res.status).toBe(200);
        const projectionArg = findSpy.mock.results[0].value._selectFn.mock.calls[0][0];
        expect(projectionArg).toBe('-__v -proprietario');
    });
 
    test('400: bbox mal formato → save non chiamato, errore dettagliato', async () => {
        findSpy = mockFindChain([]);
 
        const res = await request(app)
            .get('/api/v1/structures?bbox=11.1,46.0')  //solo 2 valori invece di 4
            .set('Authorization', `Bearer ${tokenProprietario}`);
 
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validazione fallita');
        expect(res.body.details[0]).toMatchObject({
            field: 'bbox',
            message: expect.stringContaining('formato atteso')
        });
        //invariante: la query non parte se i filtri sono malformati
        expect(findSpy).not.toHaveBeenCalled();
    });
 
    test('401: token mancante → 401, find mai chiamato', async () => {
        findSpy = mockFindChain([]);
 
        const res = await request(app).get('/api/v1/structures');
 
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Token mancante');
        expect(findSpy).not.toHaveBeenCalled();
    });
 
    test('403: tentativo IDOR - proprietario filtra per id altrui → bloccato', async () => {
        findSpy = mockFindChain([]);
 
        const res = await request(app)
            .get(`/api/v1/structures?proprietario=${OTHER_OWNER_ID}`)
            .set('Authorization', `Bearer ${tokenProprietario}`);
 
        expect(res.status).toBe(403);
        expect(res.body.error).toContain('Accesso negato');
        //invariante critica: nessuna query al DB per id altrui
        expect(findSpy).not.toHaveBeenCalled();
    });
});
