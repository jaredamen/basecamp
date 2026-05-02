import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './styles/globals.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Global default for every motion.* component — snappy spring without
        overshoot. Individual components can still override via their own
        `transition` prop. */}
    <MotionConfig transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
      <App />
    </MotionConfig>
  </StrictMode>,
)
