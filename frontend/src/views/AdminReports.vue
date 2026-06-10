<template>
  <div class="h-screen w-full flex flex-col overflow-hidden bg-slate-50">
    <!-- header: titolo + navigazione + profilo/logout (coerente con HomeOperatore) -->
    <header class="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shadow-sm z-10">
      <div class="flex items-center gap-4">
        <button type="button" @click="vaiAllaHeatmap" title="Torna alla heatmap"
          class="p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-extrabold text-slate-800 tracking-tight leading-tight">Dashboard segnalazioni</h1>
          <p class="text-xs text-slate-400 font-medium">Segnalazioni pubbliche aperte &middot; pianificazione manutenzione</p>
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
        <!-- stato -->
        <div class="flex flex-col">
          <label class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Stato</label>
          <select v-model="filtroStato"
            class="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="">Tutti (aperta + in carico)</option>
            <option value="APERTA">Solo APERTA</option>
            <option value="PRESA_IN_CARICO">Solo IN CARICO</option>
          </select>
        </div>

        <!-- categoria -->
        <div class="flex flex-col">
          <label class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Categoria</label>
          <select v-model="filtroCategoria"
            class="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[200px]">
            <option value="">Tutte le categorie</option>
            <option v-for="cat in categoriePubbliche" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>
        </div>

        <!-- date -->
        <div class="flex flex-col">
          <label class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Dal</label>
          <input type="date" v-model="filtroFrom"
            class="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div class="flex flex-col">
          <label class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Al</label>
          <input type="date" v-model="filtroTo"
            class="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>

        <!-- elementi per pagina -->
        <div class="flex flex-col">
          <label class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Per pagina</label>
          <select v-model.number="limit"
            class="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
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

    <!-- corpo: tabella scrollabile -->
    <main class="flex-1 overflow-auto px-6 py-4">
      <!-- stato di caricamento -->
      <div v-if="caricamento" class="flex items-center justify-center h-40 text-slate-400 text-sm font-semibold">
        Caricamento…
      </div>

      <!-- errore -->
      <div v-else-if="errore" class="flex items-center justify-center h-40">
        <p class="text-rose-600 text-sm font-semibold">{{ errore }}</p>
      </div>

      <!-- nessun risultato -->
      <div v-else-if="segnalazioni.length === 0" class="flex items-center justify-center h-40 text-slate-400 text-sm font-semibold">
        Nessuna segnalazione corrisponde ai filtri selezionati.
      </div>

      <!-- tabella -->
      <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th v-for="col in colonne" :key="col.campo"
                class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs"
                :class="col.ordinabile ? 'cursor-pointer select-none hover:text-emerald-600 transition-colors' : ''"
                @click="col.ordinabile && cambiaOrdinamento(col.campo)">
                <span class="inline-flex items-center gap-1">
                  {{ col.label }}
                  <!-- indicatore di ordinamento -->
                  <span v-if="col.ordinabile && orderBy === col.campo" class="text-emerald-500">
                    {{ order === 'asc' ? '▲' : '▼' }}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="s in segnalazioni" :key="s._id">
              <tr @click="toggleRiga(s._id)"
                class="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer">
                <td class="px-4 py-3 text-slate-700 max-w-md">
                  <div class="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 shrink-0 transition-transform"
                      :class="rigaEspansa === s._id ? 'rotate-90' : ''"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <p class="line-clamp-2">{{ s.descrizione }}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                    {{ etichettaCategoria(s.categoria) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                    :class="s.stato === 'PRESA_IN_CARICO' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'">
                    {{ s.stato }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-500 whitespace-nowrap">{{ formattaData(s.createdAt) }}</td>
                <td class="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                  {{ s.geolocalizzazione?.coordinates?.[1]?.toFixed(5) }}, {{ s.geolocalizzazione?.coordinates?.[0]?.toFixed(5) }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <!-- @click.stop: il click sul bottone NON deve espandere/chiudere la riga -->
                  <button v-if="s.stato === 'APERTA'" type="button"
                    @click.stop="prendiInCarico(s)" :disabled="presaInCaricoLoading === s._id"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {{ presaInCaricoLoading === s._id ? 'Attendere…' : 'Prendi in carico' }}
                  </button>
                  <span v-else class="text-xs font-semibold text-amber-600">In carico</span>
                </td>
              </tr>

              <!-- riga-tendina: foto allegate dal cittadino -->
              <tr v-if="rigaEspansa === s._id" class="bg-slate-50/40">
                <td :colspan="colonne.length" class="px-4 py-4">
                  <div v-if="s.foto && s.foto.length > 0">
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                      Foto allegate ({{ s.foto.length }})
                    </p>
                    <div class="flex flex-wrap gap-3">
                      <a v-for="(f, i) in s.foto" :key="i" :href="f" target="_blank" rel="noopener"
                        class="block">
                        <img :src="f" alt="foto segnalazione"
                          class="w-28 h-28 object-cover rounded-xl border border-slate-200 shadow-sm hover:scale-105 transition-transform"
                          loading="lazy" @error="($event.target.style.display='none')" />
                      </a>
                    </div>
                  </div>
                  <p v-else class="text-sm text-slate-400 font-medium italic">
                    Nessuna foto allegata a questa segnalazione.
                  </p>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </main>

    <!-- banner esito azione presa in carico -->
    <div v-if="messaggioAzione" class="shrink-0 px-6 py-2">
      <p class="text-xs font-semibold" :class="messaggioAzioneErrore ? 'text-rose-600' : 'text-emerald-600'">
        {{ messaggioAzione }}
      </p>
    </div>

    <!-- footer: paginazione -->
    <footer v-if="!caricamento && !errore && pagination.totalItems > 0"
      class="shrink-0 flex items-center justify-between px-6 py-3 bg-white border-t border-slate-100">
      <p class="text-xs font-semibold text-slate-400">
        {{ rangeTesto }} di {{ pagination.totalItems }}
      </p>
      <div class="flex items-center gap-2">
        <button type="button" @click="vaiAPagina(pagination.page - 1)" :disabled="!pagination.hasPrev"
          class="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors">
          Precedente
        </button>
        <span class="text-sm font-bold text-slate-600 px-2">
          {{ pagination.page }} / {{ pagination.totalPages }}
        </span>
        <button type="button" @click="vaiAPagina(pagination.page + 1)" :disabled="!pagination.hasNext"
          class="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors">
          Successiva
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authFetch, getUser, clearSession } from '../services/auth';

const API_BASE_URL = '/api/v1';

const router = useRouter();
const user = getUser();

//etichette categorie pubbliche (allineate a SegnalazionePubblica.js)
const categoriePubbliche = [
  { value: 'marciapiede_rotto',          label: 'Marciapiede rotto' },
  { value: 'ostacolo_temporaneo',        label: 'Ostacolo temporaneo' },
  { value: 'auto_sosta_vietata',         label: 'Auto in sosta vietata' },
  { value: 'scalino_non_segnalato',      label: 'Scalino non segnalato' },
  { value: 'pavimentazione_dissestata',  label: 'Pavimentazione dissestata' },
  { value: 'semaforo_non_accessibile',   label: 'Semaforo non accessibile' },
  { value: 'mancanza_rampa',             label: 'Mancanza rampa' },
  { value: 'altro',                      label: 'Altro' }
];

//definizione colonne: campo deve combaciare con la whitelist orderBy del backend
const colonne = [
  { campo: 'descrizione', label: 'Descrizione', ordinabile: false },
  { campo: 'categoria',   label: 'Categoria',   ordinabile: true },
  { campo: 'stato',       label: 'Stato',       ordinabile: true },
  { campo: 'createdAt',   label: 'Creata il',   ordinabile: true },
  { campo: 'coordinate',  label: 'Coordinate',  ordinabile: false },
  { campo: 'azioni',      label: 'Azioni',      ordinabile: false }
];

//stato filtri (bozza: applicati solo al click su "Applica")
const filtroStato = ref('');
const filtroCategoria = ref('');
const filtroFrom = ref('');
const filtroTo = ref('');
const limit = ref(20);

//stato ordinamento e paginazione (effettivi: guidano la fetch)
const orderBy = ref('createdAt');
const order = ref('desc');
const page = ref(1);

//stato dati
const segnalazioni = ref([]);
const pagination = reactive({ page: 1, limit: 20, totalItems: 0, totalPages: 0, hasPrev: false, hasNext: false });
const caricamento = ref(false);
const errore = ref('');

//stato dell'azione "prendi in carico": contiene l'_id della riga in elaborazione
//(o '' se nessuna), così disabilito solo il bottone cliccato
const presaInCaricoLoading = ref('');
const rigaEspansa = ref('');

function toggleRiga(id) {
  rigaEspansa.value = rigaEspansa.value === id ? '' : id;
}

const messaggioAzione = ref('');
const messaggioAzioneErrore = ref(false);

//mappa categoria -> etichetta (fallback al valore grezzo se non mappata)
function etichettaCategoria(value) {
  const c = categoriePubbliche.find(x => x.value === value);
  return c ? c.label : value;
}

function formattaData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

//testo "X–Y" della pagina corrente
const rangeTesto = computed(() => {
  if (pagination.totalItems === 0) return '0';
  const inizio = (pagination.page - 1) * pagination.limit + 1;
  const fine = inizio + segnalazioni.value.length - 1;
  return `${inizio}–${fine}`;
});

async function caricaReports() {
  caricamento.value = true;
  errore.value = '';
  try {
    const params = new URLSearchParams();
    if (filtroStato.value) params.set('stato', filtroStato.value);
    if (filtroCategoria.value) params.set('categoria', filtroCategoria.value);
    //input date 'YYYY-MM-DD' -> estremi ISO della giornata (stessa logica di AdminHeatmap)
    if (filtroFrom.value) params.set('from', `${filtroFrom.value}T00:00:00.000Z`);
    if (filtroTo.value) params.set('to', `${filtroTo.value}T23:59:59.999Z`);
    params.set('orderBy', orderBy.value);
    params.set('order', order.value);
    params.set('page', String(page.value));
    params.set('limit', String(limit.value));

    const res = await authFetch(`${API_BASE_URL}/admin/reports?${params.toString()}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      errore.value = body.error || `Errore ${res.status}`;
      segnalazioni.value = [];
      return;
    }

    const data = await res.json();
    segnalazioni.value = data.segnalazioni || [];
    Object.assign(pagination, data.pagination);
  } catch (err) {
    console.error('GET /admin/reports', err);
    errore.value = 'Errore di rete nel caricamento delle segnalazioni.';
    segnalazioni.value = [];
  } finally {
    caricamento.value = false;
  }
}

//"Applica": riparte sempre da pagina 1 (i filtri cambiano l'insieme dei risultati)
function applicaFiltri() {
  page.value = 1;
  caricaReports();
}

function resetFiltri() {
  filtroStato.value = '';
  filtroCategoria.value = '';
  filtroFrom.value = '';
  filtroTo.value = '';
  limit.value = 20;
  orderBy.value = 'createdAt';
  order.value = 'desc';
  page.value = 1;
  caricaReports();
}

//click su intestazione colonna: se è la colonna già attiva inverte la direzione,
//altrimenti passa a quella colonna con direzione di default desc. Torna a pagina 1.
function cambiaOrdinamento(campo) {
  if (orderBy.value === campo) {
    order.value = order.value === 'asc' ? 'desc' : 'asc';
  } else {
    orderBy.value = campo;
    order.value = 'desc';
  }
  page.value = 1;
  caricaReports();
}

function vaiAPagina(n) {
  if (n < 1 || n > pagination.totalPages) return;
  page.value = n;
  caricaReports();
}

//navigazione coerente con HomeOperatore
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

//prende in carico una segnalazione APERTA.
async function prendiInCarico(s) {
  presaInCaricoLoading.value = s._id;
  messaggioAzione.value = '';
  messaggioAzioneErrore.value = false;
  try {
      const res = await authFetch(`${API_BASE_URL}/admin/publicReports/${s._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'PRESA_IN_CARICO' })
  });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      //409: qualcun altro l'ha già presa in carico nel frattempo
      messaggioAzione.value = res.status === 409
        ? 'Segnalazione già presa in carico da un altro operatore.'
        : (body.error || `Errore ${res.status}`);
      messaggioAzioneErrore.value = true;
      return;
    }
    const data = await res.json();
    //muto in-place l'elemento esistente: stato e enteCompetente aggiornati, riga reattiva.
    Object.assign(s, data.segnalazione);
    messaggioAzione.value = 'Segnalazione presa in carico.';
  } catch (err) {
    console.error('PATCH /admin/publicReports/:id', err);
    messaggioAzione.value = 'Errore di rete durante la presa in carico.';
    messaggioAzioneErrore.value = true;
  } finally {
    presaInCaricoLoading.value = '';
  }
}

onMounted(caricaReports);
</script>