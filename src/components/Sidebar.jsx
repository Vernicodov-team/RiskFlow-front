import { NavLink } from 'react-router-dom';
import {
    LayoutGrid,
    Users,
    SlidersHorizontal,
    Database,
    Bell,
    Link2,
    ChartLine,
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
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
                <a href="#" className="sidebar-link">
                    <span>API · Swagger</span>
                    <Link2 size={20} strokeWidth={1.5} />
                </a>
                <a href="#" className="sidebar-link">
                    <span>/metrics · Prometheus</span>
                    <ChartLine size={20} strokeWidth={1.5} />
                </a>
            </div>

            <div className="sidebar-footer">
                <div className="sidebar-logo-icon">é</div>
                <span className="sidebar-logo-text">attentionflow</span>
            </div>
        </aside>
    );
}
