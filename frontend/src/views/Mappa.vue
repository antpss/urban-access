<template>
  <div ref="mapContainer" class="w-full h-full"></div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; //carica la grafica dei pulsanti della mappa


import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { authFetch } from '../services/auth';
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl });
const API_BASE_URL = '/api/v1';

const props = defineProps({
  categoria: {
    type: String,
    default: ''
  }
});

const mapContainer = ref(null);
let map = null;
let markersLayer = null;

function creaIconaCustom(tipo) {
  const colore = tipo === 'pubblica' ? '#0ea5e9' : '#f97316';
  const svgPin = `
    <svg width="28" height="42" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 36 12 36C12 36 24 21 24 12C24 5.37 18.63 0 12 0Z" 
            fill="${colore}" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `;
  return L.divIcon({
    className: 'marker-custom',
    html: svgPin,
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -38]
  });
}

//funzione che scarica i dati dal backend e li visualizza su mappa
async function caricaSegnalazioni() {
  try {
    // calcola bbox dalla viewport corrente della mappa
    const bounds = map.getBounds();
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    const bbox = `${southWest.lng},${southWest.lat},${northEast.lng},${northEast.lat}`;

    const baseParams = { bbox, stato: 'APERTA' };

    let scope = '';
    let categoriaValue = '';
    if (props.categoria) {
      [scope, categoriaValue] = props.categoria.split(':');
    }

    const paramsPublic = new URLSearchParams(baseParams);
    const paramsPrivate = new URLSearchParams(baseParams);

    let chiamaPublic = true;
    let chiamaPrivate = true;


    if(scope === 'pubblica'){
      paramsPublic.set('categoria', categoriaValue);
      chiamaPrivate = false; // nessuna privata può corrispondere
    } 
    else if(scope === 'privata'){
      paramsPrivate.set('categoria', categoriaValue);
      chiamaPublic = false;
    }


    const richieste = [
      chiamaPublic  ? authFetch(`${API_BASE_URL}/publicReports?${paramsPublic}`)  : Promise.resolve(null),
      chiamaPrivate ? authFetch(`${API_BASE_URL}/privateReports?${paramsPrivate}`) : Promise.resolve(null),
    ];

    const [resPublic, resPrivate] = await Promise.all(richieste);

    if (resPublic && !resPublic.ok) {
      console.error('Errore API publicReports:', resPublic.status, await resPublic.text());
      return;
    }
    if (resPrivate && !resPrivate.ok) {
      console.error('Errore API privateReports:', resPrivate.status, await resPrivate.text());
      return;
    }
    
    const dataPublic = resPublic ? await resPublic.json() : { segnalazioni: [] };
    const dataPrivate = resPrivate ? await resPrivate.json() : { segnalazioni: [] };


    // fusione dei risultati delle due queries in un unico array
    const segnalazioni = [...dataPublic.segnalazioni, ...dataPrivate.segnalazioni];

    markersLayer.clearLayers();
    
    //si cicla sui dati ricevuti da mongodb
    segnalazioni.forEach(seg => {
      const [lng, lat] = seg.geolocalizzazione.coordinates;
      
      //creiamo il marker e attacchiamo il popup con la descrizione della barriera
      L.marker([lat, lng], { icon: creaIconaCustom(seg.tipo) })
        .bindPopup(`<b>${seg.categoria}</b><br>${seg.descrizione}`, {
          className: 'popup-moderno',
          closeButton: false,
          maxWidth: 280
        })
        .addTo(markersLayer);

    });
  } catch (err) {
    console.error("Errore scaricamento segnalazioni:", err);
  }
}

defineExpose({ refresh: caricaSegnalazioni });

watch(() => props.categoria, () => {
  if (map) caricaSegnalazioni();
});


onMounted(() => {
  // inizializzazione mappa su Trento
  map = L.map(mapContainer.value, {
    zoomControl: false
  }).setView([46.0667, 11.1167], 14);

  //sfondo di openstreetmap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors, © CARTO'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // ad ogni movimento della mappa ricarica le segnalazioni visibili in quella viewport
  map.on('moveend', caricaSegnalazioni);

  caricaSegnalazioni();
});
</script>