import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthStore } from '@/stores/AuthStore'

// Si hay un token en localStorage (recarga de página), refresca `branches`
// desde /api/auth/me — antes lo hacía un useEffect del AuthProvider.
if (AuthStore.accessToken.value) {
  AuthStore.loadProfile()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
