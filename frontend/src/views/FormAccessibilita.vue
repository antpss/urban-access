<template>
  <transition name="fade">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">

      <!-- backdrop: chiude il modale al click -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" @click="$emit('update:modelValue', false)"></div>

      <div class="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto z-50">

        <div class="flex justify-between mb-2">
          <h3 class="text-2xl font-extrabold text-slate-800 tracking-tight">Accessibilità</h3>
          <button type="button" @click="$emit('update:modelValue', false)" class="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-sm text-slate-500 mb-6">Autocertifica i parametri di <span class="font-semibold text-slate-700">{{ struttura?.nome }}</span>. Con almeno 3 voci attive la struttura ottiene il badge accessibile.</p>

        <!-- anteprima badge: calcolata localmente, solo a scopo di feedback immediato -->
        <div class="mb-6 flex items-center gap-3 rounded-2xl p-4 border transition-colors"
             :class="anteprimaAccessibile ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'">
          <div class="flex items-center justify-center h-10 w-10 rounded-xl"
               :class="anteprimaAccessibile ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="font-bold text-sm" :class="anteprimaAccessibile ? 'text-emerald-700' : 'text-slate-500'">
              {{ anteprimaAccessibile ? 'Badge accessibile attivo' : 'Badge non ancora attivo' }}
            </p>
            <p class="text-xs" :class="anteprimaAccessibile ? 'text-emerald-600' : 'text-slate-400'">
              {{ numAttivi }} / {{ PARAMETRI.length }} parametri attivi (servono almeno {{ SOGLIA }})
            </p>
          </div>
        </div>

        <div v-if="serverError" class="bg-rose-50 border-l-4 border-rose-500 p-4 mb-6 text-sm text-rose-700 rounded-r-xl">
          <p class="font-bold">{{ serverError }}</p>
          <ul v-if="serverErrorDetails.length > 0" class="list-disc ml-5 mt-1 font-medium">
            <li v-for="(detail, index) in serverErrorDetails" :key="index">{{ detail.field }}: {{ detail.message }}</li>
          </ul>
        </div>

        <!-- lista toggle: uno per parametro -->
        <div class="space-y-3">
          <label v-for="p in PARAMETRI" :key="p.key"
                 class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
            <span class="text-sm font-semibold text-slate-700">{{ p.label }}</span>
            <!-- toggle switch -->
            <button type="button" role="switch" :aria-checked="form[p.key]" @click="form[p.key] = !form[p.key]"
                    class="relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors"
                    :class="form[p.key] ? 'bg-emerald-500' : 'bg-slate-300'">
              <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                    :class="form[p.key] ? 'translate-x-5' : 'translate-x-0.5'"></span>
            </button>
          </label>
        </div>

        <div class="pt-6 flex gap-3">
          <button type="button" @click="$emit('update:modelValue', false)"
            class="flex-1 py-3.5 font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            Annulla
          </button>
          <button type="button" @click="submit" :disabled="isLoading"
            class="flex-[2] py-3.5 font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all">
            <span v-if="isLoading">Salvataggio...</span>
            <span v-else>Salva</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { authFetch } from '../services/auth';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  // la struttura da modificare; deve avere _id e (opzionale) accessibilita
  struttura: { type: Object, default: null }
});

const emit = defineEmits(['update:modelValue', 'updated']);

const API_BASE_URL = '/api/v1';
const SOGLIA = 3;

// elenco parametri: la `key` deve combaciare ESATTAMENTE coi campi del modello backend
const PARAMETRI = [
  { key: 'rampa',                label: 'Rampa di accesso' },
  { key: 'ascensore',            label: 'Ascensore' },
  { key: 'bagnoAccessibile',     label: 'Bagno accessibile' },
  { key: 'ingressoSenzaGradini', label: 'Ingresso senza gradini' },
  { key: 'parcheggioRiservato',  label: 'Parcheggio riservato' }
];

const isLoading = ref(false);
const serverError = ref('');
const serverErrorDetails = ref([]);

// stato locale dei toggle, inizializzato a false
const form = ref({
  rampa: false,
  ascensore: false,
  bagnoAccessibile: false,
  ingressoSenzaGradini: false,
  parcheggioRiservato: false
});

// quando il modale si apre, precarica i valori dalla struttura passata.
// alla chiusura azzera gli errori. Niente fetch: i dati arrivano già dal GET /structures.
watch(() => props.modelValue, (aperto) => {
  if (aperto) {
    serverError.value = '';
    serverErrorDetails.value = [];
    const a = props.struttura?.accessibilita || {};
    for (const p of PARAMETRI) {
      form.value[p.key] = a[p.key] === true;
    }
  }
});

const numAttivi = computed(() => PARAMETRI.filter(p => form.value[p.key]).length);
// anteprima locale del badge: NON è autoritativa, serve solo come feedback.
// il valore vero arriva dalla risposta del PATCH.
const anteprimaAccessibile = computed(() => numAttivi.value >= SOGLIA);

const submit = async () => {
  if (!props.struttura?._id) {
    serverError.value = 'Struttura non valida.';
    return;
  }

  isLoading.value = true;
  serverError.value = '';
  serverErrorDetails.value = [];

  // invio TUTTI i 5 campi come booleani. Il backend accetta solo boolean veri
  // (niente stringhe), e `form` contiene già boolean: nessuna coercizione necessaria.
  const payload = {
    rampa: form.value.rampa,
    ascensore: form.value.ascensore,
    bagnoAccessibile: form.value.bagnoAccessibile,
    ingressoSenzaGradini: form.value.ingressoSenzaGradini,
    parcheggioRiservato: form.value.parcheggioRiservato
  };

  try {
    const res = await authFetch(`${API_BASE_URL}/structures/${props.struttura._id}/accessibilita`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error || data.message || 'Errore durante il salvataggio.');
      err.details = data.details || [];
      throw err;
    }

    // propago al genitore la struttura aggiornata (col badge `accessibile` autoritativo)
    emit('updated', data.struttura);
    emit('update:modelValue', false);
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