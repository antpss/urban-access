import { createRouter, createWebHistory } from 'vue-router';
import RegisterView from '../views/RegisterView.vue';
import LoginView from '../views/LoginView.vue';
import SelectDisability from '../views/SelectDisability.vue';
import Home from '../views/Home.vue';
import HomeProprietario from '../views/HomeProprietario.vue';
import Profilo from '../views/Profilo.vue';
import { isAuthenticated, getUser } from '../services/auth';

const routes = [
    { path: '/', redirect: '/login' },
    {
        path: '/register',
        name: 'Register',
        component: RegisterView,
        meta: { requireGuest: true}
    },
    {
        path: '/login',
        name: 'Login',
        component: LoginView,
        meta: { requireGuest: true }
    },
    {
        path: '/select-disability',
        name: 'SelectDisability',
        component: SelectDisability,
        meta: {requiresAuth: true, role: 'cittadino'}
    },
    {
        path: '/home',
        name: 'Home',
        component: Home,
        meta: { requiresAuth: true, role: 'cittadino' }
    },
    {
        path: '/home/proprietario',
        name: 'HomeProprietario',
        component: HomeProprietario,
        meta: { requiresAuth: true, role: 'proprietario' }
    },
    {
        //profilo personale: comune a tutti i ruoli, nessun vincolo di ruolo
        path: '/profilo',
        name: 'Profilo',
        component: Profilo,
        meta: { requiresAuth: true }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export const homeRouteByRole = {
    cittadino: 'Home',
    proprietario: 'HomeProprietario'
};

router.beforeEach((to, from, next) => {
    const authed = isAuthenticated();
    const user = getUser();

    // verifica tentativi di accesso se non autenticato a pagine protette
    if (to.meta.requiresAuth && !authed) {
        return next({ name: 'Login' });
    }

    // verifica tentativi di accesso se autenticato a pagine per ospiti
    if (to.meta.requireGuest && authed) {
        const targetName = homeRouteByRole[user?.ruolo] || 'Home';
        return next({ name: targetName });
    }

    
    if (to.meta.role && user?.ruolo !== to.meta.role) {
        const targetName = homeRouteByRole[user?.ruolo];
        if (targetName && targetName !== to.name) {
            return next({ name: targetName });
        }
        //fallback se ruolo non mappato: torna al login
        return next({ name: 'Login' });
    }

    return next();
});

export default router;