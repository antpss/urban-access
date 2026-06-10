//Test suite US23
//PATCH /api/v1/admin/privateReports/:id

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../app');

const Segnalazione = require('../models/Segnalazione');
const StrutturaPrivata = require('../models/StrutturaPrivata');

const OPERATORE_ID = '65a3f4e7b8d9c1f4a2e5b6c7';
const CITIZEN_ID = '65a3f4e7b8d9c1f4a2e5b6c8';
const VALID_REPORT_ID = '6a208fa89bb994923937f27f';
const STRUTTURA_ID = '65b4f4e7b8d9c1f4a2e5b6a9';


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

//motivazione valida riutilizzabile (>= 10 caratteri dopo trim)
const MOTIVAZIONE_VALIDA = 'Segnalazione fondata ignorata dal proprietario, verificata sul posto';

describe('PATCH /api/v1/admin/privateReports/:id - US23 Forzatura stato', () => {

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    //documento privata fittizio con save() mockato. Permette di ispezionare
    //le mutazioni in-memory (stato, visibile, motivazioneForzatura, _forzaturaOperatore)
    //prima del save.
    const fakePrivataDoc = (overrides = {}) => ({
        _id: VALID_REPORT_ID,
        tipo: 'privata',
        stato: 'IN_VERIFICA',
        visibile: true,
        scoreAssociato: 3,
        sogliaValidazione: 10,
        strutturaAssociata: STRUTTURA_ID,
        motivazioneForzatura: null,
        save: jest.fn().mockResolvedValue(true),
        ...overrides
    });

    //AUTORIZZAZIONE
    test('401: nessun token', async () => {
        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .send({ stato: 'APERTA', motivazione: MOTIVAZIONE_VALIDA });
        expect(res.status).toBe(401);
    });

    test('403: token di un cittadino (ruolo non operatore), il DB non viene toccato', async () => {
        const findOneSpy = jest.spyOn(Segnalazione, 'findOne');
        const incSpy = jest.spyOn(StrutturaPrivata, 'findByIdAndUpdate');

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenCittadino}`)
            .send({ stato: 'APERTA', motivazione: MOTIVAZIONE_VALIDA });

        expect(res.status).toBe(403);
        expect(findOneSpy).not.toHaveBeenCalled();
        expect(incSpy).not.toHaveBeenCalled();
    });

    //VALIDAZIONE INPUT

    test('400: id non è un ObjectId valido, il DB non viene toccato', async () => {
        const findOneSpy = jest.spyOn(Segnalazione, 'findOne');
        const incSpy = jest.spyOn(StrutturaPrivata, 'findByIdAndUpdate');

        const res = await request(app)
            .patch('/api/v1/admin/privateReports/id-invalido')
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'APERTA', motivazione: MOTIVAZIONE_VALIDA });

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('id');
        expect(findOneSpy).not.toHaveBeenCalled();
        expect(incSpy).not.toHaveBeenCalled();
    });

    test('400: stato fuori whitelist (es. IN_VERIFICA), DB non toccato', async () => {
        const findOneSpy = jest.spyOn(Segnalazione, 'findOne');

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'IN_VERIFICA', motivazione: MOTIVAZIONE_VALIDA });

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('stato');
        expect(findOneSpy).not.toHaveBeenCalled();
    });

    test('400: stato mancante, DB non toccato', async () => {
        const findOneSpy = jest.spyOn(Segnalazione, 'findOne');

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ motivazione: MOTIVAZIONE_VALIDA });

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('stato');
        expect(findOneSpy).not.toHaveBeenCalled();
    });

    test('400: motivazione mancante, DB non toccato', async () => {
        const findOneSpy = jest.spyOn(Segnalazione, 'findOne');

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'APERTA' });

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('motivazione');
        expect(findOneSpy).not.toHaveBeenCalled();
    });

    test('400: motivazione troppo corta (< 10 char dopo trim), DB non toccato', async () => {
        const findOneSpy = jest.spyOn(Segnalazione, 'findOne');

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'APERTA', motivazione: '   corta   ' }); // trim -> "corta" = 5 char

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('motivazione');
        expect(findOneSpy).not.toHaveBeenCalled();
    });

    //NOT FOUND

    test('404: segnalazione privata non trovata (id pubblico o inesistente)', async () => {
        jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(null);
        const incSpy = jest.spyOn(StrutturaPrivata, 'findByIdAndUpdate');

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'APERTA', motivazione: MOTIVAZIONE_VALIDA });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Segnalazione privata non trovata');
        //struttura mai incrementata se la segnalazione non esiste
        expect(incSpy).not.toHaveBeenCalled();
    });

    test('404: la query findOne filtra per tipo privata', async () => {
        const findOneSpy = jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(null);

        await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'APERTA', motivazione: MOTIVAZIONE_VALIDA });

        //invariante di scope: deve interrogare solo le private
        expect(findOneSpy).toHaveBeenCalledWith({ _id: VALID_REPORT_ID, tipo: 'privata' });
    });



    test('200: forza ad APERTA -> visibile=true, flag bypass settato, save chiamato, struttura incrementata', async () => {
        const mockDoc = fakePrivataDoc();
        jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(mockDoc);
        const incSpy = jest.spyOn(StrutturaPrivata, 'findByIdAndUpdate').mockResolvedValue({});

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'APERTA', motivazione: MOTIVAZIONE_VALIDA });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Stato della segnalazione modificato con successo');


        expect(mockDoc.stato).toBe('APERTA');
        expect(mockDoc.visibile).toBe(true);
        expect(mockDoc.motivazioneForzatura).toBe(MOTIVAZIONE_VALIDA);
        expect(mockDoc._forzaturaOperatore).toBe(true);
        expect(mockDoc.save).toHaveBeenCalled();

        expect(incSpy).toHaveBeenCalledWith(
            STRUTTURA_ID,
            { $inc: { numForzature: 1 } }
        );
    });



    test('200: forza ad ARCHIVIATA -> visibile=false', async () => {
        const mockDoc = fakePrivataDoc({ visibile: true });
        jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(mockDoc);
        jest.spyOn(StrutturaPrivata, 'findByIdAndUpdate').mockResolvedValue({});

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'ARCHIVIATA', motivazione: MOTIVAZIONE_VALIDA });

        expect(res.status).toBe(200);
        expect(mockDoc.stato).toBe('ARCHIVIATA');
        expect(mockDoc.visibile).toBe(false);
    });

    test('200: forza a RISOLTA -> visibile=false', async () => {
        const mockDoc = fakePrivataDoc({ visibile: true });
        jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(mockDoc);
        jest.spyOn(StrutturaPrivata, 'findByIdAndUpdate').mockResolvedValue({});

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'RISOLTA', motivazione: MOTIVAZIONE_VALIDA });

        expect(res.status).toBe(200);
        expect(mockDoc.stato).toBe('RISOLTA');
        expect(mockDoc.visibile).toBe(false);
    });

    test('200: motivazione viene trimmata prima del salvataggio', async () => {
        const mockDoc = fakePrivataDoc();
        jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(mockDoc);
        jest.spyOn(StrutturaPrivata, 'findByIdAndUpdate').mockResolvedValue({});

        await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'APERTA', motivazione: `   ${MOTIVAZIONE_VALIDA}   ` });

        expect(mockDoc.motivazioneForzatura).toBe(MOTIVAZIONE_VALIDA);
    });

    //ERRORI A VALLE

    test('400: ValidationError di Mongoose al save() gestito', async () => {
        const mockDoc = fakePrivataDoc({
            save: jest.fn().mockImplementation(() => {
                const err = new Error('ValidationError');
                err.name = 'ValidationError';
                err.errors = { stato: { path: 'stato', message: 'transizione non valida' } };
                return Promise.reject(err);
            })
        });
        jest.spyOn(Segnalazione, 'findOne').mockResolvedValue(mockDoc);
        const incSpy = jest.spyOn(StrutturaPrivata, 'findByIdAndUpdate');

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'APERTA', motivazione: MOTIVAZIONE_VALIDA });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validazione fallita');
        expect(res.body.details).toContainEqual({ field: 'stato', message: 'transizione non valida' });
        expect(incSpy).not.toHaveBeenCalled();
    });

    test('500: errore generico del DB gestito', async () => {
        jest.spyOn(Segnalazione, 'findOne').mockRejectedValue(new Error('DB down'));

        const res = await request(app)
            .patch(`/api/v1/admin/privateReports/${VALID_REPORT_ID}`)
            .set('Authorization', `Bearer ${tokenOperatore}`)
            .send({ stato: 'APERTA', motivazione: MOTIVAZIONE_VALIDA });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Errore interno del server');
    });
});