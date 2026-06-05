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

// US10: al click sul bottone "Conferma" dentro il popup, la mappa notifica Home
// che aprira il modale di validazione. La mappa resta responsabile solo della mappa.
const emit = defineEmits(['valida-segnalazione', 'struttura-selezionata']);

// origine hardcoded in attesa della geolocalizzazione reale
const ORIGIN_LATLNG = [46.0667, 11.1211];

const mapContainer = ref(null);
let map = null;
let markersLayer = null;

let struttureLayer = null;
let strutturaSelezionataMarker = null;

let routeLayer = null;
let originMarker = null;
let destMarker = null;

const colorMapStrutture = {
  ristorante: '#ef4444',    
  bar: '#BA63F8',           
  negozio: '#a855f7',       
  ufficio: '#64748b',       
  hotel: '#14b8a6',         
  studio_medico: '#F5CC27', 
  palestra: '#22c55e',      
  altro: '#52525b'          
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
let ostacoliLayer = null;

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

function creaIconaOstacolo() {
  const svgWarn = `
    <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="15" r="14" fill="#f97316" stroke="white" stroke-width="2"/>
      <text x="15" y="21" text-anchor="middle" font-size="16" fill="white">⚠</text>
    </svg>
  `;
  return L.divIcon({
    className: 'marker-ostacolo',
    html: svgWarn,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18]
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

function creaIconaStruttura(struttura, selezionata = false) {
  // Prende il colore della categoria, o il grigio neutro se non lo trova
  const colore = colorMapStrutture[struttura.categoria] || colorMapStrutture.altro;
  const classeSelezionata = selezionata ? ' selected' : '';

  const html = `<div class="struttura-dot${classeSelezionata}" style="background-color: ${colore};"></div>`;

  return L.divIcon({
    className: 'struttura-dot-wrapper',
    html,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
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

    // pubbliche: solo APERTA. private: APERTA + IN_VERIFICA (per poterle validare).
    const paramsPublic = new URLSearchParams({ bbox, stato: 'APERTA' });
    const paramsPrivate = new URLSearchParams({ bbox });

    let scope = '';
    let categoriaValue = '';
    if (props.categoria) {
      [scope, categoriaValue] = props.categoria.split(':');
    }

    let chiamaPublic = true;
    let chiamaPrivate = true;

    if (scope === 'pubblica') {
      paramsPublic.set('categoria', categoriaValue);
      chiamaPrivate = false; // nessuna privata può corrispondere
    } 
    else if (scope === 'privata') {
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

    // private: tengo solo APERTA + IN_VERIFICA; scarto RISOLTA/ARCHIVIATA/PRESA_IN_CARICO
    const STATI_MAPPA_PRIVATA = ['APERTA', 'IN_VERIFICA'];
    const privateFiltrate = (dataPrivate.segnalazioni || [])
      .filter(s => STATI_MAPPA_PRIVATA.includes(s.stato));

    // fusione dei risultati delle due queries in un unico array
    const segnalazioni = [...(dataPublic.segnalazioni || []), ...privateFiltrate];

    markersLayer.clearLayers();

    //si cicla sui dati ricevuti da mongodb
    segnalazioni.forEach(seg => {
      const [lng, lat] = seg.geolocalizzazione.coordinates;

      // contenuto popup: come prima (categoria + descrizione).
      let html = `<b>${seg.categoria}</b><br>${seg.descrizione}`;
      
      if (seg.tipo === 'privata') {
        const statoLabel = seg.stato === 'APERTA' ? 'Confermata' : 'In verifica';
        const coloreStato = seg.stato === 'APERTA' ? '#059669' : '#d97706';
        html += `<div style="margin-top:8px;font-size:11px;font-weight:700;color:${coloreStato}">${statoLabel}</div>`;
        html += `<button type="button" class="btn-valida-popup" data-id="${seg._id}"
          style="margin-top:8px;width:100%;padding:8px;border:none;border-radius:8px;
          background:#10b981;color:#fff;font-weight:700;cursor:pointer">Conferma segnalazione</button>`;
      }

      const marker = L.marker([lat, lng], { icon: creaIconaCustom(seg.tipo) })
        .bindPopup(html, {
          className: 'popup-moderno',
          closeButton: false,
          maxWidth: 280
        });

      // Il nostro nuovo listener sul singolo marker
      marker.on('popupopen', (e) => {
        const node = e.popup.getElement();
        if (!node) return;
        
        const btn = node.querySelector('.btn-valida-popup');
        if (btn) {
          btn.onclick = () => {
            map.closePopup();
            emit('valida-segnalazione', seg);
          };
        }
      });

      marker.addTo(markersLayer);
    });
  } catch (err) {
    console.error("Errore scaricamento segnalazioni:", err);
  }
}

// funzione che scarica le strutture dal backend e le visualizza su mappa
async function caricaStrutture() {
  try {

    if (map.getZoom() < 14) {
      struttureLayer.clearLayers();
      strutturaSelezionataMarker = null;
      return;
    }

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;

    const params = new URLSearchParams({ bbox });

    let categoriaValue = '';
    if (props.categoria) {
      const [scope, value] = props.categoria.split(':');
      if (scope === 'privata') categoriaValue = value;
    }
    if (categoriaValue) params.set('categoria', categoriaValue);

    const res = await authFetch(`${API_BASE_URL}/structures?${params}`);
    if (!res.ok) {
      console.error('Errore API structures:', res.status, await res.text());
      struttureLayer.clearLayers();
      return;
    }

    const data = await res.json();
    const strutture = data.strutture || [];

    struttureLayer.clearLayers();
    strutturaSelezionataMarker = null;

    strutture.forEach(struttura => {
      const [lng, lat] = struttura.geolocalizzazione.coordinates;

      const marker = L.marker([lat, lng], {
        icon: creaIconaStruttura(struttura, false),

      });

      marker._struttura = struttura;

      marker.on('click', () => selezionaStruttura(marker));

      marker.addTo(struttureLayer);
    });
  } catch (err) {
    console.error('Errore scaricamento strutture:', err);
  }
}

function selezionaStruttura(marker) {
  if (strutturaSelezionataMarker === marker) {
    deselezionaStruttura();
    emit('struttura-selezionata', null);
    return;
  }

  if (strutturaSelezionataMarker) {
    strutturaSelezionataMarker.setIcon(
      creaIconaStruttura(strutturaSelezionataMarker._struttura, false)
    );
  }

  marker.setIcon(creaIconaStruttura(marker._struttura, true));
  strutturaSelezionataMarker = marker;

  emit('struttura-selezionata', marker._struttura);
}

function deselezionaStruttura() {
  if (strutturaSelezionataMarker) {
    strutturaSelezionataMarker.setIcon(
      creaIconaStruttura(strutturaSelezionataMarker._struttura, false)
    );
    strutturaSelezionataMarker = null;
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


  //disegna i marker degli ostacoli esclusi
  if(routeData.ostacoli_esclusi && routeData.ostacoli_esclusi.length > 0){
    
    ostacoliLayer = L.layerGroup().addTo(map);
    routeData.ostacoli_esclusi.forEach(o => {
      const label = `<b>Ostacolo escluso</b><br>
        <span class="text-xs text-slate-500 capitalize">${o.categoria.replaceAll('_', ' ')}</span><br>
        <span class="text-xs text-slate-400">(${o.tipo})</span>`;
      L.marker([o.lat, o.lng], { icon: creaIconaOstacolo(), zIndexOffset: 500 })
        .bindPopup(label, { className: 'popup-moderno', closeButton: false, maxWidth: 220 })
        .addTo(ostacoliLayer);
    });
  }
  
 
  // zoom su origine e destinazione nella stessa vista
  const fitBounds = L.latLngBounds([ORIGIN_LATLNG, [destination.lat, destination.lng]]);
  map.fitBounds(fitBounds, { padding: [80, 80], maxZoom: 16 });
}

// rimuove percorso e marker destinazione
function clearRoute() {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
  if (ostacoliLayer){ map.removeLayer(ostacoliLayer); ostacoliLayer = null; }
}

function resetView() {
  clearRoute();
  map.setView(ORIGIN_LATLNG, 14);
}


defineExpose({ refresh: caricaSegnalazioni, refreshStrutture: caricaStrutture, deselezionaStruttura, drawRoute, clearRoute, resetView });

watch(() => props.categoria, () => {
  if (map) {
    caricaSegnalazioni();
    caricaStrutture();
  } 
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
  struttureLayer = L.layerGroup().addTo(map);

  originMarker = L.marker(ORIGIN_LATLNG, {
    icon: creaIconaOrigine(), interactive: false, zIndexOffset: 1000
  }).addTo(map);  

  // ad ogni movimento della mappa ricarica le segnalazioni visibili in quella viewport
  map.on('moveend', () => {
    caricaSegnalazioni();
    caricaStrutture();
  });

  caricaSegnalazioni();
  caricaStrutture();
});
</script>

<style scoped>

</style>