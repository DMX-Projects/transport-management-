import { useEffect, useMemo, useState } from 'react';
import {
    HomeIcon,
    TruckIcon,
    DocumentTextIcon,
    CreditCardIcon,
    DocumentCheckIcon,
    ReceiptPercentIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    ArrowLeftOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    MagnifyingGlassIcon,
    BellIcon,
} from '@heroicons/react/24/outline';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser } from '../../features/auth/authSlice';
import { useLocation, useNavigate } from 'react-router-dom';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'LR Management', href: '/lr', icon: DocumentTextIcon },
    { name: 'HPA Management', href: '/hpa', icon: TruckIcon },
    { name: 'Payments', href: '/payments', icon: CreditCardIcon },
    { name: 'POD', href: '/pod', icon: DocumentCheckIcon },
    { name: 'Billing', href: '/billing', icon: ReceiptPercentIcon },
    { name: 'Receipts', href: '/receipts', icon: CurrencyDollarIcon },
    { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    { name: 'Masters', href: '/masters', icon: Cog6ToothIcon },
];

export default function DashboardLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);
    const location = useLocation();

    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [sidebarOpen]);

    const breadcrumb = useMemo(() => {
        const segments = location.pathname.split('/').filter(Boolean);
        if (!segments.length) {
            return 'Dashboard';
        }

        return segments
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '))
            .join(' / ');
    }, [location.pathname]);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="app-shell">
            {sidebarOpen && <div className="app-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true"></div>}

            <aside className={`app-sidebar app-sidebar--mobile${sidebarOpen ? ' is-open' : ''}`}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </aside>

            <aside className="app-sidebar app-sidebar--desktop">
                <Sidebar />
            </aside>

            <div className="app-main">
                <header className="app-topbar">
                    <div className="app-topbar__upper">
                        <div className="app-topbar__left">
                            <button
                                type="button"
                                className="app-topbar__menu"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Open navigation"
                            >
                                <Bars3Icon width={22} height={22} />
                            </button>

                            <div className="app-brand">
                                <div className="app-brand__logo">
                                    <TruckIcon width={22} height={22} />
                                </div>
                                <div className="app-brand__meta">
                                    <strong>Transport ERP</strong>
                                    <span>Logistics Management</span>
                                </div>
                            </div>
                        </div>

                        <div className="app-topbar__right">
                            <div className="app-search">
                                <input type="text" placeholder="Search operations" />
                                <MagnifyingGlassIcon width={16} height={16} />
                            </div>

                            <button type="button" className="app-icon-button" aria-label="Notifications">
                                <BellIcon width={20} height={20} />
                                <span className="app-icon-button__dot"></span>
                            </button>

                            <div className="app-account">
                                <div className="app-account__copy">
                                    <span>{user?.username || 'User'}</span>
                                    <small>{user?.role?.replace('_', ' ') || 'Role'}</small>
                                </div>
                                <div className="app-account__avatar">
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="app-icon-button app-icon-button--danger"
                                onClick={handleLogout}
                                title="Logout"
                                aria-label="Logout"
                            >
                                <ArrowLeftOnRectangleIcon width={20} height={20} />
                            </button>
                        </div>
                    </div>

                    <div className="app-topbar__crumbs">
                        <HomeIcon width={14} height={14} />
                        <span>/</span>
                        <span>{breadcrumb}</span>
                    </div>
                </header>

                <main className="app-content">
                    <div className="app-content__inner">{children}</div>
                </main>
            </div>
        </div>
    );
}

function Sidebar({ onClose }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigation = (href) => {
        navigate(href);
        if (onClose) onClose();
    };

    return (
        <div className="sidebar-shell">
            <div className="sidebar-head">
                <h1>Transport ERP</h1>
                {onClose && (
                    <button type="button" onClick={onClose} aria-label="Close navigation">
                        <XMarkIcon width={22} height={22} />
                    </button>
                )}
            </div>

            <nav className="sidebar-nav">
                {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;

                    return (
                        <button
                            type="button"
                            key={item.name}
                            onClick={() => handleNavigation(item.href)}
                            className={`sidebar-link${isActive ? ' is-active' : ''}`}
                        >
                            <Icon width={20} height={20} />
                            <span>{item.name}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar-foot">
                <p>© 2026 Transport ERP</p>
            </div>
        </div>
    );
}
