<template>
  <transition name="slide-vetrina">
    <aside
      v-if="struttura"
      class="absolute top-10 bottom-10 right-10 bg-white/95 backdrop-blur shadow-2xl z-[420] flex flex-col w-96 rounded-2xl border border-slate-100"
    >

      <div class="p-6 border-b border-slate-100 relative">
        <button @click="$emit('close')"
          class="absolute top-6 right-6 p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="pr-10">
          <span class="inline-block text-xs font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg mb-2">
            {{ struttura.categoria }}
          </span>
          <h2 class="text-xl font-extrabold text-slate-800 tracking-tight leading-snug">
            {{ struttura.nome }}
          </h2>
          <p class="text-sm text-slate-400 font-medium mt-1">{{ struttura.indirizzo }}</p>
        </div>
      </div>

      <div class="p-6 flex-1 overflow-y-auto">
        <h3 class="text-sm font-bold text-slate-700 mb-3">Informazioni di accessibilità</h3>
        <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p class="text-sm text-slate-400 font-medium">
            Le informazioni di accessibilità saranno mostrate qui.
          </p>
        </div>
      </div>
    </aside>
  </transition>
</template>

<script setup>
defineProps({
  struttura: { type: Object, default: null }
});
defineEmits(['close']);
</script>

<style scoped>
.slide-vetrina-enter-active, .slide-vetrina-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-vetrina-enter-from, .slide-vetrina-leave-to {
  transform: translateX(120%);
  opacity: 0;
}
</style>