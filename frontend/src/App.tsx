import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LabPage } from './pages/LabPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { ResearchPage } from './pages/ResearchPage';
import { AboutPage } from './pages/AboutPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lab" element={<LabPage />} />
        <Route path="/strategies" element={<StrategiesPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/about" element={<AboutPage />} />
        {/* Fallback to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
