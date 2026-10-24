import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutGrid,
    Users,
    SlidersHorizontal,
    Database,
    Bell,
    LogOut,
    X,
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
    const navigate = useNavigate();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const logoutBtnRef = useRef(null);
    const stayBtnRef = useRef(null);

    const closeModal = () => {
        setConfirmOpen(false);
        logoutBtnRef.current?.focus();
    };
    const logout = () => {
        setConfirmOpen(false);
        navigate('/login');
    };

    useEffect(() => {
        if (!confirmOpen) return;
        stayBtnRef.current?.parentElement.firstChild.focus();
        const onKey = (e) => e.key === 'Escape' && closeModal();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [confirmOpen]);
    const navItems = [
        { to: '/', label: 'Обзор', icon: LayoutGrid },
        { to: '/customers', label: 'Клиенты', icon: Users },
        { to: '/model', label: 'Модель', icon: SlidersHorizontal },
        { to: '/data', label: 'Данные', icon: Database },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-header-top">
                    <span className="sidebar-user">@marketing</span>
                    <button className="sidebar-icon-btn" aria-label="Уведомления">
                        <Bell size={20} strokeWidth={1.5} />
                    </button>
                </div>
                <div className="sidebar-balance">
                    <span className="sidebar-balance-value">14 380 €</span>
                    <span className="sidebar-balance-badge">в риске</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                        }
                    >
                        <span>{item.label}</span>
                        <item.icon size={20} strokeWidth={1.5} />
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-links">
                <button
                    type="button"
                    ref={logoutBtnRef}
                    className="sidebar-logout"
                    onClick={() => setConfirmOpen(true)}
                >
                    <span>Выйти</span>
                    <LogOut size={20} strokeWidth={1.5} />
                </button>
            </div>

            <div className="sidebar-footer">
                <div className="sidebar-logo-icon">é</div>
                <span className="sidebar-logo-text">attentionflow</span>
            </div>

            {confirmOpen && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button type="button" className="modal-close" aria-label="Закрыть" onClick={closeModal}>
                            <X size={18} />
                        </button>
                        <h2 id="logout-title" className="modal-title">выйти из аккаунта?</h2>
                        <p className="modal-text">Настройки и данные сохранятся, войти можно в любой момент.</p>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-dark" onClick={logout}>выйти</button>
                            <button type="button" ref={stayBtnRef} className="btn btn-soft" onClick={closeModal}>остаться</button>
                        </div>
                        <div className="modal-hint">esc — закрыть</div>
                    </div>
                </div>
            )}
        </aside>
    );
}
