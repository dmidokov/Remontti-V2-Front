import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import T from './components/T.vue'
import { seedUsers } from './services/userService'
import { seedNavigation } from './services/navigationService'
import { seedManagementCards } from './services/managementCardService'
import { seedBranches } from './services/branchService'
import { initMockIconStore } from './db/mockIconStore'

const app = createApp(App)
app.component('T', T)
app.use(router)

// Seed IndexedDB with initial data on app startup.
// initMockIconStore восстанавливает blob URL для ранее загруженных иконок
// (без этого после F5 мок-картинки пропадают: объектные URL живут только в памяти).
Promise.all([
  seedUsers(),
  seedNavigation(),
  seedManagementCards(),
  seedBranches(),
  initMockIconStore(),
]).catch(console.error)

app.mount('#app')
