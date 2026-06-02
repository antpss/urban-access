<template>
  <div class="h-screen w-full flex overflow-hidden bg-slate-50 relative">
    
    <main class="flex-1 relative flex items-center justify-center bg-slate-200 z-0 rounded-2xl overflow-hidden shadow-inner">
      
      <transition name="slide-button">
        <button 
          @click="isSidebarOpen = true" 
          v-if="!isSidebarOpen"
          class="absolute top-6 left-6 p-3 bg-white rounded-xl shadow-lg text-slate-700 hover:text-emerald-600 z-[401]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </transition>

      <!-- filtro categoria (US9): overlay in alto a destra sulla mappa -->
      <div class="absolute top-6 right-6 z-[401]">
        <FiltroCategoria v-model="categoriaSelezionata" />
      </div>

      <Mappa ref="mappaRef" :categoria="categoriaSelezionata" />
      <Mappa ref="mappaRef" />
        <SearchRoute :mappa-ref="mappaRef" />
    </main>

    <transition name="slide-sidebar">
      <aside 
        v-if="isSidebarOpen"
        class="absolute top-10 bottom-10 left-10 bg-white/95 backdrop-blur shadow-2xl z-[410] flex flex-col w-80 rounded-2xl border border-slate-100"
      >
        <div class="p-6 border-b border-slate-100 relative">
          <button type="button" @click="vaiAlProfilo"
            class="pr-10 text-left group w-full" title="Vai al tuo profilo">
            <h2 class="text-xl font-extrabold text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">Ciao {{ user?.nome }}👋!</h2>
            <p class="text-sm text-slate-400 font-medium capitalize mt-0.5 group-hover:text-emerald-500 transition-colors">{{ user?.ruolo }} · Vedi profilo</p>
          </button>
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
            @click="isModalOpen = true" 
            class="w-full py-3.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            + Inserisci Segnalazione Pubblica
          </button>

          <button 
            v-if="user?.ruolo === 'cittadino'"
            type="button"
            @click="isModalPrivataOpen = true" 
            class="w-full py-3.5 text-sm font-bold rounded-xl text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            + Inserisci Segnalazione Privata
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
    </transition>

    <transition name="slide-down">
      <div v-if="showSuccessBanner" class="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl shadow-xl flex items-center space-x-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="font-bold">Segnalazione inviata con successo!</span>
      </div>
    </transition>

    <FormSegnalazione v-model="isModalOpen" @submitted="onSegnalazioneSubmitted" />
    <FormSegnalazionePrivata v-model="isModalPrivataOpen" @submitted="onSegnalazioneSubmitted" />
  </div>
</template>

<script setup>
import { getUser, clearSession } from '../services/auth';
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import FormSegnalazione from './FormSegnalazione.vue';
import FormSegnalazionePrivata from './FormSegnalazionePrivata.vue';
import Mappa from './Mappa.vue';
import FiltroCategoria from './FiltroCategoria.vue';
import SearchRoute from './SearchRoute.vue';

const router = useRouter();
const user = getUser();

const isSidebarOpen = ref(false);
const isModalOpen = ref(false);
const isModalPrivataOpen = ref(false);
const showSuccessBanner = ref(false);
const mappaRef = ref(null);

const categoriaSelezionata = ref('');

const onSegnalazioneSubmitted = () => {
  showSuccessBanner.value = true;
  setTimeout(() => { showSuccessBanner.value = false; }, 5000);

  //dopo l'inserimento di una segnalazione si aggiorna la mappa
  mappaRef.value?.refresh();
}

const handleLogout = () => {
  clearSession();
  router.push('/login');
};

const vaiAlProfilo = () => {
  router.push({ name: 'Profilo' });
};
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