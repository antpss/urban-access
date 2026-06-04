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

    messaggio.value = data.count === 0
      ? 'Nessuna segnalazione attiva nei filtri selezionati.'
      : `${data.count} celle, ${punti.length ? 'heatmap aggiornata.' : ''}`;
  } catch (err) {
    console.error('GET /admin/heatmap', err);
    messaggio.value = 'Errore di rete nel caricamento della heatmap.';
    messaggioErrore.value = true;
  }
}

//il toggle non rifà la fetch: aggiunge/rimuove solo il layer già calcolato
watch(heatVisibile, (visibile) => {
  if (!map || !heatLayer) return;
  if (visibile) heatLayer.addTo(map);
  else map.removeLayer(heatLayer);
});

onMounted(() => {
  map = L.map(mapContainer.value, { zoomControl: false }).setView(INITIAL_VIEW, INITIAL_ZOOM);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors, © CARTO'
  }).addTo(map);

  caricaHeatmap();
});
</script>

<style scoped>
</style>