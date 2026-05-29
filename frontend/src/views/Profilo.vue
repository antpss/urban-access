<template>
  <div class="min-h-screen w-full bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 py-10 px-4">
    <div class="max-w-2xl mx-auto">

      <!-- barra superiore: torna indietro -->
      <div class="flex items-center justify-between mb-6">
        <button type="button" @click="tornaIndietro"
          class="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Indietro
        </button>
      </div>

      <!-- card profilo -->
      <div class="bg-white/95 backdrop-blur rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">

        <!-- intestazione -->
        <div class="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-10 text-white relative">
          <div class="h-20 w-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4 text-3xl font-extrabold">
            {{ iniziali }}
          </div>
          <h1 class="text-2xl font-extrabold tracking-tight">Il mio profilo</h1>
          <p class="text-sm text-emerald-50 font-medium capitalize mt-0.5">{{ form.ruolo }}</p>

          <!-- pulsante di modifica -->
          <button v-if="!isEditing && !isLoading" type="button" @click="abilitaModifica"
            class="absolute top-8 right-8 p-3 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl transition-colors"
            title="Modifica profilo">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        <!-- corpo -->
        <div class="p-8">

          <!-- stato di caricamento iniziale -->
          <div v-if="isLoading" class="py-16 text-center text-slate-400 font-medium">
            Caricamento profilo…
          </div>

          <!-- errore di caricamento (fallita GET) -->
          <div v-else-if="loadError" class="py-10 text-center">
            <p class="text-rose-600 font-bold">{{ loadError }}</p>
            <button type="button" @click="caricaProfilo"
              class="mt-4 px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all">
              Riprova
            </button>
          </div>

          <template v-else>
            <!-- errore di salvataggio (fallita PATCH) -->
            <transition name="fade">
              <div v-if="serverError" class="bg-rose-50 border-l-4 border-rose-500 p-4 mb-6 text-sm text-rose-700 rounded-r-xl">
                <p class="font-bold">{{ serverError }}</p>
                <ul v-if="serverErrorDetails.length > 0" class="list-disc ml-5 mt-1 font-medium">
                  <li v-for="(detail, index) in serverErrorDetails" :key="index">{{ detail.message }}</li>
                </ul>
              </div>
            </transition>

            <!-- banner di conferma salvataggio -->
            <transition name="fade">
              <div v-if="showSuccess" class="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-6 text-sm text-emerald-700 rounded-r-xl font-bold">
                Profilo aggiornato con successo.
              </div>
            </transition>

            <form @submit.prevent="salva" class="space-y-5" novalidate>

              <!-- nome -->
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nome</label>
                <input type="text" v-model="form.nome" :readonly="!isEditing" :disabled="isSaving"
                  class="w-full px-4 py-3 border rounded-xl text-slate-800 outline-none transition-all"
                  :class="campoClass"
                  placeholder="Il tuo nome">
              </div>

              <!-- cognome -->
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Cognome</label>
                <input type="text" v-model="form.cognome" :readonly="!isEditing" :disabled="isSaving"
                  class="w-full px-4 py-3 border rounded-xl text-slate-800 outline-none transition-all"
                  :class="campoClass"
                  placeholder="Il tuo cognome">
              </div>

              <!-- email: sempre readonly, non modificabile -->
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email</label>
                <input type="email" :value="form.email" readonly
                  class="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 outline-none cursor-not-allowed">
                <p class="text-[11px] text-slate-400 mt-1 ml-1">L'email non è modificabile.</p>
              </div>

              <!-- profiloDisabilita: solo per i cittadini -->
              <div v-if="form.ruolo === 'cittadino'">
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Profilo accessibilità</label>

                <!-- modalità lettura: chip -->
                <div v-if="!isEditing">
                  <div v-if="form.profiloDisabilita.length === 0" class="text-sm text-slate-400 italic ml-1">
                    Nessuna disabilità indicata.
                  </div>
                  <div v-else class="flex flex-wrap gap-2">
                    <span v-for="val in form.profiloDisabilita" :key="val"
                      class="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                      {{ labelDisabilita(val) }}
                    </span>
                  </div>
                </div>

                <!-- modalità modifica: checkbox -->
                <div v-else class="space-y-2">
                  <label v-for="opt in opzioniDisabilita" :key="opt.value"
                    class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                    :class="{ 'bg-emerald-100 border-emerald-400': form.profiloDisabilita.includes(opt.value) }">
                    <input type="checkbox" :value="opt.value" v-model="form.profiloDisabilita" :disabled="isSaving"
                      class="w-5 h-5 accent-emerald-500">
                    <span class="font-medium text-slate-700">{{ opt.label }}</span>
                  </label>
                </div>
              </div>

              <!-- azioni: visibili solo in modalità modifica -->
              <div v-if="isEditing" class="pt-4 flex gap-3">
                <button type="button" @click="annulla" :disabled="isSaving"
                  class="flex-1 py-3 px-4 text-sm font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 transition-all">
                  Annulla
                </button>
                <button type="submit" :disabled="isSaving"
                  class="flex-1 py-3 px-4 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 transition-all">
                  <span v-if="isSaving">Salvataggio…</span>
                  <span v-else>Conferma modifiche</span>
                </button>
              </div>
            </form>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authFetch, getToken, getUser, setSession } from '../services/auth';
import { homeRouteByRole } from '../router';

const router = useRouter();
const API_BASE_URL = '/api/v1';

const opzioniDisabilita = [
  { value: 'sediaARotelle', label: 'Uso una sedia a rotelle' },
  { value: 'cecita', label: 'Cecità' },
  { value: 'sordita', label: 'Sordità' },
  { value: 'ausilioDeambulazione', label: 'Uso un ausilio per la deambulazione' }
];
const labelDisabilita = (val) =>
  opzioniDisabilita.find(o => o.value === val)?.label || val;

//stato del form
const form = reactive({
  nome: '',
  cognome: '',
  email: '',
  ruolo: '',
  profiloDisabilita: []
});

//snapshot dei valori pre-modifica, per il ripristino su "Annulla"
let snapshot = null;

const isLoading = ref(true);     //caricamento iniziale (GET)
const loadError = ref('');
const isEditing = ref(false);    //modalità modifica attiva
const isSaving = ref(false);     //salvataggio in corso (PATCH)
const serverError = ref('');
const serverErrorDetails = ref([]);
const showSuccess = ref(false);

const iniziali = computed(() => {
  const n = (form.nome || '').trim()[0] || '';
  const c = (form.cognome || '').trim()[0] || '';
  return (n + c).toUpperCase() || '?';
});

//classe dinamica dei campi testuali in base allo stato editing
const campoClass = computed(() =>
  isEditing.value
    ? 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-emerald-400 focus:bg-white'
    : 'bg-slate-100 border-slate-200 text-slate-500 cursor-default'
);

//popola form e sessione con lo user ricevuto dal server
const popola = (user) => {
  form.nome = user.nome ?? '';
  form.cognome = user.cognome ?? '';
  form.email = user.email ?? '';
  form.ruolo = user.ruolo ?? '';
  form.profiloDisabilita = Array.isArray(user.profiloDisabilita)
    ? [...user.profiloDisabilita]
    : [];
};

//GET /users/me: carica i dati nuovi dal server
const caricaProfilo = async () => {
  isLoading.value = true;
  loadError.value = '';
  try {
    const response = await authFetch(`${API_BASE_URL}/users/me`, { method: 'GET' });

    if (response.status === 401) return;

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Impossibile caricare il profilo.');
    }
    popola(data.user);
  } catch (err) {
    loadError.value = err.message === 'Failed to fetch'
      ? 'Server non raggiungibile.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const abilitaModifica = () => {
  //salvo lo stato corrente per poterlo ripristinare con Annulla
  snapshot = {
    nome: form.nome,
    cognome: form.cognome,
    profiloDisabilita: [...form.profiloDisabilita]
  };
  serverError.value = '';
  serverErrorDetails.value = [];
  showSuccess.value = false;
  isEditing.value = true;
};

const annulla = () => {
  if (snapshot) {
    form.nome = snapshot.nome;
    form.cognome = snapshot.cognome;
    form.profiloDisabilita = [...snapshot.profiloDisabilita];
  }
  isEditing.value = false;
  serverError.value = '';
  serverErrorDetails.value = [];
};

//PATCH /users/me: invia solo i campi della whitelist pertinenti al ruolo
const salva = async () => {
  isSaving.value = true;
  serverError.value = '';
  serverErrorDetails.value = [];
  showSuccess.value = false;

  const payload = {
    nome: form.nome.trim(),
    cognome: form.cognome.trim()
  };
  //profiloDisabilita inviato solo per i cittadini (per gli altri ruoli darebbe 403)
  if (form.ruolo === 'cittadino') {
    payload.profiloDisabilita = form.profiloDisabilita;
  }

  try {
    const response = await authFetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    if (response.status === 401) return;

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data.error || 'Errore durante il salvataggio.');
      err.details = data.details || [];
      throw err;
    }

    //allinea form e sessione allo user restituito dal server
    popola(data.user);
    setSession(getToken(), data.user);

    isEditing.value = false;
    showSuccess.value = true;
    setTimeout(() => { showSuccess.value = false; }, 4000);
  } catch (err) {
    serverError.value = err.message === 'Failed to fetch'
      ? 'Server non raggiungibile.'
      : err.message;
    serverErrorDetails.value = err.details || [];
  } finally {
    isSaving.value = false;
  }
};

//torna alla home corretta in base al ruolo
const tornaIndietro = () => {
  const target = homeRouteByRole[form.ruolo] || homeRouteByRole[getUser()?.ruolo] || 'Login';
  router.push({ name: target });
};

onMounted(caricaProfilo);
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>