<template>
  <transition name="fade">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">

      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" @click="$emit('update:modelValue', false)"></div>

      <div class="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto z-50">
        <div class="flex justify-between mb-6">
          <div>
            <h3 class="text-2xl font-extrabold text-slate-800 tracking-tight">Nuova Segnalazione Privata</h3>
            <button v-if="user?.nome" type="button" @click="vaiAlProfilo"
              class="text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors mt-1 flex items-center gap-1"
              title="Vai al tuo profilo">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {{ user.nome }} · profilo
            </button>
          </div>
          <button type="button" @click="$emit('update:modelValue', false)" class="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="serverError" class="bg-rose-50 border-l-4 border-rose-500 p-4 mb-6 text-sm text-rose-700 rounded-r-xl">
          <p class="font-bold">{{ serverError }}</p>
          <ul v-if="serverErrorDetails.length > 0" class="list-disc ml-5 mt-1 font-medium">
            <li v-for="(detail, index) in serverErrorDetails" :key="index">{{ detail.message }}</li>
          </ul>
        </div>

        <form @submit.prevent="submitSegnalazione" class="space-y-5">

          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Struttura Associata</label>
            <div class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p class="text-sm font-bold text-slate-700">{{ struttura?.nome || '—' }}</p>
              <p class="text-xs text-slate-400 font-medium mt-0.5">{{ struttura?.indirizzo }}</p>
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Categoria *</label>
            <select v-model="form.categoria" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all">
              <option value="" disabled>Seleziona una categoria</option>
              <option value="mancanza_rampa">Mancanza rampa d'accesso</option>
              <option value="bagno_non_accessibile">Bagno non accessibile</option>
              <option value="ascensore_guasto">Ascensore guasto/assente</option>
              <option value="spazi_interni_stretti">Spazi interni non a norma</option>
              <option value="altro">Altro</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Descrizione *</label>
            <textarea v-model="form.descrizione" @input="validateDescrizione" required rows="3"
              placeholder="Descrivi il problema (min. 10 caratteri)..."
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all resize-none"
              :class="{ 'border-rose-400 focus:ring-rose-500': descrizioneError }"></textarea>
            <p v-if="descrizioneError" class="text-rose-500 text-[11px] mt-1.5 ml-1 font-semibold">{{ descrizioneError }}</p>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Foto (Max 5)</label>
            <div class="flex items-center gap-2">
              <input ref="fileInput" type="file" @change="handleFileChange" multiple accept="image/jpeg, image/png, image/webp"
                class="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer transition-all">
              <button type="button" @click="clearPhotos" title="Rimuovi foto"
                class="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8m-1-2a1 1 0 00-1-1h-2a1 1 0 00-1 1l-.293 1h4.586L15 5z" />
                </svg>
              </button>
            </div>
            <p v-if="form.foto.length > 0" class="text-[11px] text-slate-500 mt-2 ml-1 font-medium">{{ form.foto.length }} foto selezionate</p>
            <p v-if="fileError" class="text-rose-500 text-[11px] mt-1.5 ml-1 font-semibold">{{ fileError }}</p>
          </div>

          <div class="pt-4 flex flex-wrap gap-3">
            <button type="button" @click="$emit('update:modelValue', false)"
              class="flex-1 min-w-[100px] py-3.5 font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
              Annulla
            </button>
            <button type="submit" :disabled="!isFormValid || isLoading"
              class="flex-[2] min-w-[160px] py-3.5 font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all">
              <span v-if="isLoading">Invio...</span>
              <span v-else>Invia Segnalazione</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { authFetch, getUser } from '../services/auth';

const router = useRouter();
const user = getUser();

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  struttura: { type: Object, default: null }
});

const emit = defineEmits(['update:modelValue', 'submitted']);

const vaiAlProfilo = () => {
  emit('update:modelValue', false);
  router.push({ name: 'Profilo' });
};

const API_BASE_URL = '/api/v1';

const fileInput = ref(null);
const isLoading = ref(false);
const serverError = ref('');
const serverErrorDetails = ref([]);
const descrizioneError = ref('');
const fileError = ref('');

const form = ref({
  categoria: '',
  descrizione: '',
  foto: []
});

const resetForm = () => {
  form.value = {
    categoria: '',
    descrizione: '',
    foto: []
  };
  serverError.value = '';
  serverErrorDetails.value = [];
  descrizioneError.value = '';
  fileError.value = '';
  if (fileInput.value) fileInput.value.value = '';
};

watch(() => props.modelValue, (val) => {
  if (!val) resetForm();
});

const clearPhotos = () => {
  form.value.foto = [];
  fileError.value = '';
  if (fileInput.value) fileInput.value.value = '';
};

const validateDescrizione = () => {
  if (form.value.descrizione.length > 0 && form.value.descrizione.length < 10)
    descrizioneError.value = 'Descrizione troppo breve. (min. 10 caratteri)';
  else if (form.value.descrizione.length > 1000)
    descrizioneError.value = 'Descrizione troppo lunga. (max 1000 caratteri)';
  else descrizioneError.value = '';
};


const coordinateStruttura = computed(() => {
  const coords = props.struttura?.geolocalizzazione?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  return { lng: coords[0], lat: coords[1] };
});

const isFormValid = computed(() =>
  descrizioneError.value === '' &&
  fileError.value === '' &&
  props.struttura?._id &&
  coordinateStruttura.value !== null &&
  form.value.categoria &&
  form.value.descrizione &&
  form.value.descrizione.length >= 10
);

const handleFileChange = (event) => {
  const files = Array.from(event.target.files);
  fileError.value = files.length > 5 ? 'max. 5 foto consentite' : '';
  form.value.foto = files;
};

const submitSegnalazione = async () => {
  validateDescrizione();

  if (!props.struttura?._id || !coordinateStruttura.value) {
    serverError.value = 'Struttura non valida: riapri il form dalla mappa.';
    return;
  }

  if (!isFormValid.value) return;

  isLoading.value = true;
  serverError.value = '';
  serverErrorDetails.value = [];

  const formData = new FormData();
  formData.append('strutturaAssociata', props.struttura._id);
  formData.append('descrizione', form.value.descrizione);
  formData.append('categoria', form.value.categoria);
  formData.append('latitudine', String(coordinateStruttura.value.lat));
  formData.append('longitudine', String(coordinateStruttura.value.lng));

  form.value.foto.forEach(f => formData.append('foto', f));

  try {
    const response = await authFetch(`${API_BASE_URL}/privateReports`, { method: 'POST', body: formData });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || data.message || 'Errore sconosciuto durante l\'invio.');
      err.details = data.details || [];
      throw err;
    }
    emit('update:modelValue', false);
    emit('submitted');
  } catch (error) {
    serverError.value = error.message === 'Failed to fetch' ? 'Server non raggiungibile.' : error.message;
    serverErrorDetails.value = error.details || [];
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>