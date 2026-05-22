<template>
  <div class="space-y-2">
    <div ref="mapContainer" class="w-full h-64 rounded-xl overflow-hidden border border-slate-200"></div>
    <p class="text-[11px] text-slate-500 font-medium ml-1">
      Clicca sulla mappa o trascina il marker per posizionare la struttura.
      <span v-if="modelValue" class="block font-semibold text-emerald-700">
        Lat: {{ modelValue.lat.toFixed(6) }} — Lng: {{ modelValue.lng.toFixed(6) }}
      </span>
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl });


//posizione di default se modelValue non è settato
const props = defineProps({
  modelValue: { type: Object, default: null },
  initialCenter: { type: Object, default: () => ({ lat: 46.0667, lng: 11.1167 }) } //trento
});

const emit = defineEmits(['update:modelValue']);

const mapContainer = ref(null);
let map = null;
let marker = null;

//crea marker draggable nella posizione data
function placeOrMoveMarker(latlng) {
  if (!marker) {
    marker = L.marker(latlng, { draggable: true }).addTo(map);
    //emit ad ogni dragend per aggiornare il v-model
    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      emit('update:modelValue', { lat: pos.lat, lng: pos.lng });
    });
  } else {
    marker.setLatLng(latlng);
  }
}

onMounted(async () => {
  await nextTick();

  const start = props.modelValue || props.initialCenter;

  map = L.map(mapContainer.value, { zoomControl: true }).setView([start.lat, start.lng], 14);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors, © CARTO'
  }).addTo(map);

  //se c'era già una posizione passata via v-model, mostra subito il marker
  if (props.modelValue) {
    placeOrMoveMarker([props.modelValue.lat, props.modelValue.lng]);
  }

  //click sulla mappa = piazza/sposta marker e aggiorna v-model
  map.on('click', (e) => {
    placeOrMoveMarker(e.latlng);
    emit('update:modelValue', { lat: e.latlng.lat, lng: e.latlng.lng });
  });

  setTimeout(() => map?.invalidateSize(), 200);
});

//si permeette al parent di forzare update da fuori
watch(() => props.modelValue, (val) => {
  if (val && map) {
    placeOrMoveMarker([val.lat, val.lng]);
    map.setView([val.lat, val.lng], map.getZoom());
  }
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
    marker = null;
  }
});
</script>