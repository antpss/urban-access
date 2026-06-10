// Test suite US24, US13
// GET  /api/v1/users/me  (visualizzazione profilo)
// PATCH /api/v1/users/me (modifica nome, cognome, profiloDisabilita)
// DELETE /api/v1/users/me (cancellazione account con eliminazione dipendenze)

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Cittadino = require('../models/Cittadino');
const Proprietario = require('../models/Proprietario');

const SegnalazionePrivata = require('../models/SegnalazionePrivata');
const SegnalazionePubblica = require('../models/SegnalazionePubblica');
const StrutturaPrivata = require('../models/StrutturaPrivata');
const bcrypt = require('bcrypt');

describe('US13 - DELETE /api/v1/users/me', () => {

    const CITIZEN_ID = '65a3f4e7b8d9c1f4a2e5b6c7';

    const tokenCittadino = jwt.sign(
        { userId: CITIZEN_ID, ruolo: 'cittadino' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );

    afterEach(() => jest.restoreAllMocks());

    // documento con comparePassword controllabile
    const fakeUserConPassword = (passwordCorretta) => ({
        _id: CITIZEN_ID,
        email: 'mario.rossi@example.com',
        ruolo: 'cittadino',
        password: '$2b$12$hashfittizio',
        comparePassword(inserita) {
            return Promise.resolve(inserita === passwordCorretta);
        }
    });

    test('200: password corretta. Cascade eseguito e User eliminato per ultimo', async () => {
        jest.spyOn(User, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue(fakeUserConPassword('giusta'))
        });

        const delPrivate = jest.spyOn(SegnalazionePrivata, 'deleteMany').mockResolvedValue({});
        const anonPublic = jest.spyOn(SegnalazionePubblica, 'updateMany').mockResolvedValue({});
        const pullValid  = jest.spyOn(SegnalazionePrivata, 'updateMany').mockResolvedValue({});
        const delUser    = jest.spyOn(User, 'findByIdAndDelete').mockResolvedValue({});

        const res = await request(app)
            .delete('/api/v1/users/me')
            .set('Authorization', `Bearer ${tokenCittadino}`)
            .send({ password: 'giusta' });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Account eliminato con successo');

        expect(anonPublic).toHaveBeenCalledWith(
            { autore: CITIZEN_ID },
            { $set: { autore: null } }
        );

        const ordineUser = delUser.mock.invocationCallOrder[0];
        expect(ordineUser).toBeGreaterThan(delPrivate.mock.invocationCallOrder[0]);
        expect(ordineUser).toBeGreaterThan(anonPublic.mock.invocationCallOrder[0]);
    });

    test('401: password errata. Nessuna scrittura, User NON eliminato', async () => {
        jest.spyOn(User, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue(fakeUserConPassword('giusta'))
        });

        const delPrivate = jest.spyOn(SegnalazionePrivata, 'deleteMany');
        const delUser    = jest.spyOn(User, 'findByIdAndDelete');

        const res = await request(app)
            .delete('/api/v1/users/me')
            .set('Authorization', `Bearer ${tokenCittadino}`)
            .send({ password: 'sbagliata' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Credenziali non valide');

        expect(delPrivate).not.toHaveBeenCalled();
        expect(delUser).not.toHaveBeenCalled();
    });
});

describe('US24 - Profilo personale /api/v1/users/me', () => {

    const CITIZEN_ID = '65a3f4e7b8d9c1f4a2e5b6c7';
    const OWNER_ID   = '65a3f4e7b8d9c1f4a2e5b6c8';
    const GHOST_ID   = '00000000000000000000dead'; //utente inesistente

    const tokenCittadino = jwt.sign(
        { userId: CITIZEN_ID, ruolo: 'cittadino' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );
    const tokenProprietario = jwt.sign(
        { userId: OWNER_ID, ruolo: 'proprietario' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );

    // documento cittadino fittizio
    // include campi sensibili/interni per verificare che sanitizeUser li rimuova.
    const fakeCittadinoDoc = (overrides = {}) => ({
        _id: CITIZEN_ID,
        email: 'mario.rossi@example.com',
        nome: 'Mario',
        cognome: 'Rossi',
        ruolo: 'cittadino',
        profiloDisabilita: ['sediaARotelle'],
        scoreAffidabilita: 5,
        password: '$2b$12$hashfittizio',
        notifiche: [{ messaggio: 'x' }],
        __v: 0,
        toObject() { return { ...this, ...overrides }; }
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });



    describe('PATCH /api/v1/users/me', () => {
        test('200: cittadino aggiorna nome/cognome/profiloDisabilita; campi trimmati e deduplicati', async () => {
            //intercetto il Model specifico del ruolo (Cittadino), come fa MODEL_BY_RUOLO
            const updateSpy = jest.spyOn(Cittadino, 'findByIdAndUpdate')
                .mockResolvedValue(fakeCittadinoDoc({
                    nome: 'Luca',
                    cognome: 'Verdi',
                    profiloDisabilita: ['sediaARotelle', 'cecita']
                }));

            const res = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${tokenCittadino}`)
                .send({
                    nome: '  Luca  ',
                    cognome: '  Verdi ',
                    profiloDisabilita: ['sediaARotelle', 'sediaARotelle', 'cecita'] // duplicato
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Profilo aggiornato con successo');

            //il payload passato a findByIdAndUpdate deve avere nome/cognome trimmati
            //e profiloDisabilita deduplicato
            const [idArg, payloadArg, optsArg] = updateSpy.mock.calls[0];
            expect(idArg).toBe(CITIZEN_ID);
            expect(payloadArg.nome).toBe('Luca');
            expect(payloadArg.cognome).toBe('Verdi');
            expect(payloadArg.profiloDisabilita).toEqual(['sediaARotelle', 'cecita']);
            expect(optsArg).toMatchObject({ new: true, runValidators: true });

            //sanitizzazione anche sulla risposta del PATCH
            expect(res.body.user.password).toBeUndefined();
            expect(res.body.user.notifiche).toBeUndefined();
        });

        test('200: proprietario aggiorna nome/cognome (bug ruoli risolto: usa Proprietario)', async () => {
            const updateSpy = jest.spyOn(Proprietario, 'findByIdAndUpdate')
                .mockResolvedValue({
                    _id: OWNER_ID, email: 'p@example.com', nome: 'Anna',
                    cognome: 'Bianchi', ruolo: 'proprietario',
                    toObject() { return { ...this }; }
                });

            const res = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${tokenProprietario}`)
                .send({ nome: 'Anna', cognome: 'Bianchi' });

            expect(res.status).toBe(200);
            expect(updateSpy).toHaveBeenCalledWith(
                OWNER_ID,
                { nome: 'Anna', cognome: 'Bianchi' },
                { new: true, runValidators: true }
            );
        });

        test('400: body senza alcun campo whitelist (field "body")', async () => {
            const updateSpy = jest.spyOn(Cittadino, 'findByIdAndUpdate');

            const res = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${tokenCittadino}`)
                .send({ scoreAffidabilita: 999, ruolo: 'operatore' }); // campi non whitelist

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validazione fallita');
            expect(res.body.details[0]).toMatchObject({ field: 'body' });
            //nessuna scrittura se non c'è nulla di modificabile
            expect(updateSpy).not.toHaveBeenCalled();
        });

        test('400: nome vuoto (solo spazi). Controller blocca PRIMA di findByIdAndUpdate', async () => {
            const updateSpy = jest.spyOn(Cittadino, 'findByIdAndUpdate');

            const res = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${tokenCittadino}`)
                .send({ nome: '   ' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validazione fallita');
            expect(res.body.details).toContainEqual({
                field: 'nome',
                message: 'non può essere vuoto'
            });
            expect(updateSpy).not.toHaveBeenCalled();
        });

        test('400: valore non ammesso in profiloDisabilita', async () => {
            const updateSpy = jest.spyOn(Cittadino, 'findByIdAndUpdate');

            const res = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${tokenCittadino}`)
                .send({ profiloDisabilita: ['sediaARotelle', 'volare'] });

            expect(res.status).toBe(400);
            expect(res.body.details[0]).toMatchObject({
                field: 'profiloDisabilita',
                message: expect.stringContaining('volare')
            });
            expect(updateSpy).not.toHaveBeenCalled();
        });

        test('400: ValidationError di Mongoose (seconda linea di difesa)', async () =>{

            jest.spyOn(Cittadino, 'findByIdAndUpdate').mockImplementation(() => {
                const err = new Error('ValidationError');
                err.name = 'ValidationError';
                err.errors = {
                    nome: { path: 'nome', message: 'campo nome obbligatorio' }
                };
                return Promise.reject(err);
            });

            const res = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${tokenCittadino}`)
                .send({ nome: 'Mario' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validazione fallita');
            expect(res.body.details).toContainEqual({
                field: 'nome',
                message: 'campo nome obbligatorio'
            });
        });

        test('403: proprietario tenta di modificare profiloDisabilita (campo cittadino-only)', async () =>{
            const updateSpy = jest.spyOn(Proprietario, 'findByIdAndUpdate');

            const res = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${tokenProprietario}`)
                .send({ profiloDisabilita: ['sediaARotelle'] });

            expect(res.status).toBe(403);
            expect(res.body.error).toContain('profiloDisabilita');
            //il check di ruolo precede la scrittura: nessun update
            expect(updateSpy).not.toHaveBeenCalled();
        });

        test('401: token mancante. verifyToken blocca, nessun update', async () =>{
            const updateSpy = jest.spyOn(Cittadino, 'findByIdAndUpdate');

            const res = await request(app)
                .patch('/api/v1/users/me')
                .send({ nome: 'Mario' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Token mancante');
            expect(updateSpy).not.toHaveBeenCalled();
        });

        test('404: token valido ma utente inesistente (findByIdAndUpdate -> null)', async () =>{

            jest.spyOn(Cittadino, 'findByIdAndUpdate').mockResolvedValue(null);

            const res = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${jwt.sign(
                    { userId: GHOST_ID, ruolo: 'cittadino' },
                    process.env.JWT_SECRET, { expiresIn: '2h' }
                )}`)
                .send({ nome: 'Mario' });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Utente non trovato');
        });
    });
});