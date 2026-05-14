<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-slate-800">Ciao {{ user?.nome }}!</h1>
      <p class="text-slate-500 mt-2">Ruolo: {{ user?.ruolo }}</p>
      <p v-if="user?.profiloDisabilita?.length" class="text-slate-500 mt-2">
        Profilo: {{ user.profiloDisabilita.join(', ') }}
      </p>
      <button @click="handleLogout" class="mt-6 px-4 py-2 bg-rose-500 text-white rounded-lg">Logout</button>
    </div>
  </div>
</template>

<script setup>
import { getUser, clearSession } from '../services/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = getUser();

const handleLogout = () => {
  clearSession();
  router.push('/login');
};
</script>