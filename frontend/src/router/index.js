import {createRouter, createWebHistory} from 'vue-router';
import RegisterView from '../views/RegisterView.vue';
import LoginView from '../views/LoginView.vue';
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
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach((to, from, next) => {
    const authed = isAuthenticated();

    // verifica tentativi di accesso se non autenticato a pagine protette
    if (to.meta.requresAuth && !authed) {
        return next({ name: 'Login' });
    }

    // verifica tentativi di accesso se autenticato a pagine per ospiti
    if (to.meta.requireGuest && authed) {
        return next();
    }

    next();

});

export default router;