<template>
  <transition name="slide-vetrina">
    <aside
      v-if="struttura"
      class="absolute top-10 bottom-10 right-10 bg-white/95 backdrop-blur shadow-2xl z-[420] flex flex-col w-96 rounded-2xl border border-slate-100"
    >

      <div class="p-6 border-b border-slate-100 relative">
        <button @click="$emit('close')"
          class="absolute top-6 right-6 p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="pr-10">
          <span class="inline-block text-xs font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg mb-2">
            {{ dati.categoria }}
          </span>
          <h2 class="text-xl font-extrabold text-slate-800 tracking-tight leading-snug">
            {{ dati.nome }}
          </h2>
          <p class="text-sm text-slate-400 font-medium mt-1">{{ dati.indirizzo }}</p>

          <span v-if="dati.accessibile"
            class="inline-flex items-center gap-1 mt-3 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Struttura accessibile
          </span>
        </div>
      </div>

      <div class="p-6 flex-1 overflow-y-auto space-y-8">

        <section>
          <h3 class="text-sm font-bold text-slate-700 mb-3">Informazioni di accessibilità</h3>

          <div v-if="loadingDettaglio" class="text-sm text-slate-400 font-medium py-4">
            Caricamento…
          </div>

          <ul v-else class="space-y-2">
            <li v-for="voce in vociAccessibilita" :key="voce.key"
              class="flex items-center justify-between rounded-xl border px-3 py-2.5"
              :class="voce.attivo
                ? 'border-emerald-100 bg-emerald-50'
                : 'border-slate-100 bg-slate-50'">
              <span class="text-sm font-medium"
                :class="voce.attivo ? 'text-emerald-800' : 'text-slate-400'">
                {{ voce.label }}
              </span>
              <svg v-if="voce.attivo" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </li>
          </ul>
        </section>

        <section>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-700">Segnalazioni di accessibilità</h3>
            <span v-if="!loadingPrivate && privateList.length"
              class="text-xs font-bold text-slate-400">{{ privateList.length }}</span>
          </div>

          <div v-if="loadingPrivate" class="text-sm text-slate-400 font-medium py-4">
            Caricamento…
          </div>

          <div v-else-if="errorePrivate" class="rounded-xl border border-rose-100 bg-rose-50 p-4 text-center">
            <p class="text-sm text-rose-600 font-medium">{{ errorePrivate }}</p>
          </div>

          <div v-else-if="privateList.length === 0"
            class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p class="text-sm text-slate-400 font-medium">Nessuna segnalazione attiva per questa struttura.</p>
          </div>

          <ul v-else class="space-y-3">
            <li v-for="seg in privateList" :key="seg._id"
              class="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div class="flex items-start justify-between gap-2">
                <span class="text-sm font-bold text-slate-700 capitalize">
                  {{ formatCategoria(seg.categoria) }}
                </span>
                <span class="shrink-0 text-xs font-bold px-2 py-1 rounded-lg"
                  :class="seg.stato === 'APERTA'
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-amber-700 bg-amber-50'">
                  {{ seg.stato === 'APERTA' ? 'Confermata' : 'In verifica' }}
                </span>
              </div>

              <p class="text-sm text-slate-500 mt-1.5 leading-snug">{{ seg.descrizione }}</p>

              <div v-if="seg.stato === 'IN_VERIFICA'" class="mt-3">
                <div class="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
                  <span>Validazione crowdsourcing</span>
                  <span>{{ seg.scoreAssociato ?? 0 }} / {{ seg.sogliaValidazione ?? 10 }}</span>
                </div>
                <div class="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full rounded-full bg-amber-400 transition-all"
                    :style="{ width: percentuale(seg) + '%' }"></div>
                </div>
              </div>
            </li>
          </ul>
        </section>

      </div>

      <div v-if="isCittadino" class="p-6 border-t border-slate-100">
        <button
          type="button"
          @click="$emit('nuova-segnalazione')"
          class="w-full py-3.5 text-sm font-bold rounded-xl text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          + Inserisci Segnalazione Privata
        </button>
      </div>
    </aside>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { getStructureById, getPrivateReportsByStructure } from '../services/structureService';
import { getUser } from '../services/auth';

const props = defineProps({
  struttura: { type: Object, default: null }
});
defineEmits(['close', 'nuova-segnalazione']);


const isCittadino = computed(() => getUser()?.ruolo === 'cittadino');

const dati = ref({});
const loadingDettaglio = ref(false);

const privateList = ref([]);
const loadingPrivate = ref(false);
const errorePrivate = ref('');

const ETICHETTE = {
  rampa: 'Rampa di accesso',
  ascensore: 'Ascensore',
  bagnoAccessibile: 'Bagno accessibile',
  ingressoSenzaGradini: 'Ingresso senza gradini',
  parcheggioRiservato: 'Parcheggio riservato'
};

const vociAccessibilita = computed(() => {
  const acc = dati.value.accessibilita || {};
  return Object.keys(ETICHETTE).map(key => ({
    key,
    label: ETICHETTE[key],
    attivo: acc[key] === true
  }));
});

function formatCategoria(cat) {
  return String(cat || '').replace(/_/g, ' ');
}

function percentuale(seg) {
  const score = seg.scoreAssociato ?? 0;
  const soglia = seg.sogliaValidazione ?? 10;
  if (soglia <= 0) return 0;
  return Math.min(100, Math.round((score / soglia) * 100));
}

watch(() => props.struttura, async (nuova) => {
  if (!nuova) {
    dati.value = {};
    privateList.value = [];
    errorePrivate.value = '';
    return;
  }

  dati.value = { ...nuova };

  loadingDettaglio.value = true;
  try {
    const fresca = await getStructureById(nuova._id);
    dati.value = { ...nuova, ...fresca };
  } catch (e) {
    console.error('Dettaglio struttura non disponibile, uso dati mappa:', e.status);
  } finally {
    loadingDettaglio.value = false;
  }

  loadingPrivate.value = true;
  errorePrivate.value = '';
  try {
    privateList.value = await getPrivateReportsByStructure(nuova._id);
  } catch (e) {
    errorePrivate.value = 'Impossibile caricare le segnalazioni.';
    privateList.value = [];
  } finally {
    loadingPrivate.value = false;
  }
}, { immediate: true });
</script>

<style scoped>
.slide-vetrina-enter-active, .slide-vetrina-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-vetrina-enter-from, .slide-vetrina-leave-to {
  transform: translateX(120%);
  opacity: 0;
}
</style>