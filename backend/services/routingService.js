const { ORS_BASE_URL, ORS_API_KEY, ORS_PROFILE, CATEGORIA_PROFILI_INCOMPATIBILI, STATI_ATTIVI } = require('../config/routing');
const Segnalazione = require('../models/Segnalazione');

// raggio (in gradi) del poligono di esclusione costruito attorno a ogni ostacolo.
// ~0.00015 gradi ≈ 15-17 m: abbastanza per forzare ORS a deviare dall'arco
// senza chiudere interi quartieri. Valore di dominio, regolabile.
const AVOID_RADIUS = 0.00015;

if (!ORS_API_KEY) {
    const err = new Error('ORS_API_KEY non configurata');
    err.statusCode = 500;
    throw err;
}

//INVARIATA rispetto alla versione Valhalla: logica DB pura, indipendente dal motore.
async function getOstacoliIncompatibili(profiloDisabilita, origin, destination) {
  if (!profiloDisabilita || profiloDisabilita.length === 0) return [];

  const categorieIncompatibili = Object.entries(CATEGORIA_PROFILI_INCOMPATIBILI)
    .filter(([, profiliBloccati]) =>
      profiliBloccati.some(p => profiloDisabilita.includes(p))
    )
    .map(([categoria]) => categoria);

  if (categorieIncompatibili.length === 0) return [];

  const MARGIN = 0.002;
  const minLng = Math.min(origin.lng, destination.lng) - MARGIN;
  const minLat = Math.min(origin.lat, destination.lat) - MARGIN;
  const maxLng = Math.max(origin.lng, destination.lng) + MARGIN;
  const maxLat = Math.max(origin.lat, destination.lat) + MARGIN;

  const segnalazioni = await Segnalazione.find({
    categoria: { $in: categorieIncompatibili },
    stato:     { $in: STATI_ATTIVI },
    $or: [
      { tipo: 'pubblica' },
      { tipo: 'privata', visibile: true },
    ],
    geolocalizzazione: {
      $geoWithin: { $box: [[minLng, minLat], [maxLng, maxLat]] },
    },
  }).select('_id categoria tipo geolocalizzazione').lean();

  return segnalazioni.map(s => ({
    segnalazioneId: s._id.toString(),
    categoria:      s.categoria,
    tipo:           s.tipo,
    lng:            s.geolocalizzazione.coordinates[0],
    lat:            s.geolocalizzazione.coordinates[1],
  }));
}

// costruisce un piccolo quadrato (poligono GeoJSON) attorno a un punto.
// ORS evita AREE, non punti: ogni ostacolo Valhalla diventa un poligono qui.
function ostacoloToPolygon(o) {
  const r = AVOID_RADIUS;
  // anello chiuso (primo == ultimo vertice), ordine [lng, lat]
  return [[
    [o.lng - r, o.lat - r],
    [o.lng + r, o.lat - r],
    [o.lng + r, o.lat + r],
    [o.lng - r, o.lat + r],
    [o.lng - r, o.lat - r],
  ]];
}

// calcola un percorso pedonale tra due punti usando OpenRouteService.
// firma e formato di ritorno IDENTICI alla versione Valhalla.
async function calculateRoute(origin, destination, ostacoli) {
    const body = {
        // ORS vuole [lng, lat], stesso ordine GeoJSON
        coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
        ],
    };

    // traduzione exclude_locations (punti) -> avoid_polygons (aree)
    if (ostacoli.length > 0) {
        body.options = {
            avoid_polygons: {
                type: 'MultiPolygon',
                coordinates: ostacoli.map(ostacoloToPolygon),
            },
        };
    }

    // endpoint GeoJSON: ritorna direttamente una FeatureCollection con LineString
    const url = `${ORS_BASE_URL}/v2/directions/${ORS_PROFILE}/geojson`;

    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ORS_API_KEY,
            },
            body: JSON.stringify(body),
        });
    } catch (networkErr) {
        console.error('[ORS unreachable]', networkErr.message);
        const err = new Error('Servizio di routing irraggiungibile');
        err.statusCode = 502;
        throw err;
    }

    if (!response.ok) {
        const errBody = await response.text();
        console.error('[ORS error body]', errBody);

        let parsed = {};
        try { parsed = JSON.parse(errBody); } catch (_) { /* corpo non-JSON */ }

        // ORS: error.code 2010 (point not found) / 2009 (route not found)
        // indicano destinazione non raggiungibile -> 422, come i no-path di Valhalla
        const orsCode = parsed?.error?.code;
        if (orsCode === 2009 || orsCode === 2010 || response.status === 404) {
            const err = new Error('Nessun percorso pedonale verso la destinazione');
            err.statusCode = 422;
            err.orsCode = orsCode;
            throw err;
        }

        // qualsiasi altro errore (403 quota, 500, ecc.): guasto servizio a monte
        const err = new Error(`risposta ORS: ${response.status}`);
        err.statusCode = 502;
        throw err;
    }

    const data = await response.json();

    const feature = data?.features?.[0];
    if (!feature || !feature.geometry || !Array.isArray(feature.geometry.coordinates)) {
        const err = new Error('ORS non ha prodotto un percorso valido');
        err.statusCode = 502;
        throw err;
    }

    // ORS /geojson ritorna già la geometria decodificata in [lng, lat]: niente polyline da decodificare
    const coordinates = feature.geometry.coordinates;
    const summary = feature.properties?.summary ?? {};

    return {
        geometry: {
            type: 'LineString',
            coordinates,
        },
        // ORS dà distanza in METRI e durata in SECONDI di default: niente *1000
        distance: Math.round(summary.distance ?? 0),
        duration: Math.round(summary.duration ?? 0),
    };
}

module.exports = { calculateRoute, getOstacoliIncompatibili };