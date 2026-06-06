<template>
  <div class="h-screen w-full flex flex-col overflow-hidden bg-slate-50">
    <!-- header: coerente con AdminReports / HomeOperatore -->
    <header class="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shadow-sm z-10">
      <div class="flex items-center gap-4">
        <button type="button" @click="vaiAllaHeatmap" title="Torna alla heatmap"
          class="p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-extrabold text-slate-800 tracking-tight leading-tight">Segnalazioni private</h1>
          <p class="text-xs text-slate-400 font-medium">Moderazione &middot; forzatura stato (override comunale)</p>
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

    <div class="shrink-0 px-6 py-4 bg-white/80 backdrop-blur border-b border-slate-100">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col">
          <label class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Stato</label>
          <select v-model="filtroStato"
            class="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="">Tutti</option>
            <option value="IN_VERIFICA">In verifica</option>
            <option value="APERTA">Aperta</option>
          </select>
        </div>

        <div class="flex flex-col">
          <label class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Categoria</label>
          <select v-model="filtroCategoria"
            class="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[200px]">
            <option value="">Tutte le categorie</option>
            <option v-for="cat in categoriePrivate" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
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

    <main class="flex-1 overflow-auto px-6 py-4">
      <div v-if="caricamento" class="flex items-center justify-center h-40 text-slate-400 text-sm font-semibold">
        Caricamento…
      </div>

      <div v-else-if="errore" class="flex items-center justify-center h-40">
        <p class="text-rose-600 text-sm font-semibold">{{ errore }}</p>
      </div>

      <div v-else-if="segnalazioni.length === 0" class="flex items-center justify-center h-40 text-slate-400 text-sm font-semibold">
        Nessuna segnalazione privata corrisponde ai filtri selezionati.
      </div>

      <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Descrizione</th>
              <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Categoria</th>
              <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Stato</th>
              <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Validazione</th>
              <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Creata il</th>
              <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide text-xs">Azioni</th>
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
                  <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold" :class="classeStato(s.stato)">
                    {{ s.stato }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-500 whitespace-nowrap">
                  <span v-if="s.scoreAssociato != null">
                    {{ s.scoreAssociato }} / {{ s.sogliaValidazione }}
                  </span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-3 text-slate-500 whitespace-nowrap">{{ formattaData(s.createdAt) }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <button type="button" @click.stop="apriModal(s)"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-sm transition-all">
                    Forza stato
                  </button>
                </td>
              </tr>

              <tr v-if="rigaEspansa === s._id" class="bg-slate-50/40">
                <td colspan="6" class="px-4 py-4">
                  <div v-if="s.foto && s.foto.length > 0">
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                      Foto allegate ({{ s.foto.length }})
                    </p>
                    <div class="flex flex-wrap gap-3">
                      <a v-for="(f, i) in s.foto" :key="i" :href="f" target="_blank" rel="noopener" class="block">
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

    <!-- banner esito azione -->
    <div v-if="messaggioAzione" class="shrink-0 px-6 py-2">
      <p class="text-xs font-semibold" :class="messaggioAzioneErrore ? 'text-rose-600' : 'text-emerald-600'">
        {{ messaggioAzione }}
      </p>
    </div>

    <!-- MODAL forzatura stato -->
    <div v-if="modalAperto" class="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <!-- backdrop -->
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="chiudiModal"></div>

      <!-- card -->
      <div class="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-6">
        <h2 class="text-lg font-extrabold text-slate-800 mb-1">Forza stato segnalazione</h2>
        <p class="text-xs text-slate-400 font-medium mb-4 line-clamp-2">
          {{ segnalazioneSelezionata?.descrizione }}
        </p>

        <!-- stato target -->
        <label class="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Nuovo stato</label>
        <select v-model="modalStato"
          class="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="APERTA">APERTA (rendi visibile sulla mappa)</option>
          <option value="ARCHIVIATA">ARCHIVIATA</option>
          <option value="RISOLTA">RISOLTA</option>
        </select>

        <!-- motivazione obbligatoria -->
        <label class="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
          Motivazione <span class="text-rose-500">*</span>
        </label>
        <textarea v-model="modalMotivazione" rows="4" maxlength="500"
          placeholder="Spiega perché stai forzando lo stato (minimo 10 caratteri)…"
          class="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"></textarea>
        <div class="flex items-center justify-between mt-1 mb-4">
          <span v-if="modalErrore" class="text-xs font-semibold text-rose-600">{{ modalErrore }}</span>
          <span v-else class="text-xs text-slate-300">&nbsp;</span>
          <span class="text-xs font-medium text-slate-400">{{ modalMotivazione.length }}/500</span>
        </div>

        <div class="flex items-center justify-end gap-2">
          <button type="button" @click="chiudiModal" :disabled="modalLoading"
            class="px-4 py-2 text-sm font-semibold rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors">
            Annulla
          </button>
          <button type="button" @click="confermaForzatura" :disabled="modalLoading"
            class="px-5 py-2 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {{ modalLoading ? 'Attendere…' : 'Conferma forzatura' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authFetch, getUser, clearSession } from '../services/auth';

const API_BASE_URL = '/api/v1';

const router = useRouter();
const user = getUser();

//etichette categorie private (allineate a SegnalazionePrivata.js)
const categoriePrivate = [
  { value: 'mancanza_rampa',        label: 'Mancanza rampa' },
  { value: 'bagno_non_accessibile', label: 'Bagno non accessibile' },
  { value: 'ascensore_guasto',      label: 'Ascensore guasto' },
  { value: 'spazi_interni_stretti', label: 'Spazi interni stretti' },
  { value: 'altro',                 label: 'Altro' }
];

//filtri
const filtroStato = ref('');
const filtroCategoria = ref('');

//dati
const segnalazioni = ref([]);
const caricamento = ref(false);
const errore = ref('');
const messaggioAzione = ref('');
const messaggioAzioneErrore = ref(false);

//stato modal
const modalAperto = ref(false);
const segnalazioneSelezionata = ref(null);
const modalStato = ref('APERTA');
const modalMotivazione = ref('');
const modalErrore = ref('');
const modalLoading = ref(false);

const rigaEspansa = ref('');

function toggleRiga(id) {
  rigaEspansa.value = rigaEspansa.value === id ? '' : id;
}

function etichettaCategoria(value) {
  const c = categoriePrivate.find(x => x.value === value);
  return c ? c.label : value;
}

function classeStato(stato) {
  if (stato === 'APERTA') return 'bg-emerald-100 text-emerald-700';
  if (stato === 'IN_VERIFICA') return 'bg-amber-100 text-amber-700';
  if (stato === 'RISOLTA') return 'bg-sky-100 text-sky-700';
  if (stato === 'ARCHIVIATA') return 'bg-slate-200 text-slate-500';
  return 'bg-slate-100 text-slate-600';
}

function formattaData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function caricaPrivate() {
  caricamento.value = true;
  errore.value = '';
  try {
    const params = new URLSearchParams();
    if (filtroStato.value) params.set('stato', filtroStato.value);
    if (filtroCategoria.value) params.set('categoria', filtroCategoria.value);

    //GET /privateReports come operatore restituisce anche le IN_VERIFICA (logica server-side)
    const qs = params.toString();
    const url = `${API_BASE_URL}/privateReports${qs ? `?${qs}` : ''}`;
    const res = await authFetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      errore.value = body.error || `Errore ${res.status}`;
      segnalazioni.value = [];
      return;
    }
    const data = await res.json();
    segnalazioni.value = data.segnalazioni || [];
  } catch (err) {
    console.error('GET /privateReports', err);
    errore.value = 'Errore di rete nel caricamento delle segnalazioni private.';
    segnalazioni.value = [];
  } finally {
    caricamento.value = false;
  }
}

function applicaFiltri() {
  caricaPrivate();
}

function resetFiltri() {
  filtroStato.value = '';
  filtroCategoria.value = '';
  caricaPrivate();
}

//--- modal ---
function apriModal(s) {
  segnalazioneSelezionata.value = s;
  modalStato.value = 'APERTA';
  modalMotivazione.value = '';
  modalErrore.value = '';
  modalAperto.value = true;
}

function chiudiModal() {
  if (modalLoading.value) return; //non chiudere durante una chiamata in corso
  modalAperto.value = false;
  segnalazioneSelezionata.value = null;
}

async function confermaForzatura() {
  //validazione client speculare a quella server (minimo 10 caratteri, trim)
  const motivazione = modalMotivazione.value.trim();
  if (motivazione.length < 10) {
    modalErrore.value = 'La motivazione è obbligatoria (minimo 10 caratteri).';
    return;
  }
  modalErrore.value = '';
  modalLoading.value = true;
  try {
    const res = await authFetch(`${API_BASE_URL}/admin/privateReports/${segnalazioneSelezionata.value._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: modalStato.value, motivazione })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      modalErrore.value = body.error || `Errore ${res.status}`;
      return;
    }
    const data = await res.json();
    //aggiorno in-place la riga con la segnalazione tornata dal server
    Object.assign(segnalazioneSelezionata.value, data.segnalazione);
    messaggioAzione.value = 'Stato forzato con successo.';
    messaggioAzioneErrore.value = false;
    modalAperto.value = false;
    segnalazioneSelezionata.value = null;
  } catch (err) {
    console.error('PATCH /admin/privateReports/:id', err);
    modalErrore.value = 'Errore di rete durante la forzatura.';
  } finally {
    modalLoading.value = false;
  }
}

//navigazione coerente con AdminReports
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

onMounted(caricaPrivate);
</script>

<style scoped>
</style>