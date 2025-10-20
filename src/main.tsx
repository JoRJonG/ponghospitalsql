import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import '@fortawesome/fontawesome-free/css/all.min.css'
import { installRefreshGuard } from './utils/refreshGuard'

installRefreshGuard({ cooldownMs: 4000, revalidateAfterMs: 60_000 })

createRoot(document.getElementById('root')!).render(<App />)
