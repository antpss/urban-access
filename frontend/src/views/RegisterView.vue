<template>
  <div class="min-h-screen flex items-center justify-center bg-green-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-green-100">
      
      <div class="text-center">
        <div class="mx-auto h-12 w-12 bg-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A2 2 0 013 15.382V6.418a2 2 0 011.106-1.789L9 2m6 18l5.447-2.724A2 2 0 0021 15.382V6.418a2 2 0 00-1.106-1.789L15 2m-6 18V2m6 18V2" />
          </svg>
        </div>
        <h2 class="text-3xl font-extrabold text-green-900 tracking-tight">Urban Access</h2>
        <p class="mt-2 text-sm text-green-700">Crea il tuo profilo per una città senza barriere</p>
      </div>

      <transition name="fade">
        <div v-if="serverError" class="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 rounded-r-md">
          {{ serverError }}
        </div>
      </transition>
      <transition name="fade">
        <div v-if="successMessage" class="bg-green-100 border-l-4 border-green-500 p-4 text-sm text-green-800 rounded-r-md font-medium">
          {{ successMessage }}
        </div>
      </transition>

      <form class="mt-6 space-y-5" @submit.prevent="handleRegister" novalidate>
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-1">
            <label for="nome" class="block text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Nome</label>
            <input id="nome" type="text" required v-model="nome"
              class="appearance-none rounded-lg relative block w-full px-3 py-2.5 border border-green-200 placeholder-green-300 text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent sm:text-sm transition-all" 
              placeholder="Mario" />
          </div>

          <div class="col-span-1">
            <label for="cognome" class="block text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Cognome</label>
            <input id="cognome" type="text" required v-model="cognome"
              class="appearance-none rounded-lg relative block w-full px-3 py-2.5 border border-green-200 placeholder-green-300 text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent sm:text-sm transition-all" 
              placeholder="Rossi" />
          </div>
        </div>

        <div>
          <label for="email" class="block text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Email</label>
          <input id="email" type="email" required v-model="email" @input="validateEmail"
            class="appearance-none rounded-lg relative block w-full px-3 py-2.5 border border-green-200 placeholder-green-300 text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent sm:text-sm transition-all" 
            :class="{'border-red-400 focus:ring-red-500': emailError}"
            placeholder="email@esempio.com" />
          <p v-if="emailError" class="text-red-500 text-[10px] mt-1 font-bold italic">{{ emailError }}</p>
        </div>

        <div>
          <label for="password" class="block text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Password</label>
          <div class="relative">
            <input :type="showPassword ? 'text' : 'password'" id="password" required v-model="password" @input="validatePassword"
              class="appearance-none rounded-lg relative block w-full px-3 py-2.5 pr-16 border border-green-200 placeholder-green-300 text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent sm:text-sm transition-all" 
              :class="{'border-red-400 focus:ring-red-500': passwordError}"
              placeholder="Min. 8 caratteri" />
            <button type="button" @click="showPassword = !showPassword" tabindex="-1"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-green-600 hover:text-green-800">
              {{ showPassword ? 'Nascondi' : 'Mostra' }}
            </button>
          </div>
          <p v-if="passwordError" class="text-red-500 text-[10px] mt-1 font-bold italic">{{ passwordError }}</p>
        </div>

        <div>
          <label for="confirmPassword" class="block text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Conferma Password</label>
          <div class="relative">
            <input :type="showConfirmPassword ? 'text' : 'password'" id="confirmPassword" required v-model="confirmPassword" @input="validateConfirmPassword"
              class="appearance-none rounded-lg relative block w-full px-3 py-2.5 pr-16 border border-green-200 placeholder-green-300 text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent sm:text-sm transition-all" 
              :class="{'border-red-400 focus:ring-red-500': confirmPasswordError}" />
            <button type="button" @click="showConfirmPassword = !showConfirmPassword" tabindex="-1"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-green-600 hover:text-green-800">
              {{ showConfirmPassword ? 'Nascondi' : 'Mostra' }}
            </button>
          </div>
          <p v-if="confirmPasswordError" class="text-red-500 text-[10px] mt-1 font-bold italic">{{ confirmPasswordError }}</p>
        </div>

        <div class="pt-4">
          <button type="submit" :disabled="hasErrors || isLoading"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-100 transition-all transform hover:-translate-y-0.5">
            <span v-if="isLoading">Elaborazione...</span>
            <span v-else>Crea Account</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const nome = ref('');
const cognome = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');

const emailError = ref('');
const passwordError = ref('');
const confirmPasswordError = ref('');
const serverError = ref('');
const successMessage = ref('');
const isLoading = ref(false);

const showPassword = ref(false);
const showConfirmPassword = ref(false);

const hasErrors = computed(() => {
  return passwordError.value !== '' || 
         emailError.value !== '' || 
         confirmPasswordError.value !== '' || 
         !nome.value || !cognome.value || !email.value || !password.value || !confirmPassword.value;
});

const validateEmail = () => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (email.value.length > 0 && !emailRegex.test(email.value)) {
    emailError.value = 'Mail non valida';
  } else {
    emailError.value = '';
  }
};

const validatePassword = () => {
  if (password.value.length > 0 && password.value.length < 8) {
    passwordError.value = 'La password deve contenere almeno 8 caratteri.';
  } else {
    passwordError.value = '';
  }
  if (confirmPassword.value.length > 0) validateConfirmPassword();
};

const validateConfirmPassword = () => {
  if (confirmPassword.value.length > 0 && confirmPassword.value !== password.value) {
    confirmPasswordError.value = 'Le password non coincidono.';
  } else {
    confirmPasswordError.value = '';
  }
};

const handleRegister = async () => {
  validateEmail(); validatePassword(); validateConfirmPassword();
  if (hasErrors.value) return;

  isLoading.value = true;
  serverError.value = '';
  successMessage.value = '';

  try {
    const response = await fetch('http://localhost:7000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome.value,
        cognome: cognome.value,
        email: email.value,
        password: password.value
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Errore durante la creazione account.');
    }

    successMessage.value = 'Benvenuto in Urban Access! Registrazione completata.';
    // Reset campi
    nome.value = ''; cognome.value = ''; email.value = ''; password.value = ''; confirmPassword.value = '';
  } catch (error) {
    serverError.value = error.message === 'Failed to fetch' 
      ? 'Il server non risponde. Verifica che il backend sia attivo.' 
      : error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>