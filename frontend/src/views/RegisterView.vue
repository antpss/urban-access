<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
    
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

    <div class="max-w-md w-full relative z-10 bg-white/90 backdrop-blur-xl p-10 rounded-[2rem] shadow-2xl border border-white">
      
      <div class="text-center mb-8">
        <div class="mx-auto h-16 w-16 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-200 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A2 2 0 013 15.382V6.418a2 2 0 011.106-1.789L9 2m6 18l5.447-2.724A2 2 0 0021 15.382V6.418a2 2 0 00-1.106-1.789L15 2m-6 18V2m6 18V2" />
          </svg>
        </div>
        <h2 class="text-3xl font-extrabold text-slate-800 tracking-tight">Urban Access</h2>
        <p class="mt-2 text-sm text-slate-500">Mappa la tua città, elimina le barriere.</p>
      </div>

      <transition name="fade">
        <div v-if="serverError" class="bg-rose-50 border-l-4 border-rose-500 p-4 mb-6 text-sm text-rose-700 rounded-r-xl">
          {{ serverError }}
        </div>
      </transition>
      <transition name="fade">
        <div v-if="successMessage" class="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-6 text-sm text-emerald-800 rounded-r-xl font-medium">
          {{ successMessage }}
        </div>
      </transition>

      <form class="space-y-5" @submit.prevent="handleRegister" novalidate>
        
        <div>
          <label for="ruolo" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Come vuoi partecipare?</label>
          <div class="relative">
            <select id="ruolo" v-model="ruolo"
              class="appearance-none relative block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white focus:border-transparent sm:text-sm transition-all cursor-pointer font-medium">
              <option value="cittadino">👤 Cittadino (Esplora e segnala)</option>
              <option value="proprietario">🏢 Proprietario (Gestisci struttura)</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-1">
            <label for="nome" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nome</label>
            <input id="nome" type="text" required v-model="nome"
              class="appearance-none block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all sm:text-sm" 
              placeholder="Mario" />
          </div>

          <div class="col-span-1">
            <label for="cognome" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Cognome</label>
            <input id="cognome" type="text" required v-model="cognome"
              class="appearance-none block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all sm:text-sm" 
              placeholder="Rossi" />
          </div>
        </div>

        <!-- Campo Partita IVA: visibile solo per il ruolo "proprietario" -->
        <transition name="slide-fade">
          <div v-if="ruolo === 'proprietario'">
            <label for="partitaIVA" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Partita IVA</label>
            <input id="partitaIVA" type="text" v-model="partitaIVA" @input="validatePartitaIVA" maxlength="11"
              class="appearance-none block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all sm:text-sm" 
              :class="{'border-rose-400 focus:ring-rose-500': partitaIVAError}"
              placeholder="11 cifre numeriche" />
            <p v-if="partitaIVAError" class="text-rose-500 text-[11px] mt-1.5 ml-1 font-semibold">{{ partitaIVAError }}</p>
          </div>
        </transition>

        <div>
          <label for="email" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email</label>
          <input id="email" type="email" required v-model="email" @input="validateEmail"
            class="appearance-none block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all sm:text-sm" 
            :class="{'border-rose-400 focus:ring-rose-500': emailError}"
            placeholder="mario.rossi@esempio.com" />
          <p v-if="emailError" class="text-rose-500 text-[11px] mt-1.5 ml-1 font-semibold">{{ emailError }}</p>
        </div>

        <div>
          <label for="password" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
          <div class="relative">
            <input :type="showPassword ? 'text' : 'password'" id="password" required v-model="password" @input="validatePassword"
              class="appearance-none block w-full px-4 py-3 pr-20 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all sm:text-sm" 
              :class="{'border-rose-400 focus:ring-rose-500': passwordError}"
              placeholder="Minimo 8 caratteri" />
            <button type="button" @click="showPassword = !showPassword" tabindex="-1"
              class="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors">
              {{ showPassword ? 'Nascondi' : 'Mostra' }}
            </button>
          </div>
          <p v-if="passwordError" class="text-rose-500 text-[11px] mt-1.5 ml-1 font-semibold">{{ passwordError }}</p>
        </div>

        <div>
          <label for="confirmPassword" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Conferma Password</label>
          <div class="relative">
            <input :type="showConfirmPassword ? 'text' : 'password'" id="confirmPassword" required v-model="confirmPassword" @input="validateConfirmPassword"
              class="appearance-none block w-full px-4 py-3 pr-20 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all sm:text-sm" 
              :class="{'border-rose-400 focus:ring-rose-500': confirmPasswordError}"
              placeholder="Ripeti la password" />
            <button type="button" @click="showConfirmPassword = !showConfirmPassword" tabindex="-1"
              class="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors">
              {{ showConfirmPassword ? 'Nascondi' : 'Mostra' }}
            </button>
          </div>
          <p v-if="confirmPasswordError" class="text-rose-500 text-[11px] mt-1.5 ml-1 font-semibold">{{ confirmPasswordError }}</p>
        </div>

        <div class="pt-6">
          <button type="submit" :disabled="hasErrors || isLoading"
            class="group relative w-full flex justify-center py-3.5 px-4 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
            <span v-if="isLoading" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creazione in corso...
            </span>
            <span v-else>Crea Account</span>
          </button>
        </div>
        
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const ruolo = ref('cittadino');
const nome = ref('');
const cognome = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const partitaIVA = ref('');

const emailError = ref('');
const passwordError = ref('');
const confirmPasswordError = ref('');
const partitaIVAError = ref('');
const serverError = ref('');
const successMessage = ref('');
const isLoading = ref(false);

const showPassword = ref(false);
const showConfirmPassword = ref(false);

// URL di base delle API - in futuro estraibile in un file di config (.env)
const API_BASE_URL = '/api/v1';

const hasErrors = computed(() => {
  // Campi sempre obbligatori
  const baseInvalid = passwordError.value !== '' || 
         emailError.value !== '' || 
         confirmPasswordError.value !== '' || 
         !nome.value || !cognome.value || !email.value || !password.value || !confirmPassword.value;
  
  // Se è proprietario, controlla anche partita IVA
  if (ruolo.value === 'proprietario') {
    return baseInvalid || partitaIVAError.value !== '' || !partitaIVA.value;
  }
  return baseInvalid;
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
    passwordError.value = 'Minimo 8 caratteri.';
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

const validatePartitaIVA = () => {
  // La partita IVA italiana deve essere di esattamente 11 cifre numeriche
  const pivaRegex = /^\d{11}$/;
  if (partitaIVA.value.length > 0 && !pivaRegex.test(partitaIVA.value)) {
    partitaIVAError.value = 'La partita IVA deve essere composta da 11 cifre numeriche.';
  } else {
    partitaIVAError.value = '';
  }
};

const handleRegister = async () => {
  validateEmail(); validatePassword(); validateConfirmPassword();
  if (ruolo.value === 'proprietario') validatePartitaIVA();
  if (hasErrors.value) return;

  isLoading.value = true;
  serverError.value = '';
  successMessage.value = '';

  // Endpoint dinamico in base al ruolo selezionato nella tendina
  const endpointUrl = ruolo.value === 'cittadino'
    ? `${API_BASE_URL}/auth/register/citizen`
    : `${API_BASE_URL}/auth/register/owner`;

  // Payload base, comune a entrambi i ruoli
  const payload = {
    nome: nome.value,
    cognome: cognome.value,
    email: email.value,
    password: password.value
  };

  // Aggiunta del campo partitaIVA solo per il proprietario
  if (ruolo.value === 'proprietario') {
    payload.partitaIVA = partitaIVA.value;
  }

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Errore durante la creazione account.');
    }

    successMessage.value = 'Benvenuto! Registrazione completata con successo.';
    
    // Reset di tutti i campi
    nome.value = ''; cognome.value = ''; email.value = ''; password.value = ''; 
    confirmPassword.value = ''; partitaIVA.value = ''; ruolo.value = 'cittadino';
  } catch (error) {
    serverError.value = error.message === 'Failed to fetch' 
      ? 'Il server non risponde. Riprova più tardi.' 
      : error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Animazione per il campo Partita IVA che appare/scompare */
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.slide-fade-enter-from, .slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}
.slide-fade-enter-to, .slide-fade-leave-from {
  opacity: 1;
  max-height: 100px;
}
</style>