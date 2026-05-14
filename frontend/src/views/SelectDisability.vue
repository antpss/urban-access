<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
    <div class="max-w-md w-full relative z-10 bg-white/90 backdrop-blur-xl p-10 rounded-[2rem] shadow-2xl border border-white">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-extrabold text-slate-800 tracking-tight">Profilo accessibilità</h2>
        <p class="mt-2 text-sm text-slate-500">Aiutaci a personalizzare la mappa per te. Puoi modificare in qualsiasi momento.</p>
      </div>

      <div v-if="serverError" class="bg-rose-50 border-l-4 border-rose-500 p-4 mb-6 text-sm text-rose-700 rounded-r-xl">
        {{ serverError }}
      </div>

      <form class="space-y-3" @submit.prevent="handleSubmit" novalidate>
        <label
          v-for="opt in opzioni"
          :key="opt.value"
          class="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all"
          :class="{ 'bg-emerald-100 border-emerald-400': selezionati.includes(opt.value) }">
          <input type="checkbox" :value="opt.value" v-model="selezionati" class="w-5 h-5 accent-emerald-500" />
          <span class="font-medium text-slate-700">{{ opt.label }}</span>
        </label>

        <div class="pt-6 flex gap-3">
          <button type="button" @click="skip"
            class="flex-1 py-3 px-4 text-sm font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
            Salta per ora
          </button>
          <button type="submit" :disabled="isLoading"
            class="flex-1 py-3 px-4 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 transition-all">
            {{ isLoading ? 'Salvataggio…' : 'Conferma' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authFetch, setSession, getToken, getUser } from '../services/auth';

const router = useRouter();

const opzioni = [
  { value: 'sediaARotelle', label: 'Uso una sedia a rotelle' },
  { value: 'cecita', label: 'Cecità' },
  { value: 'sordita', label: 'Sordità' },
  { value: 'ausilioDeambulazione', label: 'Uso un ausilio per la deambulazione' }
];

const selezionati = ref([]);
const isLoading = ref(false);
const serverError = ref('');

const handleSubmit = async () => {
  isLoading.value = true;
  serverError.value = '';
  try {
    const res = await authFetch('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ profiloDisabilita: selezionati.value })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Errore durante il salvataggio.');

    //aggiorno la sessione con l'utente completo restituito dal server
    setSession(getToken(), data.user);
    router.push('/home');
  } catch (err) {
    serverError.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

const skip = () => router.push('/home');
</script>