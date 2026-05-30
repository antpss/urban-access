const {VALHALLA_BASE_URL, COSTING} = require('../config/routing');

// codici Valhalla che indicano un percorso non calcolabile
// fonte: documentazione ufficiale
const VALHALLA_NO_PATH_CODES = [154, 170, 171, 442];  

// calcola un percorso pedonale tra due punti usando Valhalla
// origine e destinazione hanno formato {lng, lat}
async function calculateRoute(origin, destination) {
    const body = {
        locations: [
            {lon: origin.lng, lat: origin.lat},
            {lon: destination.lng, lat: destination.lat}
        ],
        costing: COSTING,
        directions_options: {units: 'kilometers'}
    };

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

module.exports = {calculateRoute};