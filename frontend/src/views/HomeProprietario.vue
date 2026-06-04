<template>
  <div class="min-h-screen w-full bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30">

    <header class="bg-white/90 backdrop-blur border-b border-slate-100 sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-extrabold text-slate-800 tracking-tight">Ciao {{ user?.nome }} 👋</h1>
          <p class="text-xs text-slate-400 font-medium capitalize mt-0.5">Area {{ user?.ruolo }}</p>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" @click="vaiAlProfilo"
            class="px-5 py-2.5 text-sm font-bold rounded-xl text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all">
            Profilo
          </button>
          <button type="button" @click="handleLogout"
            class="px-5 py-2.5 text-sm font-bold rounded-xl text-rose-600 bg-slate-100 hover:bg-rose-600 hover:text-white transition-all">
            Esci
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-10 space-y-10">

      <section class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 class="text-2xl font-extrabold text-slate-800 tracking-tight">Le mie strutture</h2>
            <p class="text-sm text-slate-500 mt-1">Gestisci le attività commerciali registrate sotto il tuo account.</p>
          </div>
          <button type="button" @click="isFormOpen = true"
            class="px-5 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
            + Registra struttura
          </button>
        </div>

        <div v-if="strutture.length === 0" class="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p class="text-slate-600 font-semibold">Nessuna struttura registrata.</p>
          <p class="text-sm text-slate-400 mt-1">Inizia registrando la tua prima attività commerciale.</p>
        </div>

        <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="s in strutture" :key="s._id"
              class="bg-slate-50 border border-slate-100 rounded-xl p-5 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all flex flex-col">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-bold text-slate-800">{{ s.nome }}</p>
                <p class="text-xs text-slate-400 capitalize mt-0.5">{{ s.categoria }}</p>
              </div>
              <!--badge accessibilità mostrato solo se la struttura è accessibile-->
              <span v-if="s.accessibile"
                    class="flex-none inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Accessibile
              </span>
            </div>
            <p class="text-sm text-slate-500 mt-2 flex-1">{{ s.indirizzo }}</p>
            <!--pulsante che apre il form di autocertificazione per questa struttura -->
            <button type="button" @click="apriAccessibilita(s)"
                    class="mt-4 w-full py-2 text-sm font-bold rounded-lg text-emerald-600 bg-white border border-emerald-200 hover:bg-emerald-50 transition-colors">
              Modifica accessibilità
            </button>
          </li>
        </ul>
      </section>

      <section class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <h2 class="text-2xl font-extrabold text-slate-800 tracking-tight">Segnalazioni sulle tue strutture</h2>
        <p class="text-sm text-slate-500 mt-1 mb-6">Visualizza e gestisci le segnalazioni che i cittadini hanno inserito sulle tue strutture.</p>
        <div class="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
          <p class="text-slate-600 font-semibold">Funzionalità in arrivo</p>
          <p class="text-sm text-slate-400 mt-1">Sarà disponibile in una prossima release.</p>
        </div>
      </section>

    </main>

    <transition name="slide-down">
      <div v-if="showSuccessBanner" class="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl shadow-xl flex items-center space-x-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="font-bold">{{ successMessage }}</span>
      </div>
    </transition>

    <FormStruttura v-model="isFormOpen" @submitted="onStrutturaSubmitted" />
    <FormAccessibilita v-model="isAccessOpen" :struttura="strutturaSelezionata" @updated="onAccessibilitaUpdated" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getUser, clearSession, authFetch } from '../services/auth';
import FormStruttura from './FormStruttura.vue';
import FormAccessibilita from './FormAccessibilita.vue';

const router = useRouter();
const user = getUser();

const isFormOpen = ref(false);
const showSuccessBanner = ref(false);
const successMessage = ref('Struttura registrata con successo!');

//stato del modale accessibilità + struttura attualmente selezionata
const isAccessOpen = ref(false);
const strutturaSelezionata = ref(null);

//stato della lista strutture
const strutture = ref([]);
const isLoading = ref(true);
const loadError = ref('');


const fetchStrutture = async () => {
  isLoading.value = true;
  loadError.value = '';

  try {
    if (!user?._id) {
      throw new Error('Sessione utente non valida');
    }
    const res = await authFetch(`/api/v1/structures?proprietario=${user._id}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Errore ${res.status}`);
    }
    const data = await res.json();
    strutture.value = data.strutture || [];

  } catch (e) {
    loadError.value = e.message === 'Failed to fetch'
      ? 'Server non raggiungibile.'
      : e.message;
  } finally {
    isLoading.value = false;
  }
};


const onStrutturaSubmitted = (nuovaStruttura) => {
  if (nuovaStruttura) strutture.value.unshift(nuovaStruttura);
  successMessage.value = 'Struttura registrata con successo!';
  showSuccessBanner.value = true;
  setTimeout(() => { showSuccessBanner.value = false; }, 4000);
};


const apriAccessibilita = (s) => {
  strutturaSelezionata.value = s;
  isAccessOpen.value = true;
};


const onAccessibilitaUpdated = (strutturaAggiornata) => {
  if (!strutturaAggiornata) return;
  const i = strutture.value.findIndex(s => s._id === strutturaAggiornata._id);
  if (i !== -1) strutture.value[i] = strutturaAggiornata;
  successMessage.value = 'Accessibilità aggiornata!';
  showSuccessBanner.value = true;
  setTimeout(() => { showSuccessBanner.value = false; }, 4000);
};


const handleLogout = () => {
  clearSession();
  router.push('/login');
};

onMounted(fetchStrutture);
const vaiAlProfilo = () => {
  router.push({ name: 'Profilo' });
};
</script>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.5s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-20px) translateX(-50%); }
</style>