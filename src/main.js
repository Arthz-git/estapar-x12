import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import 'primeicons/primeicons.css'
import Vue3Toastify from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';

createApp(App)
    .use(Vue3Toastify, {
        autoClose: 3000,
        position: 'top-center'
    })
    .mount('#app')
