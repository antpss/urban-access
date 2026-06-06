import { authFetch } from './auth';

const API_BASE_URL = '/api/v1';

// dettaglio struttura
export async function getStructureById(id) {
    const res = await authFetch(`${API_BASE_URL}/structures/${id}`);
    if (!res.ok) {
        const err = new Error('Impossibile caricare la struttura');
        err.status = res.status;
        throw err;
    }
    const data = await res.json();
    return data.struttura;
}

export async function getPrivateReportsByStructure(strutturaId) {
    const params = new URLSearchParams({ strutturaAssociata: strutturaId });
    const res = await authFetch(`${API_BASE_URL}/privateReports?${params}`);
    if (!res.ok) {
        const err = new Error('Impossibile caricare le segnalazioni');
        err.status = res.status;
        throw err;
    }
    const data = await res.json();
    return data.segnalazioni || [];
}

export async function closePrivateReport(reportId) {
    const res = await authFetch(`${API_BASE_URL}/privateReports/${reportId}/stato`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato: 'RISOLTA' })
    });
    if (!res.ok) {
        const err = new Error('Impossibile chiudere la segnalazione');
        err.status = res.status;
        throw err;
    }
    const data = await res.json();
    return data.segnalazione;
}

export async function getMyStructures(proprietarioId) {
    const params = new URLSearchParams({ proprietario: proprietarioId });
    const res = await authFetch(`${API_BASE_URL}/structures?${params}`);
    if (!res.ok) {
        const err = new Error('Impossibile caricare le tue strutture');
        err.status = res.status;
        throw err;
    }
    const data = await res.json();
    return data.strutture || [];
}