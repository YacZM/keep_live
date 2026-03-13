import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Records from '../views/Records.vue'
import Settings from '../views/Settings.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/records', name: 'Records', component: Records },
  { path: '/settings', name: 'Settings', component: Settings }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
