const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

// salva il token e lo user nel localStorage
export function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// recupera il token JWT dallo storage
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// recupera i dati dell'utente salvati
export function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        clearSession();
        return null;
    }
}

// rimuove il token e i dati utente dallo storage
// usato in fase di logout o al ricevimento dell'errore 401 dal backend
export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// verifica se l'utente è autenticato (ossia se il token è valido)
export function isAuthenticated() {
    const token = getToken();
    if (!token) return false;

    try {
        // decodifica payload di JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        const seconds = Math.floor(Date.now() / 1000);
        if(payload.exp && payload.exp < seconds) {
            clearSession();
            return false;
        }
        return true;
    } catch {
        clearSession();
        return false;
    }
}

// authFetch capisce se il contenuto da mandare al server è JSON o
// contiene anche binari per foto, adattando di conseguenza gli headers e il body della richiesta
export async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // aggiunge header per JSON solo se il body non è un FormData
    // nel caso fosse un FormData, il browser gestisce il Content-Type e il boundary automaticamente
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    // token scaduto o non valido sul backend quindi forza logout
    if (response.status === 401) {
        clearSession();
        // redireziona alla pagina di login
        window.location.href = '/login';
    }
    return response;
}