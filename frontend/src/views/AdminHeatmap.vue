<template>
  <div class="relative w-full h-full">
    <!-- contenitore mappa -->
    <div ref="mapContainer" class="w-full h-full"></div>

    <!-- pannello controlli: overlay in alto a sinistra sulla mappa -->
    <div class="absolute top-6 left-6 z-[401] w-72 bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-slate-100 p-5 space-y-4">
      <h3 class="text-base font-extrabold text-slate-800 tracking-tight">Heatmap criticità</h3>

      <!-- toggle layer on/off -->
      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-sm font-semibold text-slate-600">Mostra heatmap</span>
        <input type="checkbox" v-model="heatVisibile" class="h-4 w-4 accent-emerald-500" />
      </label>

      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-sm font-semibold text-slate-600">Mostra segnalazioni pubbliche</span>
        <input type="checkbox" v-model="pubblicheVisibile" class="h-4 w-4 accent-emerald-500" />
      </label>

      <!-- filtro stato -->
      <div>
        <label class="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Stato</label>
        <select v-model="filtroStato"
          class="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">Tutte (aperta + in verifica)</option>
          <option value="APERTA">Solo APERTA</option>
          <option value="IN_VERIFICA">Solo IN_VERIFICA</option>
        </select>
      </div>

      <!-- filtri data -->
      <div>
        <label class="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Dal</label>
        <input type="date" v-model="filtroFrom"
          class="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Al</label>
        <input type="date" v-model="filtroTo"
          class="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>

      <button type="button" @click="caricaHeatmap"
        class="w-full py-2.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200 transition-all">
        Applica filtri
      </button>

      <!-- messaggio di stato (errori / caricamento / conteggio) -->
      <p v-if="messaggio" class="text-xs font-semibold" :class="messaggioErrore ? 'text-rose-600' : 'text-slate-500'">
        {{ messaggio }}
      </p>

      <!-- legenda intensità -->
      <div class="pt-2 border-t border-slate-100">
        <span class="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Intensità</span>
        <div class="h-3 w-full rounded-full"
          style="background: linear-gradient(to right, #ffffb2, #fecc5c, #fd8d3c, #e31a1c);"></div>
        <div class="flex justify-between text-[10px] font-semibold text-slate-400 mt-1">
          <span>Bassa</span>
          <span>Alta</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat'; //side-effect: estende L con L.heatLayer
import { authFetch } from '../services/auth';

const API_BASE_URL = '/api/v1';

//vista iniziale coerente con Mappa.vue (centro Trento)
const INITIAL_VIEW = [46.0667, 11.1167];
const INITIAL_ZOOM = 14;

const mapContainer = ref(null);
let map = null;
let heatLayer = null;

//stato dei controlli
const heatVisibile = ref(true);
const filtroStato = ref('');   // '' | 'APERTA' | 'IN_VERIFICA'
const filtroFrom = ref('');    // 'YYYY-MM-DD' dall'input date
const filtroTo = ref('');
const messaggio = ref('');
const messaggioErrore = ref(false);

const pubblicheVisibile = ref(false);
let pubblicheLayer = null;

//converte le celle del backend nel formato richiesto da leaflet.heat: [lat, lng, intensity].
//intensità con pavimento alto: una cella con 1 segnalazione parte già nella fascia calda,
//così la heatmap resta leggibile anche con pochi dati. con molte segnalazioni questi
//valori andranno ritarati per tornare a distinguere le zone davvero critiche.
function celleToHeatPoints(celle) {
  return celle.map(c => {
    const intensita = Math.min(1, 0.6 + c.count * 0.15);
    return [c.lat, c.lng, intensita];
  });
}

function creaIconaCustom(stato) {
  let colore = stato === 'PRESA_IN_CARICO' ? '#d1d5db' : '#0ea5e9';
  
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

async function caricaHeatmap() {
  if (!map) return;
  messaggio.value = 'Caricamento…';
  messaggioErrore.value = false;

  try {
    const params = new URLSearchParams();
    if (filtroStato.value) params.set('stato', filtroStato.value);
    //gli input date danno 'YYYY-MM-DD': trasformati in estremi ISO della giornata.
    if (filtroFrom.value) params.set('from', `${filtroFrom.value}T00:00:00.000Z`);
    if (filtroTo.value) params.set('to', `${filtroTo.value}T23:59:59.999Z`);

    const qs = params.toString();
    const url = `${API_BASE_URL}/admin/heatmap${qs ? `?${qs}` : ''}`;

    const res = await authFetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      messaggio.value = body.error || `Errore ${res.status}`;
      messaggioErrore.value = true;
      return;
    }

    const data = await res.json();
    const punti = celleToHeatPoints(data.celle || []);

    //ricreato il layer da zero ad ogni fetch: più semplice di un update incrementale
    if (heatLayer) {
      map.removeLayer(heatLayer);
      heatLayer = null;
    }
    //radius/blur ampi e minOpacity alta per rendere visibili anche poche celle isolate;
    //gradiente sui toni caldi perché blu/verde su tile chiare quasi non si vedono.
    heatLayer = L.heatLayer(punti, {
      radius: 35,
      blur: 25,
      minOpacity: 0.5,
      maxZoom: 17,
      gradient: { 0.0: '#ffffb2', 0.4: '#fecc5c', 0.7: '#fd8d3c', 1.0: '#e31a1c' }
    });

    if (heatVisibile.value) heatLayer.addTo(map);

    if (pubblicheVisibile.value) caricaMarkersPubblici();

    messaggio.value = data.count === 0
      ? 'Nessuna segnalazione attiva nei filtri selezionati.'
      : `${data.count} celle, ${punti.length ? 'heatmap aggiornata.' : ''}`;
  } catch (err) {
    console.error('GET /admin/heatmap', err);
    messaggio.value = 'Errore di rete nel caricamento della heatmap.';
    messaggioErrore.value = true;
  }
}

async function caricaMarkersPubblici() {
  if (!map || !pubblicheVisibile.value) return;

  try {
    const res = await authFetch(`${API_BASE_URL}/publicReports`);
    if (!res.ok) return;

    const data = await res.json();
    const lista = data.segnalazioni || [];

    pubblicheLayer.clearLayers();

    const attive = lista.filter(s => ['APERTA', 'PRESA_IN_CARICO'].includes(s.stato));

    attive.forEach(seg => {
      const [lng, lat] = seg.geolocalizzazione.coordinates;

      const categoriaLabel = String(seg.categoria).replaceAll('_', ' ');
      let html = `<div class="popup-cat" style="color:#0f172a; font-weight:700; font-size:14px; text-transform:capitalize; margin-bottom:4px;">${categoriaLabel}</div>`;
      html += `<div class="popup-desc" style="color:#334155; font-size:13px; line-height:1.5;">${seg.descrizione}</div>`;

      if (seg.stato === 'PRESA_IN_CARICO') {
        html += `<div style="margin-top:8px; font-size:11px; font-weight:700; color:#64748b">il comune ci sta lavorando</div>`;
      }

      L.marker([lat, lng], { icon: creaIconaCustom(seg.stato) })
        .bindPopup(html, {
          className: 'popup-moderno',
          closeButton: false,
          maxWidth: 280
        })
        .addTo(pubblicheLayer);
    });
  } catch (err) {
    console.error('Errore scaricamento markers pubblici per operatore:', err);
  }
}

//il toggle non rifà la fetch: aggiunge/rimuove solo il layer già calcolato
watch(heatVisibile, (visibile) => {
  if (!map || !heatLayer) return;
  if (visibile) heatLayer.addTo(map);
  else map.removeLayer(heatLayer);
});

watch(pubblicheVisibile, (visibile) => {
  if (!map || !pubblicheLayer) return;
  if (visibile) {
    pubblicheLayer.addTo(map);
    caricaMarkersPubblici();
  } else {
    map.removeLayer(pubblicheLayer);
  }
});

onMounted(() => {
  map = L.map(mapContainer.value, { zoomControl: false }).setView(INITIAL_VIEW, INITIAL_ZOOM);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors, © CARTO'
  }).addTo(map);

  pubblicheLayer = L.layerGroup();
  if (pubblicheVisibile.value) pubblicheLayer.addTo(map);

  caricaHeatmap();
});
</script>

<style scoped>
</style>