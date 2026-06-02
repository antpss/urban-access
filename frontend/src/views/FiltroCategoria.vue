<template>
  <!--
    Selettore filtro per tipologia di ostacolo (US9).
    Componente "controllato": non possiede lo stato, lo riceve via v-model (modelValue)
    e notifica il genitore tramite l'evento update:modelValue.
    Valore '' = nessun filtro (mostra tutte le segnalazioni).
    Valore != '' = formato "scope:categoria" (es. "pubblica:marciapiede_rotto").
    Lo scope serve perché 'mancanza_rampa' e 'altro' esistono in entrambi gli enum:
    la sola categoria sarebbe ambigua.
  -->
  <div class="bg-white/95 backdrop-blur shadow-lg rounded-xl border border-slate-100 px-3 py-2 flex items-center gap-2">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 14.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-6.586L3.293 6.707A1 1 0 013 6V4z" />
    </svg>

    <select
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
      class="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer pr-2"
    >
      <option value="">Tutte le tipologie</option>

      <optgroup label="Suolo pubblico">
        <option
          v-for="cat in categoriePubbliche"
          :key="`pub-${cat.value}`"
          :value="`pubblica:${cat.value}`"
        >{{ cat.label }}</option>
      </optgroup>

      <optgroup label="Strutture private">
        <option
          v-for="cat in categoriePrivate"
          :key="`priv-${cat.value}`"
          :value="`privata:${cat.value}`"
        >{{ cat.label }}</option>
      </optgroup>
    </select>
  </div>
</template>

<script setup>

defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

defineEmits(['update:modelValue']);

//enum allineato a SegnalazionePubblica.js
const categoriePubbliche = [
  { value: 'marciapiede_rotto',          label: 'Marciapiede rotto' },
  { value: 'ostacolo_temporaneo',        label: 'Ostacolo temporaneo' },
  { value: 'auto_sosta_vietata',         label: 'Auto in sosta vietata' },
  { value: 'scalino_non_segnalato',      label: 'Scalino non segnalato' },
  { value: 'pavimentazione_dissestata',  label: 'Pavimentazione dissestata' },
  { value: 'semaforo_non_accessibile',   label: 'Semaforo non accessibile' },
  { value: 'mancanza_rampa',             label: 'Mancanza rampa (pubblica)' },
  { value: 'altro',                      label: 'Altro (pubblica)' }
];

//enum allineato a SegnalazionePrivata.js
const categoriePrivate = [
  { value: 'mancanza_rampa',          label: 'Mancanza rampa (privata)' },
  { value: 'bagno_non_accessibile',   label: 'Bagno non accessibile' },
  { value: 'ascensore_guasto',        label: 'Ascensore guasto' },
  { value: 'spazi_interni_stretti',   label: 'Spazi interni stretti' },
  { value: 'altro',                   label: 'Altro (privata)' }
];
</script>