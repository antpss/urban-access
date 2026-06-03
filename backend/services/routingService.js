const {VALHALLA_BASE_URL, COSTING, CATEGORIA_PROFILI_INCOMPATIBILI, STATI_ATTIVI} = require('../config/routing');
const Segnalazione = require('../models/Segnalazione');

// codici Valhalla che indicano un percorso non calcolabile
// fonte: documentazione ufficiale
const VALHALLA_NO_PATH_CODES = [154, 170, 171, 442];


//recupera dal db le segnalazioni attive che sono incompatibili con il profilo disabilita del cittadino all'interno della bounding box definita tra l'origine e la destinazione
async function getOstacoliIncompatibili(profiloDisabilita, origin, destination) {
  if (!profiloDisabilita || profiloDisabilita.length === 0) return [];

  //categorie che bloccano almeno uno dei profili del cittadino
  const categorieIncompatibili = Object.entries(CATEGORIA_PROFILI_INCOMPATIBILI)
    .filter(([, profiliBloccati]) =>
      profiliBloccati.some(p => profiloDisabilita.includes(p))
    )
    .map(([categoria]) => categoria);

  if (categorieIncompatibili.length === 0) return [];

  //bounding box che contiene sia l'origine che la destinazione
  //con un margine di circa 200m (circa 0.002 gradi) per vedere ostacoli anche ai bordi del percorso
  const MARGIN = 0.002;
  const minLng = Math.min(origin.lng, destination.lng) - MARGIN;
  const minLat = Math.min(origin.lat, destination.lat) - MARGIN;
  const maxLng = Math.max(origin.lng, destination.lng) + MARGIN;
  const maxLat = Math.max(origin.lat, destination.lat) + MARGIN;

  //query a mongodb con $geoWithin
  const segnalazioni = await Segnalazione.find({
    categoria:        { $in: categorieIncompatibili },
    stato:            { $in: STATI_ATTIVI },

    //per le private include solo quelle attive che sono state valiidate dalla community
    //quelle pubbliche invece le include tutte
    $or: [
      { tipo: 'pubblica' },
      { tipo: 'privata', visibile: true },
    ],
    geolocalizzazione: {
      $geoWithin: {
        $box: [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
      },
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

// calcola un percorso pedonale tra due punti usando Valhalla
// origine e destinazione hanno formato {lng, lat}
async function calculateRoute(origin, destination, ostacoli) {
    const body = {
        locations: [
            {lon: origin.lng, lat: origin.lat},
            {lon: destination.lng, lat: destination.lat}
        ],
        costing: COSTING,
        directions_options: {units: 'kilometers'}
    };


    if (ostacoli.length > 0) {
        body.exclude_locations = ostacoli.map(o => ({ lon: o.lng, lat: o.lat }));
    }

    const url = `${VALHALLA_BASE_URL}/route`;

    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
    } catch (networkErr) {
        // errore se Valhalla non è raggiungibile
        console.error('[Valhalla unreachable]', networkErr.message);
        const err = new Error('Servizio di routing irraggiungibile');
        err.statusCode = 502;
        throw err;
    }

    if (!response.ok) {
        const errBody = await response.text();
        console.error('[Valhalla error body]', errBody);

        let parsed = {};
        try { parsed = JSON.parse(errBody); } catch (_) { /* corpo non-JSON */ }

        // map di qualsiasi codice relativo a percroso non esistente con codice 422
        if (VALHALLA_NO_PATH_CODES.includes(parsed.error_code)) {
            const err = new Error('Nessun percorso pedonale verso la destinazione');
            err.statusCode = 422;
            err.valhallaCode = parsed.error_code;
            throw err;
        }

        // Qualsiasi altro errore HTTP da Valhalla: lo trattiamo come guasto del servizio.
        const err = new Error(`risposta Valhalla: ${response.status}`);
        err.statusCode = 502;
        throw err;
    }

    const data = await response.json();

    if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) {
        const err = new Error('Valhalla non ha prodotto un percorso valido');
        err.statusCode = 502;
        throw err;
    }

    // decodifica polyline restituita da Valhalla in array di coordinate
    const leg = data.trip.legs[0];
    const coordinates = decodePolyline6(leg.shape);

    return {
        geometry: {
            type: 'LineString',
            coordinates
        },
        distance: Math.round(data.trip.summary.length * 1000),
        duration: Math.round(data.trip.summary.time)
    };
}

// decoder polyline Valhalla
function decodePolyline6(encoded) {
    const coords = [];
    let index = 0, lat = 0, lng = 0;
    const factor = 1e6;

    while (index < encoded.length) {
        let shift = 0, result = 0, byte;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        shift = 0; result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        coords.push([lng / factor, lat / factor]);
    }
    return coords;
}

module.exports = { calculateRoute, getOstacoliIncompatibili };