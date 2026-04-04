import { Route, Routes } from 'react-router-dom'

import PublicLayout from './PublicLayout.jsx'
import LandingPage from '../pages/LandingPage.jsx'
import LoginPlaceholder from '../pages/LoginPlaceholder.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPlaceholder />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

