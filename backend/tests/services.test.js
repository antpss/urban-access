// differentemente da routing.test.js qui viene testata la logica interna
// dei service: decodifica della polyline, mappatura errori di Valhalla, normalizzazione di output Nominatim
// e costruzione query.

const routingService = require('../services/routingService');
const geocodingService = require('../services/geocodingService');
const Segnalazione = require('../models/Segnalazione');

function mockResponse({ ok, status = 200, jsonBody = null, textBody = '' }) {
  return {
    ok,
    status,
    json: async () => jsonBody,
    text: async () => textBody
  };
}

let fetchSpy;
let findSpy;

afterEach(() => {
  if (fetchSpy) fetchSpy.mockRestore();
  if (findSpy) findSpy.mockRestore(); 
});

// routingService.calculateRoute
describe('routingService.calculateRoute', () => {
 
    const origin = { lng: 11.1211, lat: 46.0667 };
    const destination = { lng: 11.1214267, lat: 46.0673519 };
 
    test('risposta valida: decodifica la polyline e normalizza distanza/durata', async () => {
        // shape reale restituita da Valhalla per un percorso a Trento (polyline precision 6)
        const valhallaTrip = {
            trip: {
                legs: [{ shape: 'mbuzvAu|weTSxBc@QgEZ{FXwANY_EkNiJsAL' }],
                summary: { length: 0.079, time: 56.434 }  // km, secondi
            }
        };
        fetchSpy = jest.spyOn(global, 'fetch')
            .mockResolvedValue(mockResponse({ ok: true, jsonBody: valhallaTrip }));
 
        const result = await routingService.calculateRoute(origin, destination, []);

        expect(result.geometry.type).toBe('LineString');
        expect(Array.isArray(result.geometry.coordinates)).toBe(true);
        expect(result.geometry.coordinates.length).toBeGreaterThan(0);
 
        const [lng, lat] = result.geometry.coordinates[0];
        expect(lng).toBeGreaterThan(11.0);
        expect(lng).toBeLessThan(11.3);
        expect(lat).toBeGreaterThan(46.0);
        expect(lat).toBeLessThan(46.2);

        expect(result.distance).toBe(79);
        expect(result.duration).toBe(56);
    });
 
    test('costruisce il body con lon/lat corretti (non lng) e costing pedonale', async () => {
        const valhallaTrip = {
            trip: { legs: [{ shape: '_ibE_seK' }], summary: { length: 0.001, time: 1 } }
        };
        fetchSpy = jest.spyOn(global, 'fetch')
            .mockResolvedValue(mockResponse({ ok: true, jsonBody: valhallaTrip }));
 
        await routingService.calculateRoute(origin, destination, []);
 
        // ispeziona il body inviato a Valhalla
        const [, options] = fetchSpy.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.locations[0]).toEqual({ lon: 11.1211, lat: 46.0667 });   // lon, non lng
        expect(body.locations[1]).toEqual({ lon: 11.1214267, lat: 46.0673519 });
        expect(body.costing).toBe('pedestrian');
    });
 
    test('error_code Valhalla di "no path". Errore con statusCode 422', async () => {
        fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
            mockResponse({ ok: false, status: 400, textBody: JSON.stringify({ error_code: 442 }) })
        );
 
        await expect(routingService.calculateRoute(origin, destination, []))
            .rejects.toMatchObject({ statusCode: 422 });
    });
 
    test('errore Valhalla non riconducibile a "no path". StatusCode 502', async () => {
        fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
            mockResponse({ ok: false, status: 500, textBody: JSON.stringify({ error_code: 599 }) })
        );
 
        await expect(routingService.calculateRoute(origin, destination, []))
            .rejects.toMatchObject({ statusCode: 502 });
    });
 
    test('fetch lancia (Valhalla irraggiungibile). StatusCode 502', async () => {
        fetchSpy = jest.spyOn(global, 'fetch')
            .mockRejectedValue(new Error('ECONNREFUSED'));
 
        await expect(routingService.calculateRoute(origin, destination, []))
            .rejects.toMatchObject({ statusCode: 502 });
    });
});


describe('routingService.getOstacoliIncompatibili', () => {
    const origin = { lng: 11.1211, lat: 46.0667 };
    const destination = { lng: 11.1214267, lat: 46.0673519 };

    test('profilo vuoto: ritorna [] e non interroga il DB', async () => {
        findSpy = jest.spyOn(Segnalazione, 'find');

        const result = await routingService.getOstacoliIncompatibili([], origin, destination);

        expect(result).toEqual([]);
        expect(findSpy).not.toHaveBeenCalled();
    });

    test('nessuna categoria incompatibile: ritorna [] e non interroga il DB', async () => {
        findSpy = jest.spyOn(Segnalazione, 'find');

        const result = await routingService.getOstacoliIncompatibili(
        ['profiloInventatoCheNonMappaNulla'],
        origin,
        destination
        );

        expect(result).toEqual([]);
        expect(findSpy).not.toHaveBeenCalled();
    });

    test('trova segnalazioni incompatibili nella bbox e le normalizza', async () => {
        const segnalazioniFake = [
        {
            _id: { toString: () => '665f0c8b2c4d1a001234abcd' },
            categoria: 'mancanza_rampa',
            tipo: 'pubblica',
            geolocalizzazione: {
            type: 'Point',
            coordinates: [11.1219, 46.0671]
            }
        },
        {
            _id: { toString: () => '665f0c8b2c4d1a001234abce' },
            categoria: 'ascensore_guasto',
            tipo: 'privata',
            geolocalizzazione: {
            type: 'Point',
            coordinates: [11.1222, 46.0673]
            }
        }
        ];

        const leanFn = jest.fn().mockResolvedValue(segnalazioniFake);
        const selectFn = jest.fn().mockReturnValue({ lean: leanFn });

        findSpy = jest.spyOn(Segnalazione, 'find').mockReturnValue({
        select: selectFn
        });

        const result = await routingService.getOstacoliIncompatibili(
        ['sediaARotelle', 'cecita'],
        origin,
        destination
        );

        expect(findSpy).toHaveBeenCalled();

        const queryArg = findSpy.mock.calls[0][0];
        expect(queryArg).toMatchObject({
        categoria: { $in: expect.any(Array) },
        stato: { $in: expect.any(Array) },
        $or: [
            { tipo: 'pubblica' },
            { tipo: 'privata', visibile: true }
        ]
        });

        expect(queryArg.geolocalizzazione.$geoWithin.$box).toHaveLength(2);
        expect(selectFn).toHaveBeenCalledWith('_id categoria tipo geolocalizzazione');

        expect(result).toEqual([
        {
            segnalazioneId: '665f0c8b2c4d1a001234abcd',
            categoria: 'mancanza_rampa',
            tipo: 'pubblica',
            lng: 11.1219,
            lat: 46.0671
        },
        {
            segnalazioneId: '665f0c8b2c4d1a001234abce',
            categoria: 'ascensore_guasto',
            tipo: 'privata',
            lng: 11.1222,
            lat: 46.0673
        }
        ]);
    });
});

// geocodingService.geocode
describe('geocodingService.geocode', () => {
 
    test('nessun risultato da Nominatim. Array vuoto (non un errore)', async () => {
        fetchSpy = jest.spyOn(global, 'fetch')
            .mockResolvedValue(mockResponse({ ok: true, jsonBody: [] }));
 
        const result = await geocodingService.geocode('luogo inesistente xyz');
        expect(result).toEqual([]);
    });
 
    test('Nominatim risponde non ok. Errore con statusCode 502', async () => {
        fetchSpy = jest.spyOn(global, 'fetch')
            .mockResolvedValue(mockResponse({ ok: false, status: 503 }));
 
        await expect(geocodingService.geocode('Trento'))
            .rejects.toMatchObject({ statusCode: 502 });
    });
 
    test('fetch lancia (Nominatim irraggiungibile). StatusCode 502', async () => {
        fetchSpy = jest.spyOn(global, 'fetch')
            .mockRejectedValue(new Error('ECONNREFUSED'));
 
        await expect(geocodingService.geocode('Trento'))
            .rejects.toMatchObject({ statusCode: 502 });
    });
});