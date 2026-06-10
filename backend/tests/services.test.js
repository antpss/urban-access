//differentemente da routing.test.js qui viene testata la logica interna
//dei service: parsing della geometria GeoJSON di OpenRouteService, mappatura
//errori ORS, conversione ostacoli->avoid_polygons, normalizzazione output
//Nominatim e costruzione query.

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

//routingService.calculateRoute
describe('routingService.calculateRoute', () => {
 
    const origin = { lng: 11.1211, lat: 46.0667 };
    const destination = { lng: 11.1214267, lat: 46.0673519 };

    //risposta GeoJSON tipica di OpenRouteService (/v2/directions/<profilo>/geojson):
    //FeatureCollection con una Feature LineString. Coordinate già decodificate in [lng, lat].
    //distance in METRI, duration in SECONDI dentro properties.summary.
    const orsGeoJSON = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [[11.121115, 46.066743], [11.121305, 46.0673]]
            },
            properties: { summary: { distance: 79, duration: 56 } }
        }]
    };
 
    test('risposta valida: estrae la geometria GeoJSON e normalizza distanza/durata', async () => {
        fetchSpy = jest.spyOn(global, 'fetch')
            .mockResolvedValue(mockResponse({ ok: true, jsonBody: orsGeoJSON }));
 
        const result = await routingService.calculateRoute(origin, destination, []);

        expect(result.geometry.type).toBe('LineString');
        expect(Array.isArray(result.geometry.coordinates)).toBe(true);
        expect(result.geometry.coordinates.length).toBeGreaterThan(0);
 
        const [lng, lat] = result.geometry.coordinates[0];
        expect(lng).toBeGreaterThan(11.0);
        expect(lng).toBeLessThan(11.3);
        expect(lat).toBeGreaterThan(46.0);
        expect(lat).toBeLessThan(46.2);

        //ors da già metri/secondi
        expect(result.distance).toBe(79);
        expect(result.duration).toBe(56);
    });
 
    test('costruisce il body con coordinates [lng,lat] e header Authorization', async () => {
        fetchSpy = jest.spyOn(global, 'fetch')
            .mockResolvedValue(mockResponse({ ok: true, jsonBody: orsGeoJSON }));
 
        await routingService.calculateRoute(origin, destination, []);
 
        //ispeziona url + body inviati a ors
        const [url, options] = fetchSpy.mock.calls[0];
        const body = JSON.parse(options.body);

        //ors vuole coordinates in ordine GeoJSON [lng, lat]
        expect(body.coordinates[0]).toEqual([11.1211, 46.0667]);
        expect(body.coordinates[1]).toEqual([11.1214267, 46.0673519]);
        //senza ostacoli non deve esserci options.avoid_polygons
        expect(body.options).toBeUndefined();
        //endpoint GeoJSON e header di autenticazione presenti
        expect(url).toContain('/geojson');
        expect(options.headers.Authorization).toBeDefined();
    });

    test('con ostacoli: li converte in avoid_polygons (MultiPolygon)', async () => {
        fetchSpy = jest.spyOn(global, 'fetch')
            .mockResolvedValue(mockResponse({ ok: true, jsonBody: orsGeoJSON }));

        const ostacoli = [{ lng: 11.1219, lat: 46.0671 }];
        await routingService.calculateRoute(origin, destination, ostacoli);

        const [, options] = fetchSpy.mock.calls[0];
        const body = JSON.parse(options.body);

        expect(body.options.avoid_polygons.type).toBe('MultiPolygon');
        //un ostacolo e' un poligono
        const poligoni = body.options.avoid_polygons.coordinates;
        expect(poligoni).toHaveLength(1);
        const anello = poligoni[0][0];
        expect(anello).toHaveLength(5);
        expect(anello[0]).toEqual(anello[4]);
    });
 
    test('error.code ORS di "no path" (2009). Errore con statusCode 422', async () => {
        fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
            mockResponse({ ok: false, status: 404, textBody: JSON.stringify({ error: { code: 2009 } }) })
        );
 
        await expect(routingService.calculateRoute(origin, destination, []))
            .rejects.toMatchObject({ statusCode: 422 });
    });

    test('error.code ORS "point not found" (2010). Errore con statusCode 422', async () => {
        fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
            mockResponse({ ok: false, status: 404, textBody: JSON.stringify({ error: { code: 2010 } }) })
        );
 
        await expect(routingService.calculateRoute(origin, destination, []))
            .rejects.toMatchObject({ statusCode: 422 });
    });
 
    test('errore ORS non riconducibile a "no path" (es. 403 quota). StatusCode 502', async () => {
        fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
            mockResponse({ ok: false, status: 403, textBody: JSON.stringify({ error: { code: 9999 } }) })
        );
 
        await expect(routingService.calculateRoute(origin, destination, []))
            .rejects.toMatchObject({ statusCode: 502 });
    });
 
    test('fetch lancia (ORS irraggiungibile). StatusCode 502', async () => {
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