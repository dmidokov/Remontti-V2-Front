import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import T from './components/T.vue'
import { seedUsers } from './services/userService'
import { seedNavigation } from './services/navigationService'

const app = createApp(App)
app.component('T', T)
app.use(router)

// Seed IndexedDB with initial data on app startup
Promise.all([
  seedUsers(),
  seedNavigation(),
]).catch(console.error)

app.mount('#app')
