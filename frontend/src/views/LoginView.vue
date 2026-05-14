<template>
    <div v-if="!isLoggedIn" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
    <div class="max-w-md w-full relative z-10 bg-white/90 backdrop-blur-xl p-10 rounded-[2rem] shadow-2xl border border-white">
        <div class="text-center mb-8">
        <div class="mx-auto h-16 w-16 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-200 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
        </div>
        <h2 class="text-3xl font-extrabold text-slate-800 tracking-tight">Bentornato</h2>
        <p class="mt-2 text-sm text-slate-500">Accedi per continuare a mappare la tua città.</p>
        </div>
        <transition name="fade">
        <div v-if="serverError" class="bg-rose-50 border-l-4 border-rose-500 p-4 mb-6 text-sm text-rose-700 rounded-r-xl">
            {{ serverError }}
        </div>
        </transition>
        <form class="space-y-5" @submit.prevent="handleLogin" novalidate>
        <div>
            <label for="email" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email</label>
            <input id="email" type="email" required v-model="email"
                class="appearance-none block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all sm:text-sm" 
                placeholder="mario.rossi@esempio.com" />
        </div>
        <div>
            <label for="password" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
            <div class="relative">
            <input :type="showPassword ? 'text' : 'password'" id="password" required v-model="password" @input="clearError"
                class="appearance-none block w-full px-4 py-3 pr-20 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all sm:text-sm" 
                placeholder="Inserisci la tua password" />
            <button type="button" @click="showPassword = !showPassword" tabindex="-1"
                class="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors">
                {{ showPassword ? 'Nascondi' : 'Mostra' }}
            </button>
            </div>
        </div>

        <div class="pt-6">
            <button type="submit" :disabled="hasErrors || isLoading"
            class="group relative w-full flex justify-center py-3.5 px-4 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
            <span v-if="isLoading" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Accesso in corso...
            </span>
            <span v-else>Login</span>
            </button>
        </div>
        <div class="text-center mt-4">
            <p class="text-sm text-slate-600">
            Non hai un account? 
            <a href="#" @click.prevent="goToRegister" class="font-bold text-emerald-600 hover:text-emerald-500 transition-colors">Registrati qui</a>
            </p>
        </div>
        </form>
    </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { setSession } from '../services/auth';

const router = useRouter();

const email = ref('');
const password = ref('');
const serverError = ref('');
const isLoading = ref(false);
const showPassword = ref(false);

const API_BASE_URL = '/api/v1';

const hasErrors = computed(() => !email.value || !password.value);

const clearError = () => { serverError.value = ''; };

const handleLogin = async () => {
  if (hasErrors.value) return;

  isLoading.value = true;
  serverError.value = '';

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // cattura l'errore generico come "Credenziali non valide" 
      throw new Error(data.error || data.message || "Errore durante l'accesso.");
    }

    setSession(data.token, data.user);
    router.push('/home');
  } catch (error) {
    serverError.value = error.message === 'Failed to fetch'
      ? 'Il server non risponde. Riprova più tardi.'
      : error.message;
  } finally {
    isLoading.value = false;
  }
};

const goToRegister = () => router.push('/register');
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>