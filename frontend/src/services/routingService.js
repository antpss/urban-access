import { authFetch } from './auth';
 
const API_BASE_URL = '/api/v1';

// traduce in testo la lista di candidati restituita dal backend
export async function geocode(query) {
    const params = new URLSearchParams({ q: query });
    const res = await authFetch(`${API_BASE_URL}/geocode?${params}`);
 
    if (!res.ok) {
        const err = new Error('Geocoding fallito');
        err.status = res.status;
        throw err;
    }
    const data = await res.json();
    return data.candidati || [];
}

// Calcola il percorso pedonale dall'origine (hardcoded Trento nel backend)
export async function calculateRoute(destination) {
    const to = `${destination.lng},${destination.lat}`;
    const params = new URLSearchParams({ to });
    const res = await authFetch(`${API_BASE_URL}/routes?${params}`);
 
    if (!res.ok) {
        let message = 'Impossibile calcolare il percorso';
        if (res.status === 422) message = 'Destinazione non raggiungibile a piedi';
        if (res.status === 502) message = 'Servizio di routing non disponibile, riprova';
        const err = new Error(message);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

export function formatDistance(meters) {
    if (meters < 1000) return `${meters} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}
 
export function formatDuration(seconds) {
    const min = Math.round(seconds / 60);
    if (min < 1) return '< 1 min';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h} h ${m} min`;
}