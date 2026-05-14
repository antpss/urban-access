import {createRouter, createWebHistory} from 'vue-router';
import RegisterView from '../views/RegisterView.vue';
import LoginView from '../views/LoginView.vue';
import SelectDisability from '../views/SelectDisability.vue';
import { isAuthenticated } from '../services/auth';

const routes = [
    {
        path: '/',
        redirect: '/login'
    },
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
        meta: {requiresAuth: true, requiresRole: 'cittadino'}
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach((to, from, next) => {
    const authed = isAuthenticated();

    // verifica tentativi di accesso se non autenticato a pagine protette
    if (to.meta.requiresAuth && !authed) {
        return next({ name: 'Login' });
    }

    // verifica tentativi di accesso se autenticato a pagine per ospiti
    if (to.meta.requiresGuest && authed) {
        return next({ name: 'Home' });  
    }

    
    if (to.meta.role && user?.ruolo !== to.meta.role) {
        return next({ name: 'Home' });
    }


    next();

});

export default router;