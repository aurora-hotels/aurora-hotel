import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import {
  BedDouble,
  Cable,
  CalendarDays,
  ChevronRight,
  History,
  LogOut,
  Menu,
  Settings2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { api, ApiError, errorMessage, post } from './api';
import { AuthContext, isStaff, useAuth } from './auth';
import { Loading, Notice } from './components';
import type { User } from './types';
import AuthPage from './pages/Auth';
import RoomsPage from './pages/Rooms';
import ReservationsPage from './pages/Reservations';
import ReservationDetailPage from './pages/ReservationDetail';
import ProfilePage from './pages/Profile';
import AdminOfferPage from './pages/AdminOffer';
import AdminUsersPage from './pages/AdminUsers';
import AdminIntegrationsPage from './pages/AdminIntegrations';
import AdminSettingsPage from './pages/AdminSettings';
import AdminAuditPage from './pages/AdminAudit';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-error">
        <h1>Nie udało się wyświetlić strony</h1>
        <p>
          Odśwież stronę. Jeśli błąd się powtórzy, zapisz, co było robione przed jego wystąpieniem.
        </p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Odśwież aplikację
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const refreshUser = useCallback(async () => {
    try {
      const result = await api<User>('/me');
      setUser(result);
      setError('');
    } catch (e) {
      setUser(null);
      if (!(e instanceof ApiError && e.status === 401)) setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);
  if (loading) return <Loading />;
  return (
    <AuthContext.Provider value={{ user, refreshUser }}>
      {error && (
        <div className="global-error">
          <Notice error={error} />
          <button className="text-button" onClick={refreshUser}>
            Spróbuj ponownie
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
function Protected({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user)
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (user.mustChangePassword && location.pathname !== '/profile')
    return <Navigate to="/profile" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/reservations" replace />;
  return <Outlet />;
}
function Layout() {
  const { user, refreshUser } = useAuth(),
    location = useLocation();
  const [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await post('/auth/logout');
      await refreshUser();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const links = [
    { to: '/', icon: BedDouble, label: 'Pokoje i pobyt' },
    {
      to: '/reservations',
      icon: CalendarDays,
      label: isStaff(user) ? 'Recepcja' : 'Moje rezerwacje',
    },
    { to: '/profile', icon: UserRound, label: 'Mój profil' },
  ];
  const adminLinks = [
    { to: '/admin/offer', icon: BedDouble, label: 'Oferta hotelu' },
    { to: '/admin/users', icon: UsersRound, label: 'Konta i role' },
    { to: '/admin/integrations', icon: Cable, label: 'Integracje i API' },
    { to: '/admin/settings', icon: Settings2, label: 'Ustawienia hotelu' },
    { to: '/admin/audit', icon: History, label: 'Historia operacji' },
  ];
  return (
    <div className={`app-shell ${menu ? 'menu-open' : ''}`}>
      <a href="#main-content" className="skip-link">
        Przejdź do treści
      </a>
      <button className="menu-scrim" aria-label="Zamknij menu" onClick={() => setMenu(false)} />
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <BedDouble strokeWidth={1.4} size={26} />
          </span>
          <span>
            AURORA<small>H O T E L S</small>
          </span>
        </Link>
        <div className="sidebar-caption">Rezerwacje hotelowe</div>
        <nav aria-label="Główna nawigacja">
          <p className="nav-heading">Hotel</p>
          {links
            .filter((l) => user || l.to === '/')
            .map((l) => (
              <NavLink
                end={l.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                to={l.to}
                key={l.to}
              >
                <l.icon size={19} />
                {l.label}
                <ChevronRight size={14} className="nav-arrow" />
              </NavLink>
            ))}
          {user?.role === 'admin' && (
            <>
              <p className="nav-heading">Zarządzanie</p>
              {adminLinks.map((l) => (
                <NavLink
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  to={l.to}
                  key={l.to}
                >
                  <l.icon size={19} />
                  {l.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label={menu ? 'Zamknij menu' : 'Otwórz menu'}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <span className="breadcrumb">
              Aurora Hotels <ChevronRight size={14} />{' '}
              <strong>
                {location.pathname.startsWith('/admin')
                  ? 'Administracja'
                  : location.pathname.startsWith('/reservations')
                    ? 'Rezerwacje'
                    : location.pathname === '/profile'
                      ? 'Konto'
                      : 'Oferta'}
              </strong>
            </span>
          </div>
          {user ? (
            <div className="user-menu">
              <Link className="user-link" to="/profile">
                <span className="avatar">
                  {user.name
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <span>
                  {user.name}
                  <small>
                    {user.role === 'admin'
                      ? 'Administrator'
                      : user.role === 'receptionist'
                        ? 'Recepcja'
                        : 'Konto gościa'}
                  </small>
                </span>
              </Link>
              <button
                className="icon-button logout"
                aria-label="Wyloguj się"
                title="Wyloguj się"
                disabled={busy}
                onClick={logout}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="row-actions">
              <Link className="text-button" to="/login">
                Zaloguj się
              </Link>
              <Link className="button primary small-button" to="/register">
                Załóż konto
              </Link>
            </div>
          )}
        </header>
        <main id="main-content" className="main-content">
          <Notice error={error} />
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>© Aurora Hotels · Projekt studencki C</span>
          <span>Dane testowe, bez płatności online</span>
        </footer>
      </div>
    </div>
  );
}
function NotFound() {
  return (
    <div className="empty">
      <h1>Ta strona nie istnieje</h1>
      <p>Sprawdź adres lub wróć do oferty hotelu.</p>
      <Link className="button primary" to="/">
        Przejdź do pokoi
      </Link>
    </div>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<RoomsPage />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="login" element={<AuthPage />} />
              <Route path="register" element={<AuthPage register />} />
              <Route element={<Protected />}>
                <Route path="profile" element={<ProfilePage />} />
                <Route path="reservations" element={<ReservationsPage />} />
                <Route path="reservations/:id" element={<ReservationDetailPage />} />
              </Route>
              <Route element={<Protected admin />}>
                <Route path="admin/offer" element={<AdminOfferPage />} />
                <Route path="admin/users" element={<AdminUsersPage />} />
                <Route path="admin/integrations" element={<AdminIntegrationsPage />} />
                <Route path="admin/settings" element={<AdminSettingsPage />} />
                <Route path="admin/audit" element={<AdminAuditPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
