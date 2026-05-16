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
      L.marker([lat, lng])
        .bindPopup(`<b>${seg.categoria}</b><br>${seg.descrizione}`)
        .addTo(map);
    });
  } catch (err) {
    console.error("Errore scaricamento segnalazioni:", err);
  }
}


onMounted(() => {
  // inizializzazione mappa su Trento
  map = L.map(mapContainer.value, {
    zoomControl: false
  }).setView([46.0667, 11.1167], 14);

  //sfondo di openstreetmap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors, © CARTO'
  }).addTo(map);

  caricaSegnalazioni();
});
</script>