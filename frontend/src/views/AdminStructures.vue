<template>
  <div class="h-screen w-full flex flex-col overflow-hidden bg-slate-50">
    <header class="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shadow-sm z-10">
      <div class="flex items-center gap-4">
        <button type="button" @click="vaiAllaHeatmap" title="Torna alla heatmap"
          class="p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-extrabold text-slate-800 tracking-tight leading-tight">Strutture private</h1>
          <p class="text-xs text-slate-400 font-medium">Backoffice &middot; monitoraggio anomalie</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="text-right">
          <p class="text-sm font-extrabold text-slate-800 leading-tight">{{ user?.nome }}</p>
          <p class="text-xs text-slate-400 font-medium capitalize">{{ user?.ruolo }}</p>
        </div>
        <button type="button" @click="vaiAlProfilo" title="Vai al profilo"
          class="p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13 13 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button type="button" @click="handleLogout" title="Esci"
          class="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>

    <!-- barra filtri -->
    <div class="shrink-0 px-6 py-4 bg-white/80 backdrop-blur border-b border-slate-100">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col">
          <label class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Categoria</label>
          <select v-model="filtroCategoria"
            class="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[200px]">
            <option value="">Tutte le categorie</option>
            <option v-for="cat in categorieStruttura" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>
        </div>

        <div class="flex flex-col">
          <label class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Solo con anomalie</label>
          <select v-model="filtroSoloAnomalie"
            class="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option :value="false">Tutte</option>
            <option :value="true">Almeno 1 anomalia</option>
          </select>
        </div>

        <div class="flex flex-col">
          <label class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Ordina per</label>
          <select v-model="ordinamento"
            class="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="numAnomalieStruttura">Anomalie</option>
            <option value="numForzature">Forzature</option>
            <option value="nome">Nome</option>
            <option value="createdAt">Data registrazione</option>
          </select>
        </div>

        <button type="button" @click="applicaFiltri"
          class="py-2 px-5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200 transition-all">
          Applica
        </button>
        <button type="button" @click="resetFiltri"
          class="py-2 px-4 text-sm font-semibold rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          Reimposta
        </button>
      </div>
    </div>

    <!-- tabella -->
    <main class="flex-1 overflow-auto px-6 py-4">
      <div v-if="caricamento" class="flex items-center justify-center h-40 text-slate-400 text-sm font-semibold">
        Caricamento…
      </div>

      <div v-else-if="errore" class="flex items-center justify-center h-40">
        <p class="text-rose-600 text-sm font-semibold">{{ errore }}</p>
      </div>

      <div v-else-if="strutture.length === 0" class="flex items-center justify-center h-40 text-slate-400 text-sm font-semibold">
        Nessuna struttura corrisponde ai filtri selezionati.
      </div>

      <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Nome</th>
              <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Categoria</th>
              <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Indirizzo</th>
              <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Accessibile</th>
              <th class="text-center px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Anomalie</th>
              <th class="text-center px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Forzature</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in strutture" :key="s._id"
              class="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
              :class="{ 'bg-rose-50/40': s.numAnomalieStruttura > 0 }">
              <td class="px-4 py-3 font-semibold text-slate-700">{{ s.nome }}</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                  {{ etichettaCategoria(s.categoria) }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-500 max-w-xs truncate">{{ s.indirizzo }}</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                  :class="s.accessibile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'">
                  {{ s.accessibile ? 'Sì' : 'No' }}
                </span>
              </td>
              <!-- contatore anomalie: evidenziato se > 0-->
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-1 rounded-full text-xs font-extrabold"
                  :class="s.numAnomalieStruttura > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-400'">
                  {{ s.numAnomalieStruttura ?? 0 }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-1 rounded-full text-xs font-bold"
                  :class="s.numForzature > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'">
                  {{ s.numForzature ?? 0 }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authFetch, getUser, clearSession } from '../services/auth';

const API_BASE_URL = '/api/v1';

const router = useRouter();
const user = getUser();

//etichette categorie struttura (allineate a StrutturaPrivata.js)
const categorieStruttura = [
  { value: 'ristorante',   label: 'Ristorante' },
  { value: 'bar',          label: 'Bar' },
  { value: 'negozio',      label: 'Negozio' },
  { value: 'ufficio',      label: 'Ufficio' },
  { value: 'hotel',        label: 'Hotel' },
  { value: 'studio_medico',label: 'Studio medico' },
  { value: 'palestra',     label: 'Palestra' },
  { value: 'altro',        label: 'Altro' }
];

//filtri
const filtroCategoria = ref('');
const filtroSoloAnomalie = ref(false);
const ordinamento = ref('numAnomalieStruttura');

//dati
const strutture = ref([]);
const caricamento = ref(false);
const errore = ref('');

function etichettaCategoria(value) {
  const c = categorieStruttura.find(x => x.value === value);
  return c ? c.label : value;
}

async function caricaStrutture() {
  caricamento.value = true;
  errore.value = '';
  try {
    const params = new URLSearchParams();
    if (filtroCategoria.value) params.set('categoria', filtroCategoria.value);
    if (filtroSoloAnomalie.value) params.set('minAnomalie', '1');
    if (ordinamento.value) params.set('orderBy', ordinamento.value);

    const qs = params.toString();
    const url = `${API_BASE_URL}/admin/structures${qs ? `?${qs}` : ''}`;
    const res = await authFetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      errore.value = body.error || `Errore ${res.status}`;
      strutture.value = [];
      return;
    }
    const data = await res.json();
    strutture.value = data.strutture || [];
  } catch (err) {
    console.error('GET /admin/structures', err);
    errore.value = 'Errore di rete nel caricamento delle strutture.';
    strutture.value = [];
  } finally {
    caricamento.value = false;
  }
}

function applicaFiltri() {
  caricaStrutture();
}

function resetFiltri() {
  filtroCategoria.value = '';
  filtroSoloAnomalie.value = false;
  ordinamento.value = 'numAnomalieStruttura';
  caricaStrutture();
}

//navigazione coerente con le altre viste operatore
function vaiAllaHeatmap() {
  router.push({ name: 'HomeOperatore' });
}
function vaiAlProfilo() {
  router.push({ name: 'Profilo' });
}
function handleLogout() {
  clearSession();
  router.push('/login');
}

onMounted(caricaStrutture);
</script>

<style scoped>
</style>