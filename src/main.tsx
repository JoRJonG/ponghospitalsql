import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { installRefreshGuard } from './utils/refreshGuard'
import { HelmetProvider } from 'react-helmet-async'

// Defer non-critical CSS (FontAwesome) to avoid render blocking
setTimeout(() => {
    import('@fortawesome/fontawesome-free/css/all.min.css')
}, 0)

installRefreshGuard({ cooldownMs: 4000, revalidateAfterMs: 60_000 })

createRoot(document.getElementById('root')!).render(
    <HelmetProvider>
        <App />
    </HelmetProvider>
)
