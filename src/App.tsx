// src/App.tsx - Updated main app with clean architecture
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { MainDashboard } from './dashboard/MainDashboard';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<MainDashboard />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;