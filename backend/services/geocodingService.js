const {NOMINATIM_BASE_URL, NOMINATIM_USER_AGENT, GEO_VIEWBOX} = require('../config/routing');

// funzione che traduce un indirizzo testuale in coordinate geografiche usando Nominatim (OpenStreetMap)
// il campo ritornato è sempre un array, nel caso peggiore vuoto.
// temporaneamente limita ai risultati all'interno del Trentino Alto Adige.
async function geocode(query, limit = 5) {
    const [minLng, minLat, maxLng, maxLat] = GEO_VIEWBOX;

    const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: String(limit),
        addressdetails: '1',
        viewbox: `${minLng},${maxLat},${maxLng},${minLat}`,
        bounded: '1'
    });

    const url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`;

    const response = await fetch(url, {
        headers: {'User-Agent': NOMINATIM_USER_AGENT}
    });

    if (!response.ok) {
        const err = new Error(`risposta Nominatim: ${response.status}`);
        err.statusCode = 502; // bad gateway: il problema è il servizio esterno
        throw err;
    }

    const data = await response.json();
    return data.map(item => ({
        label: item.display_name,
        lng: parseFloat(item.lon),
        lat: parseFloat(item.lat)
    }))

}

module.exports = {geocode};