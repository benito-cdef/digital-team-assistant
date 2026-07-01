import './styles/tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AuthGate from './components/AuthGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>
      {({ userEmail, userRole, isEditor, isSuperAdmin }) => (
        <App userEmail={userEmail} userRole={userRole} isEditor={isEditor} isSuperAdmin={isSuperAdmin} />
      )}
    </AuthGate>
  </StrictMode>,
)
