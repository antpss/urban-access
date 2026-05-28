<template>
  <transition name="fade">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">

      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" @click="$emit('update:modelValue', false)"></div>

      <div class="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto z-50">
        <div class="flex justify-between mb-6">
          <h3 class="text-2xl font-extrabold text-slate-800 tracking-tight">Registra una nuova struttura</h3>
          <button type="button" @click="$emit('update:modelValue', false)" class="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="serverError" class="bg-rose-50 border-l-4 border-rose-500 p-4 mb-6 text-sm text-rose-700 rounded-r-xl">
          <p class="font-bold">{{ serverError }}</p>
          <ul v-if="serverErrorDetails.length > 0" class="list-disc ml-5 mt-1 font-medium">
            <li v-for="(detail, index) in serverErrorDetails" :key="index">{{ detail.field }}: {{ detail.message }}</li>
          </ul>
        </div>

        <form @submit.prevent="submitStruttura" class="space-y-5">

          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nome struttura *</label>
            <input v-model="form.nome" @input="validateNome" required type="text"
              placeholder="Es. Bar Centrale"
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all"
              :class="{ 'border-rose-400 focus:ring-rose-500': nomeError }">
            <p v-if="nomeError" class="text-rose-500 text-[11px] mt-1.5 ml-1 font-semibold">{{ nomeError }}</p>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Categoria *</label>
            <select v-model="form.categoria" required
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all">
              <option value="" disabled>Seleziona una categoria</option>
              <option value="ristorante">Ristorante</option>
              <option value="bar">Bar</option>
              <option value="negozio">Negozio</option>
              <option value="ufficio">Ufficio</option>
              <option value="hotel">Hotel</option>
              <option value="studio_medico">Studio medico</option>
              <option value="palestra">Palestra</option>
              <option value="altro">Altro</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Indirizzo *</label>
            <input v-model="form.indirizzo" @input="validateIndirizzo" required type="text"
              placeholder="Es. Via Belenzani 14, 38122 Trento TN"
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all"
              :class="{ 'border-rose-400 focus:ring-rose-500': indirizzoError }">
            <p v-if="indirizzoError" class="text-rose-500 text-[11px] mt-1.5 ml-1 font-semibold">{{ indirizzoError }}</p>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Posizione sulla mappa *</label>
            <MapPicker v-model="posizione" />
            <p v-if="posizioneError" class="text-rose-500 text-[11px] mt-1.5 ml-1 font-semibold">{{ posizioneError }}</p>
          </div>

          <div class="pt-4 flex flex-wrap gap-3">
            <button type="button" @click="$emit('update:modelValue', false)"
              class="flex-1 min-w-[100px] py-3.5 font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
              Annulla
            </button>
            <button type="button" @click="handleLocalize" title="Localizzami"
              class="flex-none px-4 py-3.5 rounded-xl text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button type="submit" :disabled="!isFormValid || isLoading"
              class="flex-[2] min-w-[160px] py-3.5 font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all">
              <span v-if="isLoading">Invio...</span>
              <span v-else>Registra struttura</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>



<script setup>
import { ref, computed, watch } from 'vue';
import { authFetch } from '../services/auth';
import MapPicker from './MapPicker.vue';

const props = defineProps({
  modelValue: { type: Boolean, required: true }
});

const emit = defineEmits(['update:modelValue', 'submitted']);

const API_BASE_URL = '/api/v1';

const isLoading = ref(false);
const serverError = ref('');
const serverErrorDetails = ref([]);
const nomeError = ref('');
const indirizzoError = ref('');
const posizioneError = ref('');


const form = ref({
  nome: '',
  categoria: '',
  indirizzo: ''
});

const posizione = ref(null); 

const resetForm = () => {
  form.value = { nome: '', categoria: '', indirizzo: '' };
  posizione.value = null;
  serverError.value = '';
  serverErrorDetails.value = [];
  nomeError.value = '';
  indirizzoError.value = '';
  posizioneError.value = '';
};

//reset alla chiusura
watch(() => props.modelValue, (val) => {
  if (!val) resetForm();
});

const validateNome = () => {
  const v = form.value.nome.trim();
  if (v.length > 0 && v.length < 2) nomeError.value = 'Nome troppo breve (min 2 caratteri)';
  else if (v.length > 100) nomeError.value = 'Nome troppo lungo (max 100 caratteri)';
  else nomeError.value = '';
};

const validateIndirizzo = () => {
  const v = form.value.indirizzo.trim();
  if (v.length > 0 && v.length < 5) indirizzoError.value = 'Indirizzo troppo breve (min 5 caratteri)';
  else if (v.length > 200) indirizzoError.value = 'Indirizzo troppo lungo (max 200 caratteri)';
  else indirizzoError.value = '';
};

const isFormValid = computed(() =>
  nomeError.value === '' &&
  indirizzoError.value === '' &&
  posizioneError.value === '' &&
  form.value.nome.trim().length >= 2 &&
  form.value.categoria &&
  form.value.indirizzo.trim().length >= 5 &&
  posizione.value !== null
);

const handleLocalize = () => {
  if (!navigator.geolocation) {
    posizioneError.value = 'Geolocalizzazione non supportata dal browser';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      posizione.value = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      posizioneError.value = '';
    },
    () => { posizioneError.value = 'Impossibile ottenere la posizione corrente'; }
  );
};

const submitStruttura = async () => {
  //ultima validazione lato client
  validateNome();
  validateIndirizzo();
  if (!posizione.value) {
    posizioneError.value = 'Seleziona la posizione sulla mappa';
    return;
  }
  if (!isFormValid.value) return;

  isLoading.value = true;
  serverError.value = '';
  serverErrorDetails.value = [];


  const payload = {
    nome: form.value.nome.trim(),
    categoria: form.value.categoria,
    indirizzo: form.value.indirizzo.trim(),
    geolocalizzazione: {
      type: 'Point',
      coordinates: [posizione.value.lng, posizione.value.lat]
    }
  };

  try {
    const response = await authFetch(`${API_BASE_URL}/structures`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data.error || data.message || 'Errore sconosciuto durante l\'invio.');
      err.details = data.details || [];
      throw err;
    }

    emit('update:modelValue', false);
    emit('submitted', data.struttura);
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