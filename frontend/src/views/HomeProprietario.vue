<template>
  <div class="h-screen w-full flex overflow-hidden bg-slate-50 relative">
 
    <main class="flex-1 relative flex items-center justify-center bg-slate-200 z-0 rounded-2xl overflow-hidden shadow-inner">
 
      <!-- bottone per riaprire il pannello quando è chiuso -->
      <transition name="slide-button">
        <button
          v-if="!isSidebarOpen"
          @click="isSidebarOpen = true"
          class="absolute top-6 left-6 p-3 bg-white rounded-xl shadow-lg text-slate-700 hover:text-emerald-600 z-[401]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </transition>
 
      <!-- header account in alto a destra (coerente con HomeOperatore) -->
      <div class="absolute top-6 right-6 z-[401] flex items-center gap-3 bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-slate-100 px-4 py-3">
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
 
      <!-- la mappa filtra le strutture sul mio id (prop proprietarioId) -->
      <Mappa
        ref="mappaRef"
        :proprietario-id="user?._id"
        @struttura-selezionata="onStrutturaSelezionata"
      />
    </main>
 
    <!-- PANNELLO MASTER-DETAIL -->
    <transition name="slide-sidebar">
      <aside
        v-if="isSidebarOpen"
        class="absolute top-10 bottom-10 left-10 bg-white/95 backdrop-blur shadow-2xl z-[410] flex flex-col w-96 rounded-2xl border border-slate-100"
      >
        <!-- intestazione -->
        <div class="p-6 border-b border-slate-100 relative shrink-0">
          <button type="button" @click="vaiAlProfilo"
            class="pr-10 text-left group w-full" title="Vai al tuo profilo">
            <h2 class="text-xl font-extrabold text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
              Ciao {{ user?.nome }} 👋!
            </h2>
            <p class="text-sm text-slate-400 font-medium capitalize mt-0.5 group-hover:text-emerald-500 transition-colors">
              {{ user?.ruolo }} · Vedi profilo
            </p>
          </button>
          <button @click="isSidebarOpen = false"
            class="absolute top-6 right-6 p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
 
        <!-- corpo: master (lista strutture) oppure detail (segnalazioni) -->
        <div class="flex-1 overflow-y-auto">
 
          <!-- ===== MASTER: lista strutture ===== -->
          <div v-if="!strutturaSelezionata" class="p-4 space-y-2">
            <p class="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Le tue strutture
            </p>
 
            <div v-if="loadingStrutture" class="px-2 py-8 text-center text-sm text-slate-400">
              Caricamento…
            </div>
 
            <div v-else-if="erroreStrutture" class="px-2 py-6 text-center text-sm text-rose-500">
              {{ erroreStrutture }}
            </div>
 
            <div v-else-if="strutture.length === 0" class="px-2 py-8 text-center text-sm text-slate-400">
              Non hai ancora registrato strutture.
            </div>
 
            <button
              v-for="s in strutture"
              :key="s._id"
              type="button"
              @click="selezionaStruttura(s)"
              class="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-bold text-slate-800 truncate group-hover:text-emerald-700">{{ s.nome }}</p>
                  <p class="text-xs text-slate-400 capitalize mt-0.5">{{ s.categoria }}</p>
                  <p class="text-xs text-slate-400 truncate mt-0.5">{{ s.indirizzo }}</p>
                </div>
                <!-- badge accessibilità derivata server-side -->
                <span
                  class="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full"
                  :class="s.accessibile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                >
                  {{ s.accessibile ? 'Accessibile' : 'Non acc.' }}
                </span>
              </div>
            </button>
          </div>
 
          <!-- ===== DETAIL: segnalazioni della struttura selezionata ===== -->
          <div v-else class="p-4">
            <!-- breadcrumb / back -->
            <button type="button" @click="deselezionaStruttura"
              class="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-emerald-600 mb-4 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Tutte le strutture
            </button>
 
            <div class="px-1 mb-4">
              <h3 class="text-lg font-extrabold text-slate-800 leading-tight">{{ strutturaSelezionata.nome }}</h3>
              <p class="text-xs text-slate-400 capitalize mt-0.5">{{ strutturaSelezionata.categoria }} · {{ strutturaSelezionata.indirizzo }}</p>
            </div>
 
            <div v-if="loadingReport" class="px-1 py-8 text-center text-sm text-slate-400">
              Caricamento segnalazioni…
            </div>
 
            <div v-else-if="erroreReport" class="px-1 py-6 text-center text-sm text-rose-500">
              {{ erroreReport }}
            </div>
 
            <template v-else>
              <!-- DA GESTIRE -->
              <p class="px-1 py-1 text-xs font-bold uppercase tracking-wider text-amber-500">
                Da gestire ({{ daGestire.length }})
              </p>
              <div v-if="daGestire.length === 0" class="px-1 py-3 text-sm text-slate-400">
                Nessuna segnalazione aperta. Tutto in ordine.
              </div>
              <div class="space-y-2 mb-5">
                <div v-for="seg in daGestire" :key="seg._id"
                  class="p-3 rounded-xl border border-amber-100 bg-amber-50/40">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="text-xs font-bold capitalize text-slate-700">{{ formatCategoria(seg.categoria) }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      :class="seg.stato === 'APERTA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
                      {{ seg.stato === 'APERTA' ? 'Confermata' : 'In verifica' }}
                    </span>
                  </div>

                  <!-- descrizione cliccabile: espande/chiude le foto -->
                  <button type="button" @click="toggleFoto(seg._id)"
                    class="w-full text-left flex items-start gap-1.5 mb-3 group">
                    <svg xmlns="http://www.w3.org/2000/svg"
                      class="h-3.5 w-3.5 mt-1 text-slate-400 shrink-0 transition-transform group-hover:text-emerald-600"
                      :class="segEspansa === seg._id ? 'rotate-90' : ''"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <span class="text-sm text-slate-600 leading-snug">{{ seg.descrizione }}</span>
                  </button>

                  <!-- tendina foto -->
                  <div v-if="segEspansa === seg._id" class="mb-3 pl-5">
                    <div v-if="seg.foto && seg.foto.length > 0" class="flex flex-wrap gap-2">
                      <a v-for="(f, i) in seg.foto" :key="i" :href="f" target="_blank" rel="noopener" class="block">
                        <img :src="f" alt="foto segnalazione"
                          class="w-20 h-20 object-cover rounded-lg border border-slate-200 shadow-sm hover:scale-105 transition-transform"
                          loading="lazy" @error="($event.target.style.display='none')" />
                      </a>
                    </div>
                    <p v-else class="text-xs text-slate-400 italic">Nessuna foto allegata.</p>
                  </div>

                  <button type="button"
                    :disabled="chiusuraInCorso === seg._id"
                    @click="chiudiSegnalazione(seg)"
                    class="w-full py-2 text-xs font-bold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-sm shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ chiusuraInCorso === seg._id ? 'Chiusura…' : '✓ Segna come risolta' }}
                  </button>
                </div>
              </div>
 
              <!-- RISOLTE -->
              <p class="px-1 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Risolte ({{ risolte.length }})
              </p>
              <div v-if="risolte.length === 0" class="px-1 py-3 text-sm text-slate-400">
                Ancora nessuna segnalazione risolta.
              </div>
              <div class="space-y-2">
                <div v-for="seg in risolte" :key="seg._id"
                  class="p-3 rounded-xl border border-slate-100 bg-slate-50/60 opacity-80">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="text-xs font-bold capitalize text-slate-500">{{ formatCategoria(seg.categoria) }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Risolta</span>
                  </div>
                  <p class="text-sm text-slate-400 leading-snug line-through">{{ seg.descrizione }}</p>
                </div>
              </div>
            </template>
          </div>
        </div>
 
        <!-- footer: logout -->
        <div class="p-6 border-t border-slate-100 shrink-0 space-y-3">
          <button type="button" @click="isFormStrutturaOpen = true"
            class="w-full py-3.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
            + Registra nuova struttura
          </button>
          <button type="button" @click="handleLogout"
            class="w-full py-3.5 text-sm font-bold rounded-xl text-rose-600 bg-slate-100 hover:bg-rose-600 hover:text-white transition-all">
            Esci dall'account
          </button>
        </div>
      </aside>
    </transition>
 
    <!-- banner di esito chiusura -->
    <transition name="slide-down">
      <div v-if="bannerMsg"
        class="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl shadow-xl flex items-center space-x-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="font-bold">{{ bannerMsg }}</span>
      </div>
    </transition>
    <FormStruttura v-model="isFormStrutturaOpen" @submitted="onStrutturaCreata" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getUser, clearSession } from '../services/auth';
import { getMyStructures, getPrivateReportsByStructure, closePrivateReport } from '../services/structureService';
import Mappa from './Mappa.vue';
import FormStruttura from './FormStruttura.vue';

const router = useRouter();
const user = getUser();

const isSidebarOpen = ref(true);
const mappaRef = ref(null);
 
const strutture = ref([]);
const loadingStrutture = ref(false);
const erroreStrutture = ref('');
 
const strutturaSelezionata = ref(null);
const segnalazioni = ref([]);
const loadingReport = ref(false);
const erroreReport = ref('');
 
const chiusuraInCorso = ref(null);
const segEspansa = ref(null);

function toggleFoto(id) {
  segEspansa.value = segEspansa.value === id ? null : id;
}

const bannerMsg = ref('');

const isFormStrutturaOpen = ref(false);

const STATI_DA_GESTIRE = ['IN_VERIFICA', 'APERTA'];
const daGestire = computed(() =>
  segnalazioni.value.filter(s => STATI_DA_GESTIRE.includes(s.stato))
);
const risolte = computed(() =>
  segnalazioni.value.filter(s => s.stato === 'RISOLTA')
);
 
function formatCategoria(c) {
  return String(c || '').replaceAll('_', ' ');
}

async function caricaStrutture() {
  if (!user?._id) return;
  loadingStrutture.value = true;
  erroreStrutture.value = '';
  try {
    strutture.value = await getMyStructures(user._id);
  } catch (e) {
    erroreStrutture.value = 'Impossibile caricare le tue strutture.';
    console.error(e);
  } finally {
    loadingStrutture.value = false;
  }
}

async function caricaSegnalazioni(strutturaId) {
  loadingReport.value = true;
  erroreReport.value = '';
  segnalazioni.value = [];
  try {
    segnalazioni.value = await getPrivateReportsByStructure(strutturaId);
  } catch (e) {
    erroreReport.value = 'Impossibile caricare le segnalazioni.';
    console.error(e);
  } finally {
    loadingReport.value = false;
  }
}

function selezionaStruttura(s) {
  strutturaSelezionata.value = s;
  caricaSegnalazioni(s._id);
}

function onStrutturaSelezionata(struttura) {
  if (!struttura) {
    strutturaSelezionata.value = null;
    return;
  }
  isSidebarOpen.value = true;
  strutturaSelezionata.value = struttura;
  caricaSegnalazioni(struttura._id);
}

function deselezionaStruttura() {
  strutturaSelezionata.value = null;
  segnalazioni.value = [];
  mappaRef.value?.deselezionaStruttura();
}

async function chiudiSegnalazione(seg) {
  chiusuraInCorso.value = seg._id;
  try {
    const aggiornata = await closePrivateReport(seg._id);
    const idx = segnalazioni.value.findIndex(s => s._id === seg._id);
    if (idx !== -1) {
      segnalazioni.value.splice(idx, 1, { ...segnalazioni.value[idx], stato: aggiornata.stato });
    }
    mappaRef.value?.refresh();
    mostraBanner('Segnalazione contrassegnata come risolta');
  } catch (e) {
    console.error(e);
    erroreReport.value = e.status === 403
      ? 'Non sei autorizzato a chiudere questa segnalazione.'
      : 'Errore durante la chiusura. Riprova.';
  } finally {
    chiusuraInCorso.value = null;
  }
}

async function onStrutturaCreata() {
  await caricaStrutture();
  mappaRef.value?.refreshStrutture();
  mostraBanner('Struttura registrata con successo');
}
 
function mostraBanner(msg) {
  bannerMsg.value = msg;
  setTimeout(() => { bannerMsg.value = ''; }, 4000);
}
 
const handleLogout = () => {
  clearSession();
  router.push('/login');
};
 
const vaiAlProfilo = () => {
  router.push({ name: 'Profilo' });
};
 
onMounted(caricaStrutture);
</script>
 
<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.5s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-20px) translateX(-50%); }
 
.slide-button-enter-active, .slide-button-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-button-enter-from, .slide-button-leave-to {
  transform: translateX(-150%);
  opacity: 0;
}
 
.slide-sidebar-enter-active, .slide-sidebar-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-sidebar-enter-from, .slide-sidebar-leave-to {
  transform: translateX(-120%);
  opacity: 0;
}
</style>