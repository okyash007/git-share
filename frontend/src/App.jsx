import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import SharedView from './pages/SharedView';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#f0f0f5',
            border: '1px solid rgba(124, 92, 252, 0.2)',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#00d4aa', secondary: '#1a1a2e' },
          },
          error: {
            iconTheme: { primary: '#ff4d6a', secondary: '#1a1a2e' },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/share/:shareId" element={<SharedView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
