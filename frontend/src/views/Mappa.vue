<template>
  <div ref="mapContainer" class="w-full h-full"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; //carica la grafica dei pulsanti della mappa


import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { authFetch } from '../services/auth';
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl });

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

    //chiamata
    const response = await authFetch(`/api/v1/reports?bbox=${bbox}&stato=APERTA`);

    if (!response.ok) {
      console.error('Errore API:', response.status, await response.text());
      return;
    }
    
    const data = await response.json();
    
    //si cicla sui dati ricevuti da mongodb
    data.segnalazioni.forEach(seg => {
      //mongodb [lng, lat] 
      //leaflet [lat, lng]!!!!!!
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