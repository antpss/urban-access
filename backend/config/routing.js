// posizione di Trento Centro hardcoded da sostituire in futuro con geolocalizzazione utente
const POS_TRENTO = [11.1211, 46.0667];

module.exports = {
    POS_TRENTO,
    VALHALLA_BASE_URL: process.env.VALHALLA_BASE_URL || 'http://localhost:8002',
    NOMINATIM_BASE_URL: process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org',
    NOMINATIM_USER_AGENT: process.env.NOMINATIM_USER_AGENT || 'UrbanAccess/1.0',
    COSTING: 'pedestrian',

    // bounding box per limitare le ricerche geografiche a Trentino Alto Adige
    // formato: [min_lon, min_lat, max_lon, max_lat]
    GEO_VIEWBOX: [10.45, 45.67, 11.96, 46.54]
}