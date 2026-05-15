<template>
  <div class="h-screen w-full flex overflow-hidden bg-slate-50 relative">
    
    <main class="flex-1 relative flex items-center justify-center bg-slate-200 z-0">
      <button 
        @click="isSidebarOpen = true" 
        v-if="!isSidebarOpen"
        class="absolute top-6 left-6 p-3 bg-white rounded-xl shadow-lg text-slate-700 hover:text-emerald-600 z-10 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div class="text-center opacity-30 select-none pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-32 w-32 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A2 2 0 013 15.382V6.418a2 2 0 011.106-1.789L9 2m6 18l5.447-2.724A2 2 0 0021 15.382V6.418a2 2 0 00-1.106-1.789L15 2m-6 18V2m6 18V2" />
        </svg>
        <h1 class="text-6xl font-extrabold tracking-widest uppercase text-slate-900">Mappa</h1>
      </div>
    </main>

    <aside 
      class="absolute inset-y-0 left-0 bg-white shadow-2xl z-20 flex flex-col w-80 transform transition-transform duration-300 ease-in-out"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="p-6 border-b border-slate-100 relative">
        <div class="pr-10">
          <h2 class="text-xl font-extrabold text-slate-800 tracking-tight">Ciao {{ user?.nome }}👋!</h2>
          <p class="text-sm text-slate-400 font-medium capitalize mt-0.5">{{ user?.ruolo }}</p>
        </div>
        <button @click="isSidebarOpen = false" class="absolute top-6 right-6 p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 flex-1 overflow-y-auto"></div>

      <div class="p-6 border-t border-slate-100 space-y-4">
        <button 
          v-if="user?.ruolo === 'cittadino'"
          type="button"
          @click="apriModale" 
          class="w-full py-3.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          + Inserisci Segnalazione
        </button>

        <button 
            type="button"
            @click="handleLogout" 
            class="w-full py-3.5 text-sm font-bold rounded-xl text-rose-600 bg-slate-100 hover:bg-rose-600 hover:text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Esci dall'account
        </button>
      </div>
    </aside>

    <transition name="slide-down">
      <div v-if="showSuccessBanner" class="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl shadow-xl flex items-center space-x-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="font-bold">Segnalazione inviata con successo!</span>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" @click="closeModal"></div>
        
        <div class="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto z-50">
          <div class="flex justify-between mb-6">
            <h3 class="text-2xl font-extrabold text-slate-800 tracking-tight">Nuova Segnalazione</h3>
            <button type="button" @click="closeModal" class="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div v-if="serverError" class="bg-rose-50 border-l-4 border-rose-500 p-4 mb-6 text-sm text-rose-700 rounded-r-xl">
            {{ serverError }}
          </div>

          <form @submit.prevent="submitSegnalazione" class="space-y-5">
            <div>
              <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Categoria *</label>
              <select v-model="form.categoria" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all">
                <option value="" disabled>Seleziona una categoria</option>
                <option value="marciapiede_rotto">Marciapiede rotto</option>
                <option value="ostacolo_temporaneo">Ostacolo temporaneo</option>
                <option value="auto_sosta_vietata">Auto in sosta vietata</option>
                <option value="scalino_non_segnalato">Scalino non segnalato</option>
                <option value="pavimentazione_dissestata">Pavimentazione dissestata</option>
                <option value="mancanza_rampa">Mancanza rampa</option>
                <option value="semaforo_non_accessibile">Semaforo non accessibile</option>
                <option value="altro">Altro</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Descrizione * (Min 10 car.)</label>
              <textarea v-model="form.descrizione" required minlength="10" maxlength="1000" rows="3" placeholder="Descrivi il problema..."
                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all resize-none"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Latitudine *</label>
                <input type="number" v-model.number="form.latitudine" step="any" min="-90" max="90" required placeholder="Es. 46.07"
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Longitudine *</label>
                <input type="number" v-model.number="form.longitudine" step="any" min="-180" max="180" required placeholder="Es. 11.12"
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Foto (Max 5)</label>
              <input type="file" @change="handleFileChange" multiple accept="image/jpeg, image/png, image/webp" 
                class="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer transition-all">
              <p v-if="fileError" class="text-rose-500 text-[11px] mt-1.5 ml-1 font-semibold">{{ fileError }}</p>
            </div>

            <div class="pt-4 flex flex-wrap gap-3">
              <button type="button" @click="closeModal" class="flex-1 min-w-[100px] py-3.5 font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                Annulla
              </button>
              
              <button type="button" @click="handleLocalize" title="Localizzami" class="flex-none px-4 py-3.5 rounded-xl text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <button type="submit" :disabled="!isFormValid || isLoading"
                class="flex-[2] min-w-[160px] py-3.5 font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all">
                <span v-if="isLoading">Invio...</span>
                <span v-else>Invia Segnalazione</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { getUser, clearSession, authFetch } from '../services/auth';
import { useRouter } from 'vue-router';
import { ref, computed} from 'vue';

const router = useRouter();
const user = getUser();
const API_BASE_URL = '/api/v1';

const isSidebarOpen = ref(false);
const isModalOpen = ref(false);
const showSuccessBanner = ref(false);
const isLoading = ref(false);
const serverError = ref('');

const form = ref({
  categoria: '',
  descrizione: '',
  latitudine: null,
  longitudine: null,
  foto: []
});

const fileError = ref('');

const apriModale = () => {
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  serverError.value = '';
  fileError.value = '';
  form.value = {categoria: '', descrizione: '', latitudine: null, longitudine: null, foto: []};
};

const isFormValid = computed(() => {
  return form.value.descrizione.length >= 10 &&
         form.value.categoria !== '' &&
         form.value.latitudine !== null && form.value.latitudine >= -90 && form.value.latitudine <= 90 &&
         form.value.longitudine !== null && form.value.longitudine >= -180 && form.value.longitudine <= 180 &&
         fileError.value === '';
});

const handleFileChange = (event) => {
  const files = Array.from(event.target.files);
  fileError.value = files.length > 5 ? 'Puoi caricare al massimo 5 foto.' : '';
  form.value.foto = fileError.value ? [] : files;
};

const submitSegnalazione = async () => {
  if (!isFormValid.value) return;

  isLoading.value = true;
  serverError.value = '';

  const formData = new FormData();
  formData.append('descrizione', form.value.descrizione);
  formData.append('categoria', form.value.categoria);
  formData.append('latitudine', String(form.value.latitudine));
  formData.append('longitudine', String(form.value.longitudine));
  form.value.foto.forEach(f => formData.append('foto', f));

  try {
    const response = await authFetch(`${API_BASE_URL}/segnalazioni`, {
      method: 'POST',
      body: formData
    });

    // usa un oggetto vuoto se la risposta non è JSON per evitare crash
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Errore sconosciuto durante l\'invio della segnalazione.');
    }

    closeModal();
    showSuccessBanner.value = true;
    setTimeout(() => showSuccessBanner.value = false, 3000);
  } catch (error) {
    serverError.value = error.message === 'Failed to fetch' ? 'Server non raggiungibile.' : error.message;
  } finally {
    isLoading.value = false;
  }
}

const handleLogout = () => {
  clearSession();
  router.push('/login');
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.5s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translate(-50%, -20px); }
</style>