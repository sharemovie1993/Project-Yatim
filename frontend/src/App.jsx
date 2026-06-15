import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Mustahiq from './components/Mustahiq';
import Kategori from './components/Kategori';
import Kelompok from './components/Kelompok';
import Program from './components/Program';
import Profile from './components/Profile';
import Billing from './components/Billing';
import Users from './components/Users';
import Update from './components/Update';
import ApiService from './services/api';

const getLoggedInUserRole = () => {
  const token = ApiService.getToken();
  if (!token) return '';
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload).role; // 'ADMIN' or 'PETUGAS'
  } catch (e) {
    return '';
  }
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check login status on load
  useEffect(() => {
    const token = ApiService.getToken();
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Sync dark mode style to body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    ApiService.logout();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const userRole = getLoggedInUserRole();

  // Page selector helper
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'mustahiq':
        return <Mustahiq />;
      case 'kategori':
        return <Kategori />;
      case 'kelompok':
        return <Kelompok />;
      case 'program':
        return <Program />;
      case 'profile':
        return <Profile />;
      case 'billing':
        return userRole === 'ADMIN' ? <Billing /> : <Dashboard onNavigate={setCurrentPage} />;
      case 'users':
        return userRole === 'ADMIN' ? <Users /> : <Dashboard onNavigate={setCurrentPage} />;
      case 'update':
        return userRole === 'ADMIN' ? <Update /> : <Dashboard onNavigate={setCurrentPage} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div style={styles.appWrapper}>
      {/* Sidebar Navigation */}
      <aside className="glass" style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandBadge}>MC</div>
          <span style={styles.brandText}>Mustahiq Care</span>
        </div>

        <nav style={styles.nav}>
          <div 
            style={styles.navItem(currentPage === 'dashboard')} 
            onClick={() => setCurrentPage('dashboard')}
          >
            📊 Dashboard
          </div>
          <div 
            style={styles.navItem(currentPage === 'mustahiq')} 
            onClick={() => setCurrentPage('mustahiq')}
          >
            👥 Mustahiq (Penerima)
          </div>
          <div 
            style={styles.navItem(currentPage === 'kategori')} 
            onClick={() => setCurrentPage('kategori')}
          >
            🏷️ Kategori Mustahiq
          </div>
          <div 
            style={styles.navItem(currentPage === 'kelompok')} 
            onClick={() => setCurrentPage('kelompok')}
          >
            📂 Kelompok Distribusi
          </div>
          <div 
            style={styles.navItem(currentPage === 'program')} 
            onClick={() => setCurrentPage('program')}
          >
            🎁 Program & SPJ PDF
          </div>
          
          {userRole === 'ADMIN' && (
            <>
              <div 
                style={styles.navItem(currentPage === 'billing')} 
                onClick={() => setCurrentPage('billing')}
              >
                💳 Lisensi & Tagihan
              </div>
              <div 
                style={styles.navItem(currentPage === 'users')} 
                onClick={() => setCurrentPage('users')}
              >
                🔑 Manajemen Pengguna
              </div>
              <div 
                style={styles.navItem(currentPage === 'update')} 
                onClick={() => setCurrentPage('update')}
              >
                🔄 Pembaruan Aplikasi
              </div>
            </>
          )}

          <div 
            style={styles.navItem(currentPage === 'profile')} 
            onClick={() => setCurrentPage('profile')}
          >
            ⚙️ Profil Lembaga
          </div>
        </nav>

        <div style={styles.sidebarFooter}>
          <button 
            className="btn btn-outline" 
            style={styles.themeToggle} 
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? '☀️ Mode Terang' : '🌙 Mode Gelap'}
          </button>
          <button 
            className="btn btn-outline" 
            style={styles.logoutBtn} 
            onClick={handleLogout}
          >
            🚪 Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {renderPage()}
      </main>
    </div>
  );
}

const styles = {
  appWrapper: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: '260px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '24px',
    height: '100vh',
    position: 'sticky',
    top: 0,
    borderRadius: '0px 16px 16px 0px',
    borderRight: '1px solid hsl(var(--border))',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  brandBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'hsl(var(--primary))',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  brandText: {
    fontWeight: '700',
    fontSize: '18px',
    fontFamily: 'var(--font-heading)',
    color: 'hsl(var(--foreground))',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navItem: (isActive) => ({
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: isActive ? '600' : '500',
    cursor: 'pointer',
    color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
    backgroundColor: isActive ? 'hsl(var(--primary))' : 'transparent',
    transition: 'all 0.2s ease',
  }),
  sidebarFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '20px',
  },
  themeToggle: {
    width: '100%',
    padding: '10px',
    fontSize: '13px',
  },
  logoutBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '13px',
    color: '#ef4444',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  mainContent: {
    flex: 1,
    padding: '40px',
    overflowY: 'auto',
    height: '100vh',
  },
};
