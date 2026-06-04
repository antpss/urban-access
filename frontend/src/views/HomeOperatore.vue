<template>
  <div class="h-screen w-full flex overflow-hidden bg-slate-50 relative">
    <main class="flex-1 relative bg-slate-200 z-0 rounded-2xl overflow-hidden shadow-inner">
      <!-- header operatore: in alto a destra, non si sovrappone ai controlli heatmap (in alto a sinistra) -->
      <div class="absolute top-6 right-6 z-[401] flex items-center gap-3 bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-slate-100 px-4 py-3">
        <div class="text-right">
          <p class="text-sm font-extrabold text-slate-800 leading-tight">{{ user?.nome }}</p>
          <p class="text-xs text-slate-400 font-medium capitalize">{{ user?.ruolo }}</p>
        </div>
        <button type="button" @click="vaiAlProfilo" title="Vai al profilo"
          class="p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13 13 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button type="button" @click="handleLogout" title="Esci"
          class="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <AdminHeatmap />
    </main>
  </div>
</template>

<script setup>
import { getUser, clearSession } from '../services/auth';
import { useRouter } from 'vue-router';
import AdminHeatmap from './AdminHeatmap.vue';

const router = useRouter();
const user = getUser();

const handleLogout = () => {
  clearSession();
  router.push('/login');
};

const vaiAlProfilo = () => {
  router.push({ name: 'Profilo' });
};
</script>

<style scoped>
</style>