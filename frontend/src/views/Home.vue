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
          @click="isModalOpen = true" 
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

    <FormSegnalazione v-model="isModalOpen" @submitted="onSegnalazioneSubmitted" />
  </div>
</template>

<script setup>
import { getUser, clearSession } from '../services/auth';
import { useRouter } from 'vue-router';
import { ref, computed} from 'vue';
import FormSegnalazione from './FormSegnalazione.vue';

const router = useRouter();
const user = getUser();
const API_BASE_URL = '/api/v1';

const isSidebarOpen = ref(false);
const isModalOpen = ref(false);
const showSuccessBanner = ref(false);

const onSegnalazioneSubmitted = () => {
  showSuccessBanner.value = true;
  setTimeout(() => {showSuccessBanner.value = false;}, 5000);
}


const handleLogout = () => {
  clearSession();
  router.push('/login');
};
</script>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.5s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-20px); }
</style>