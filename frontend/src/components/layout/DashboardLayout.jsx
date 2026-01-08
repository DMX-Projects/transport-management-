import { useState } from 'react';
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
import { useNavigate } from 'react-router-dom';

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

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 40
                    }}
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Mobile sidebar */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '280px',
                    background: 'white',
                    borderRight: '1px solid #e5e7eb',
                    transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.3s',
                    zIndex: 50,
                    display: window.innerWidth >= 1024 ? 'none' : 'block'
                }}
            >
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Desktop sidebar */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '280px',
                    background: 'white',
                    borderRight: '1px solid #e5e7eb',
                    zIndex: 30,
                    display: window.innerWidth >= 1024 ? 'block' : 'none'
                }}
            >
                <Sidebar />
            </div>

            {/* Main content */}
            <div style={{ marginLeft: window.innerWidth >= 1024 ? '280px' : '0' }}>
                {/* Enhanced Top navbar */}
                <div style={{
                    background: 'white',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}>
                    {/* Top bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '64px',
                        padding: '12px 24px',
                        gap: '16px',
                        borderBottom: '1px solid #f3f4f6'
                    }}>
                        {/* Left side */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                            <button
                                onClick={() => setSidebarOpen(true)}
                                style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: window.innerWidth >= 1024 ? 'none' : 'block'
                                }}
                            >
                                <Bars3Icon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                                }}>
                                    <TruckIcon style={{ width: '24px', height: '24px', color: 'white' }} />
                                </div>
                                <div style={{ display: window.innerWidth >= 640 ? 'block' : 'none' }}>
                                    <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                                        Transport ERP
                                    </h1>
                                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                                        Logistics Management
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right side */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Search Bar */}
                            <div style={{
                                position: 'relative',
                                display: window.innerWidth >= 768 ? 'block' : 'none'
                            }}>
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    style={{
                                        padding: '8px 12px 8px 36px',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        background: '#f9fafb',
                                        fontSize: '13px',
                                        width: '220px',
                                        outline: 'none'
                                    }}
                                />
                                <MagnifyingGlassIcon style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '16px',
                                    height: '16px',
                                    color: '#9ca3af'
                                }} />
                            </div>

                            {/* Notifications */}
                            <button style={{
                                position: 'relative',
                                padding: '8px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#f9fafb',
                                cursor: 'pointer',
                                color: '#6b7280'
                            }}>
                                <BellIcon style={{ width: '20px', height: '20px' }} />
                                <span style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    border: '2px solid white'
                                }}></span>
                            </button>

                            {/* User Profile */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '12px', borderLeft: '1px solid #e5e7eb' }}>
                                <div style={{ textAlign: 'right', display: window.innerWidth >= 640 ? 'block' : 'none' }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                        {user?.username || 'User'}
                                    </p>
                                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                                        {user?.role?.replace('_', ' ') || 'Role'}
                                    </p>
                                </div>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                                }}>
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#fef2f2',
                                    cursor: 'pointer',
                                    color: '#dc2626'
                                }}
                                title="Logout"
                            >
                                <ArrowLeftOnRectangleIcon style={{ width: '20px', height: '20px' }} />
                            </button>
                        </div>
                    </div>

                    {/* Breadcrumbs */}
                    <div style={{
                        padding: '10px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        background: '#fafbfc'
                    }}>
                        <HomeIcon style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                        <span style={{ color: '#d1d5db' }}>/</span>
                        <span style={{ color: '#111827', fontWeight: 500 }}>
                            {window.location.pathname.split('/').filter(Boolean).map(segment =>
                                segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
                            ).join(' / ') || 'Dashboard'}
                        </span>
                    </div>
                </div>

                {/* Page content */}
                <main style={{ padding: '32px 24px' }}>
                    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

function Sidebar({ onClose }) {
    const navigate = useNavigate();

    const handleNavigation = (href) => {
        navigate(href);
        if (onClose) onClose();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Logo */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '64px',
                padding: '0 24px',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700 }}>
                    <span className="gradient-text">Transport ERP</span>
                </h1>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer'
                        }}
                    >
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '24px 16px', overflowY: 'auto' }}>
                {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = window.location.pathname === item.href;

                    return (
                        <button
                            key={item.name}
                            onClick={() => handleNavigation(item.href)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                marginBottom: '4px',
                                border: 'none',
                                borderRadius: '8px',
                                background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                                color: isActive ? 'white' : '#4b5563',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'left'
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = '#f3f4f6';
                                    e.currentTarget.style.color = '#111827';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#4b5563';
                                }
                            }}
                        >
                            <Icon style={{ width: '20px', height: '20px' }} />
                            {item.name}
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid #e5e7eb',
                textAlign: 'center'
            }}>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                    © 2026 Transport ERP
                </p>
            </div>
        </div>
    );
}
