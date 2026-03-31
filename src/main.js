import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import T from './components/T.vue'

const app = createApp(App)
app.component('T', T)
app.use(router)
app.mount('#app')
