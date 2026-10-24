import { Routes, Route, useMatch } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Customers from './pages/Customers';
import CustomerCard from './pages/CustomerCard';
import ModelSettings from './pages/ModelSettings';
import SourceData from './pages/SourceData';
import Login from './pages/Login';
import './App.css';

export default function App() {
  const isCustomersPage = Boolean(useMatch('/customers'));

  return (
      <div className="app">
        <Sidebar />
        <div className="app-main">
          {!isCustomersPage && (
              <header className="app-header">
                <div className="app-header-right">
                  <div className="live-badge">
                    <span className="live-dot"></span>
                    <span className="live-text">live</span>
                    <span className="live-time">обновлено 3 сек назад</span>
                  </div>
                  <button className="horizon-btn">
                    горизонт · 14 дней<span className="horizon-caret">▾</span>
                  </button>
                </div>
              </header>
          )}

          <main className="app-content">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerCard />} />
              <Route path="/model" element={<ModelSettings />} />
              <Route path="/data" element={<SourceData />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>
        </div>
      </div>
  );
}