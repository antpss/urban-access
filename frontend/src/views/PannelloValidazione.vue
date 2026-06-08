<template>
  <transition name="fade">
    <div v-if="modelValue && report" class="fixed inset-0 z-9999 flex items-center justify-center p-4">

      <!-- backdrop: click fuori chiude -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
        @click="$emit('update:modelValue', false)"></div>

      <div class="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 z-50">

        <div class="flex justify-between items-start mb-5">
          <div class="flex items-center gap-2">
            <span
              class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              :class="report.stato === 'APERTA'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'">
              {{ report.stato === 'APERTA' ? 'Confermata' : 'In verifica' }}
            </span>
            <span class="text-sm font-semibold text-slate-600">{{ categoriaLabel }}</span>
          </div>
          <button type="button" @click="$emit('update:modelValue', false)"
            class="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p class="text-sm text-slate-600 mb-4 leading-relaxed">{{ report.descrizione }}</p>

        <!-- Barra di avvicinamento alla soglia: solo mentre e in verifica -->
        <div v-if="report.stato === 'IN_VERIFICA'" class="mb-5">
          <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-amber-500 transition-all duration-300" :style="{ width: progressPct + '%' }"></div>
          </div>
          <p class="text-[11px] text-slate-500 mt-1.5 font-medium">
            {{ scoreLocale }} / {{ soglia }} punti di affidabilita raccolti
          </p>
        </div>

        <!-- Esito -->
        <div v-if="esito"
          class="text-sm rounded-xl p-3 mb-4 font-medium"
          :class="esitoOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'">
          {{ esito }}
        </div>

        <button type="button" @click="conferma" :disabled="!puoVotare || isLoading"
          class="w-full py-3.5 font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500
                 hover:from-emerald-600 hover:to-teal-600
                 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed
                 shadow-lg transition-all">
          <span v-if="isLoading">Invio...</span>
          <span v-else-if="report.stato === 'APERTA'">Gia validata dalla community</span>
          <span v-else-if="isAutore">Non puoi validare la tua segnalazione</span>
          <span v-else-if="haVotato">Hai gia confermato</span>
          <span v-else>Conferma questa segnalazione</span>
        </button>

        <!-- Smentita: disponibile sulle segnalazioni votabili, per chi non è l'autore
             e non ha già votato. Smentire abbassa lo score; può archiviare la segnalazione. -->
        <button type="button" @click="smentisci" :disabled="!puoVotare || isLoading"
          class="w-full mt-3 py-3 font-bold rounded-xl border-2 border-rose-200 text-rose-600 bg-white
                 hover:bg-rose-50 hover:border-rose-300
                 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                 transition-all">
          <span v-if="report.stato === 'APERTA'">Smentisci (non più valida)</span>
          <span v-else>Smentisci questa segnalazione</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { authFetch, getUser } from '../services/auth';

const API_BASE_URL = '/api/v1';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  // segnalazione privata selezionata dal marker; deve avere _id, stato, autore, scoreAssociato, categoria, descrizione
  report: { type: Object, default: null }
});

const emit = defineEmits(['update:modelValue', 'validated', 'score-updated', 'archived']);

const user = getUser();

const isLoading = ref(false);
const esito = ref('');
const esitoOk = ref(false);
const haVotato = ref(false);
const scoreLocale = ref(0);

// reset dello stato interno ad ogni apertura su una nuova segnalazione
watch(() => props.modelValue, (open) => {
  if (open && props.report) {
    isLoading.value = false;
    esito.value = '';
    esitoOk.value = false;
    haVotato.value = false;
    scoreLocale.value = props.report.scoreAssociato ?? 0;
  }
});

const soglia = computed(() => props.report?.sogliaValidazione || 10);
const progressPct = computed(() => Math.min(Math.round((scoreLocale.value / soglia.value) * 100), 100));

// id utente: authController.sanitizeUser conserva _id nel documento serializzato
const myId = user?._id;
const isAutore = computed(() => props.report && String(props.report.autore) === String(myId));

const puoVotare = computed(() =>
  props.report?.stato === 'IN_VERIFICA' && !isAutore.value && !haVotato.value
);

const CATEGORIA_LABELS = {
  mancanza_rampa: 'Mancanza rampa',
  bagno_non_accessibile: 'Bagno non accessibile',
  ascensore_guasto: 'Ascensore guasto',
  spazi_interni_stretti: 'Spazi interni stretti',
  altro: 'Altro'
};
const categoriaLabel = computed(() => CATEGORIA_LABELS[props.report?.categoria] || props.report?.categoria || '');

const conferma = async () => {
  if (!props.report) return;
  isLoading.value = true;
  esito.value = '';
  try {
    const response = await authFetch(
      `${API_BASE_URL}/privateReports/${props.report._id}/validations`,
      { method: 'POST' }
    );
    const data = await response.json().catch(() => ({}));

    if (response.status === 201 || response.status === 200) {
      haVotato.value = true;
      esitoOk.value = true;

      if (data.scoreAssociato != null) {
        scoreLocale.value = data.scoreAssociato;
        emit('score-updated', { reportId: props.report._id, scoreAssociato: data.scoreAssociato });
      }

      if (data.validata) {
        esito.value = `Segnalazione validata! Hai ricevuto ${data.puntiPerValidatore} punti.`;
        emit('validated', { reportId: props.report._id, stato: 'APERTA' });
      } else if (data.scoreMancante != null) {
        esito.value = `Voto registrato. Mancano ${data.scoreMancante} punti alla validazione.`;
      } else {
        esito.value = data.message || 'Voto registrato.';
      }
    } else if (response.status === 409) {
      haVotato.value = true;
      esitoOk.value = false;
      esito.value = data.error || 'Hai gia validato questa segnalazione.';
    } else if (response.status === 403) {
      esitoOk.value = false;
      esito.value = data.error || 'Operazione non consentita.';
    } else {
      esitoOk.value = false;
      esito.value = data.error || data.message || 'Errore durante la validazione.';
    }
  } catch (e) {
    esitoOk.value = false;
    esito.value = e.message === 'Failed to fetch' ? 'Server non raggiungibile.' : 'Errore di rete. Riprova.';
  } finally {
    isLoading.value = false;
  }
};

const smentisci = async () => {
  if (!props.report) return;
  isLoading.value = true;
  esito.value = '';
  try {
    const response = await authFetch(
      `${API_BASE_URL}/privateReports/${props.report._id}/disputes`,
      { method: 'POST' }
    );
    const data = await response.json().catch(() => ({}));

    if (response.status === 201) {
      haVotato.value = true;
      esitoOk.value = true;

      if (data.scoreAssociato != null) {
        scoreLocale.value = data.scoreAssociato;
        emit('score-updated', { reportId: props.report._id, scoreAssociato: data.scoreAssociato });
      }

      if (data.archiviata) {
        esito.value = 'Segnalazione archiviata: non era più valida.';
        emit('archived', { reportId: props.report._id });
      } else {
        esito.value = 'Smentita registrata.';
        // se è retrocessa, aggiorno lo stato locale per coerenza del badge
        if (data.statoSegnalazione) {
          emit('score-updated', { reportId: props.report._id, scoreAssociato: data.scoreAssociato, stato: data.statoSegnalazione });
        }
      }
    } else if (response.status === 409) {
      haVotato.value = true;
      esitoOk.value = false;
      esito.value = data.error || 'Hai gia votato questa segnalazione.';
    } else if (response.status === 403) {
      esitoOk.value = false;
      esito.value = data.error || 'Operazione non consentita.';
    } else {
      esitoOk.value = false;
      esito.value = data.error || data.message || 'Errore durante la smentita.';
    }
  } catch (e) {
    esitoOk.value = false;
    esito.value = e.message === 'Failed to fetch' ? 'Server non raggiungibile.' : 'Errore di rete. Riprova.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>