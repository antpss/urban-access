<template>
  <transition name="slide-down">
    <div
      v-if="phase === 'search'"
      class="absolute top-6 left-1/2 -translate-x-1/2 z-[420] w-[min(90vw,520px)]"
    >
      <div class="bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div class="flex items-center px-5 py-3.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="query"
            @input="onInput"
            @keydown.enter="selectFirst"
            type="text"
            placeholder="Dove vuoi andare?"
            class="flex-1 ml-3 bg-transparent outline-none text-slate-800 placeholder-slate-400 font-medium"
            autocomplete="off"
          />
          <div v-if="loadingSuggest" class="ml-2 h-4 w-4 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>

        <div v-if="query.length > 0 && query.length < 3" class="px-5 pb-3 -mt-1">
          <p class="text-xs text-amber-600 font-medium">Inserisci almeno 3 caratteri</p>
        </div>

        <transition name="fade">
          <ul v-if="suggestions.length > 0" class="border-t border-slate-100 max-h-72 overflow-y-auto">
            <li
              v-for="(s, idx) in suggestions"
              :key="idx"
              @click="chooseDestination(s)"
              class="px-5 py-3 flex items-start gap-3 cursor-pointer hover:bg-emerald-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="text-sm text-slate-700 leading-snug">{{ s.label }}</span>
            </li>
          </ul>
        </transition>

        <div v-if="searched && !loadingSuggest && suggestions.length === 0 && query.length >= 3" class="border-t border-slate-100 px-5 py-3">
          <p class="text-sm text-slate-400">Nessun luogo trovato a Trento</p>
        </div>
      </div>
    </div>
  </transition>

  <transition name="slide-left">
    <aside
      v-if="phase === 'result' || phase === 'navigation'"
      class="absolute top-10 bottom-10 right-10 bg-white/95 backdrop-blur shadow-2xl z-[420] flex flex-col w-80 rounded-2xl border border-slate-100"
    >
      <div class="p-6 border-b border-slate-100 relative">
        <button
          @click="reset"
          class="absolute top-5 right-5 p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
          aria-label="Chiudi e annulla percorso"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div class="pr-10">
          <p class="text-xs font-bold uppercase tracking-wide text-emerald-500 mb-1">Destinazione</p>
          <h2 class="text-base font-bold text-slate-800 leading-snug">{{ destination?.shortLabel }}</h2>
        </div>
      </div>

      <div v-if="loadingRoute" class="flex-1 flex flex-col items-center justify-center gap-3 p-6">
        <div class="h-8 w-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400 font-medium">Calcolo del percorso…</p>
      </div>

      <div v-else-if="routeError" class="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-slate-600 font-medium">{{ routeError }}</p>
      </div>
      <template v-else-if="route">
        <div v-if="phase === 'result'" class="p-6 space-y-5 flex-1 overflow-y-auto">
          <div class="flex gap-4">
            <div class="flex-1 bg-emerald-50 rounded-xl p-4">
              <p class="text-xs text-emerald-600 font-bold uppercase tracking-wide">Tempo</p>
              <p class="text-2xl font-extrabold text-slate-800 mt-1">{{ durationText }}</p>
            </div>
            <div class="flex-1 bg-slate-50 rounded-xl p-4">
              <p class="text-xs text-slate-500 font-bold uppercase tracking-wide">Distanza</p>
              <p class="text-2xl font-extrabold text-slate-800 mt-1">{{ distanceText }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 text-slate-400 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span>Percorso a piedi</span>
          </div>
        </div>

        <div v-else class="p-6 flex-1 overflow-y-auto">
          <ol class="space-y-1">
            <li v-for="(m, idx) in maneuvers" :key="idx" class="flex gap-3 py-2 border-b border-slate-50 last:border-0">
              <span class="shrink-0 h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{{ idx + 1 }}</span>
              <span class="text-sm text-slate-700 leading-snug">{{ m }}</span>
            </li>
          </ol>
        </div>

        <div class="p-6 border-t border-slate-100 space-y-3">
          <button
            v-if="phase === 'result'"
            @click="phase = 'navigation'"
            class="w-full py-3.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Avvia la navigazione
          </button>
          <button
            v-else
            @click="phase = 'result'"
            class="w-full py-3.5 text-sm font-bold rounded-xl text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all"
          >
            ← Torna al riepilogo
          </button>

          <button
            @click="reset"
            class="w-full py-3 text-sm font-medium rounded-xl text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Riprova
          </button>
        </div>
      </template>

      <div v-if="routeError" class="p-6 border-t border-slate-100">
        <button @click="reset" class="w-full py-3.5 text-sm font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
          Riprova con un'altra destinazione
        </button>
      </div>
    </aside>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue';
import { geocode, calculateRoute, formatDistance, formatDuration } from '../services/routingService';

const props = defineProps({ mappaRef: { type: Object, default: null } });

const phase = ref('search');
const query = ref('');
const suggestions = ref([]);
const loadingSuggest = ref(false);
const searched = ref(false);

const destination = ref(null);
const route = ref(null);
const loadingRoute = ref(false);
const routeError = ref(null);

let debounceTimer = null;

function onInput() {
  searched.value = false;
  clearTimeout(debounceTimer);
  if (query.value.trim().length < 3) {
    suggestions.value = [];
    return;
  }
  // debounce: aspetta 350ms di pausa nella digitazione prima di chiamare il backend
  debounceTimer = setTimeout(runGeocode, 350);
}

async function runGeocode() {
  loadingSuggest.value = true;
  try {
    suggestions.value = await geocode(query.value.trim());
  } catch (e) {
    suggestions.value = [];
  } finally {
    loadingSuggest.value = false;
    searched.value = true;
  }
}

function selectFirst() {
  if (suggestions.value.length > 0) chooseDestination(suggestions.value[0]);
}

async function chooseDestination(s) {
  destination.value = {
    lng: s.lng,
    lat: s.lat,
    label: s.label,
    shortLabel: s.label.split(',').slice(0, 2).join(',')
  };
  suggestions.value = [];
  phase.value = 'result';
  await computeRoute();
}

async function computeRoute() {
  loadingRoute.value = true;
  routeError.value = null;
  route.value = null;
  try {
    const data = await calculateRoute(destination.value);
    route.value = data;
    // disegna sulla mappa (rimpicciolisce e anima il percorso)
    props.mappaRef?.drawRoute(data, destination.value);
  } catch (e) {
    routeError.value = e.message;
    props.mappaRef?.clearRoute();
  } finally {
    loadingRoute.value = false;
  }
}

function reset() {
  phase.value = 'search';
  query.value = '';
  suggestions.value = [];
  destination.value = null;
  route.value = null;
  routeError.value = null;
  searched.value = false;
  props.mappaRef?.resetView();
}

const distanceText = computed(() => route.value ? formatDistance(route.value.distance) : '');
const durationText = computed(() => route.value ? formatDuration(route.value.duration) : '');

const maneuvers = computed(() => route.value?.maneuvers || []);
</script>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all .4s cubic-bezier(.4,0,.2,1); }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-30px) translateX(-50%); }

.slide-left-enter-active, .slide-left-leave-active { transition: all .4s cubic-bezier(.4,0,.2,1); }
.slide-left-enter-from, .slide-left-leave-to { opacity: 0; transform: translateX(120%); }

.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>