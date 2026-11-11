import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { installHaptics } from './lib/sound'

installHaptics()

createRoot(document.getElementById('root')!).render(<App />)
