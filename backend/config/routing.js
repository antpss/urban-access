// posizione di Trento Centro hardcoded da sostituire in futuro con geolocalizzazione utente
const POS_TRENTO = [11.1211, 46.0667];

//mapping della categoria segnalazione agli array di profili disabilità incompatibili (US11)
const CATEGORIA_PROFILI_INCOMPATIBILI ={
  
  //segnalazioni pubbliche
  marciapiede_rotto:         ['sediaARotelle', 'ausilioDeambulazione'],
  pavimentazione_dissestata: ['sediaARotelle', 'ausilioDeambulazione'],
  scalino_non_segnalato:     ['sediaARotelle', 'ausilioDeambulazione', 'cecita'],
  mancanza_rampa:            ['sediaARotelle', 'ausilioDeambulazione'],
  ostacolo_temporaneo:       ['sediaARotelle', 'cecita'],
  auto_sosta_vietata:        ['sediaARotelle', 'cecita'],
  semaforo_non_accessibile:  ['cecita'],
  altro:                     [], //troppo generico per bloccare automaticamente

  //segnalazioni private
  bagno_non_accessibile:     [],//non costituisce barriera al percorso pedonale
  ascensore_guasto:          ['sediaARotelle', 'ausilioDeambulazione'],
  spazi_interni_stretti:     ['sediaARotelle'],
};

const STATI_ATTIVI = ['APERTA', 'IN_VERIFICA', 'PRESA_IN_CARICO'];

module.exports = {
    POS_TRENTO,
    VALHALLA_BASE_URL: process.env.VALHALLA_BASE_URL || 'http://localhost:8002',
    NOMINATIM_BASE_URL: process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org',
    NOMINATIM_USER_AGENT: process.env.NOMINATIM_USER_AGENT || 'UrbanAccess/1.0',
    COSTING: 'pedestrian',

    // bounding box per limitare le ricerche geografiche a Trentino Alto Adige
    // formato: [min_lon, min_lat, max_lon, max_lat]
    GEO_VIEWBOX: [10.45, 45.67, 11.96, 46.54],

    CATEGORIA_PROFILI_INCOMPATIBILI,
    STATI_ATTIVI,
}