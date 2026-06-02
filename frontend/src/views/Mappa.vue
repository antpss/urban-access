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

// origine hardcoded in attesa della geolocalizzazione reale
const ORIGIN_LATLNG = [46.0667, 11.1211];

const mapContainer = ref(null);
let map = null;
let markersLayer = null;

// layer dedicati al routing, separati dai marker delle segnalazioni
let routeLayer = null;
let originMarker = null;
let destMarker = null;

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

function creaIconaOrigine() {
  return L.divIcon({
    className: 'origin-dot-wrapper',
    html: `<div class="origin-dot"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
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

    const params = new URLSearchParams({bbox, stato: 'APERTA'});

    // chiamata parallela per i due endpoint
    const [resPublic, resPrivate] = await Promise.all([
      authFetch(`${API_BASE_URL}/publicReports?${params}`),
      authFetch(`${API_BASE_URL}/privateReports?${params}`)
    ]);

    if (!resPublic.ok) {
      console.error('Errore API publicReports:', resPublic.status, await resPublic.text());
      return;
    }
    if (!resPrivate.ok) {
      console.error('Errore API privateReports:', resPrivate.status, await resPrivate.text());
      return;
    }
    
    const [dataPublic, dataPrivate] = await Promise.all([
      resPublic.json(),
      resPrivate.json()
    ]); 

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

// disegna il percorso sulla mappa
function drawRoute(routeData, destination) {
  clearRoute();
 
  // marker destinazione (riusa lo stile pin pubblica)
  destMarker = L.marker([destination.lat, destination.lng], {
    icon: creaIconaCustom('pubblica')
  });
  if (destination.label) {
    destMarker.bindPopup(`<b>Destinazione</b>${destination.label}`, {
      className: 'popup-moderno', closeButton: false, maxWidth: 280
    });
  }
  destMarker.addTo(map);
 
  const latlngs = routeData.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
 
  const line = L.polyline([], {
    color: '#10b981', weight: 6, opacity: 0.9, lineJoin: 'round', lineCap: 'round'
  }).addTo(map);
  routeLayer = line;
 
  let i = 0;
  const step = Math.max(1, Math.floor(latlngs.length / 60)); // ~60 frame max
  const timer = setInterval(() => {
    i += step;
    line.setLatLngs(latlngs.slice(0, i));
    if (i >= latlngs.length) {
      line.setLatLngs(latlngs);
      clearInterval(timer);
    }
  }, 16);
 
  // zoom su origine e destinazione nella stessa vista
  const fitBounds = L.latLngBounds([ORIGIN_LATLNG, [destination.lat, destination.lng]]);
  map.fitBounds(fitBounds, { padding: [80, 80], maxZoom: 16 });
}

// rimuove percorso e marker destinazione
function clearRoute() {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
}

function resetView() {
  clearRoute();
  map.setView(ORIGIN_LATLNG, 14);
}


defineExpose({ refresh: caricaSegnalazioni, drawRoute, clearRoute, resetView });

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

  originMarker = L.marker(ORIGIN_LATLNG, {
    icon: creaIconaOrigine(), interactive: false, zIndexOffset: 1000
  }).addTo(map);  

  // ad ogni movimento della mappa ricarica le segnalazioni visibili in quella viewport
  map.on('moveend', caricaSegnalazioni);

  caricaSegnalazioni();
});
</script>

<style scoped>

</style>