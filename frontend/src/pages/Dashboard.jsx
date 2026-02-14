import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TruckIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { useGetDashboardSummaryQuery, useGetHPAsWithoutBillsQuery, useGetPendingLRsQuery, useGetPendingHPAsQuery } from '../features/dashboard/dashboardApi';
import { useAuth } from '../hooks/useAuth';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export default function Dashboard() {
    const navigate = useNavigate();
    const { isSuperAdmin } = useAuth();
    
    // Date range state - default to current month
    const [dateRange, setDateRange] = useState(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            from_date: firstDay.toISOString().split('T')[0],
            to_date: lastDay.toISOString().split('T')[0]
        };
    });
    
    const { data: summaryData } = useGetDashboardSummaryQuery();
    const { data: hpasWithoutBillsData, isLoading: isLoadingHPAs } = useGetHPAsWithoutBillsQuery();

    // Search + pagination state for dashboard lists
    const [lrSearch, setLRSearch] = useState('');
    const [hpaSearch, setHPASearch] = useState('');
    const [lrPage, setLRPage] = useState(1);
    const [hpaPage, setHPAPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const debouncedLRSearch = useDebouncedValue(lrSearch, 300);
    const debouncedHPASearch = useDebouncedValue(hpaSearch, 300);

    const { data: pendingLRs, isLoading: isLoadingPendingLRs } = useGetPendingLRsQuery({
        from_date: dateRange.from_date,
        to_date: dateRange.to_date,
        search: debouncedLRSearch,
        page: lrPage,
        page_size: pageSize,
    });
    const { data: pendingHPAs, isLoading: isLoadingPendingHPAs } = useGetPendingHPAsQuery({
        from_date: dateRange.from_date,
        to_date: dateRange.to_date,
        search: debouncedHPASearch,
        page: hpaPage,
        page_size: pageSize,
    });
    
    // Get stats from API
    const currentStats = summaryData?.current || {};
    const changes = summaryData?.changes || {};
    
    // Format currency
    const formatCurrency = (amount) => {
        if (!amount) return '₹0';
        const num = parseFloat(amount);
        if (num >= 100000) {
            return `₹${(num / 100000).toFixed(1)}L`;
        } else if (num >= 1000) {
            return `₹${(num / 1000).toFixed(1)}K`;
        }
        return `₹${num.toLocaleString()}`;
    };
    
    // Format percentage change
    const formatChange = (change) => {
        if (!change) return '0%';
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(1)}%`;
    };
    
    const stats = [
        {
            name: 'Active Trucks',
            value: currentStats.active_trucks || 0,
            icon: TruckIcon,
            color: '#3b82f6',
            bgColor: '#eff6ff',
            onClick: () => navigate('/masters/trucks')
        },
        {
            name: 'Open LRs',
            value: pendingLRs?.count || 0,
            icon: DocumentTextIcon,
            color: '#8b5cf6',
            bgColor: '#f5f3ff',
            onClick: () => navigate('/lr', { state: { filter: { status: 'PENDING_HPA' } } })
        },
        {
            name: 'Open HPAs',
            value: pendingHPAs?.count || 0,
            icon: ClockIcon,
            color: '#f59e0b',
            bgColor: '#fffbeb',
            onClick: () => navigate('/hpa', { state: { filter: { status: 'PENDING_BILL' } } })
        },
        {
            name: "Today's Revenue",
            value: formatCurrency(currentStats.total_revenue || 0),
            icon: CurrencyDollarIcon,
            color: '#22c55e',
            bgColor: '#f0fdf4',
            onClick: () => navigate('/billing')
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                        <span className="gradient-text">Dashboard</span>
                    </h1>
                    <p style={{ color: '#6b7280' }}>Welcome back! Here's your overview.</p>
                </div>
                {/* Date Range Picker */}
                <div className="card" style={{ padding: '16px', minWidth: '300px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', display: 'block' }}>
                        Date Range
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="date"
                            className="input"
                            value={dateRange.from_date}
                            onChange={(e) => setDateRange(prev => ({ ...prev, from_date: e.target.value }))}
                            style={{ flex: 1 }}
                        />
                        <span style={{ color: '#6b7280' }}>to</span>
                        <input
                            type="date"
                            className="input"
                            value={dateRange.to_date}
                            onChange={(e) => setDateRange(prev => ({ ...prev, to_date: e.target.value }))}
                            style={{ flex: 1 }}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '24px'
            }}>
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div 
                            key={stat.name} 
                            className="card" 
                            style={{ cursor: 'pointer' }}
                            onClick={stat.onClick}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>
                                        {stat.name}
                                    </p>
                                    <p style={{ fontSize: '32px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
                                        {stat.value}
                                    </p>
                                    {/* Change badge removed because stats honor the selected date range */}
                                </div>
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '12px',
                                    background: stat.bgColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icon style={{ width: '28px', height: '28px', color: stat.color }} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                    Quick Actions
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <button 
                        className="btn btn-primary" 
                        style={{ justifyContent: 'center' }}
                        onClick={() => navigate('/lr', { state: { createNew: true } })}
                    >
                        <DocumentTextIcon style={{ width: '20px', height: '20px' }} />
                        Create New LR
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        style={{ justifyContent: 'center' }}
                        onClick={() => navigate('/hpa', { state: { createNew: true } })}
                    >
                        <TruckIcon style={{ width: '20px', height: '20px' }} />
                        Create HPA
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        style={{ justifyContent: 'center' }}
                        onClick={() => navigate('/billing')}
                    >
                        <CurrencyDollarIcon style={{ width: '20px', height: '20px' }} />
                        Generate Bill
                    </button>
                </div>
            </div>

            {/* Open LRs Without HPA */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
                            Open LRs (Without HPA)
                        </h2>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            {isLoadingPendingLRs ? 'Loading...' : (
                                pendingLRs?.count ?
                                    `${pendingLRs.count} open LR${pendingLRs.count !== 1 ? 's' : ''} awaiting HPA creation` :
                                    'All LRs have HPAs'
                            )}
                        </p>
                    </div>
                    {pendingLRs?.count > 0 && (
                        <button 
                            className="btn btn-primary" 
                            style={{ justifyContent: 'center' }}
                            onClick={() => navigate('/lr')}
                        >
                            Create HPAs
                        </button>
                    )}
                </div>
                {isLoadingPendingLRs ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        Loading LRs...
                    </div>
                ) : pendingLRs?.results && pendingLRs.results.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        {/* Search + Pagination controls */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search LRs (number, truck, party, route)"
                                value={lrSearch}
                                onChange={(e) => { setLRSearch(e.target.value); setLRPage(1); }}
                                style={{ maxWidth: '300px' }}
                            />
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button className="btn" onClick={() => setLRPage(Math.max(1, lrPage - 1))} disabled={!pendingLRs?.previous}>Prev</button>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {lrPage}</span>
                                <button className="btn" onClick={() => setLRPage(lrPage + 1)} disabled={!pendingLRs?.next}>Next</button>
                                <select className="input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 10); setLRPage(1); }}>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        LR Number
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        Truck Number
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        Party
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        Status
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        Quantity (MT)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingLRs.results.slice(0, 10).map((lr, index) => {
                                    const getStatusBadgeClass = (status) => {
                                        switch (status) {
                                            case 'DELIVERED':
                                            case 'Completed':
                                                return 'badge-success';
                                            case 'IN_TRANSIT':
                                            case 'In Transit':
                                                return 'badge-warning';
                                            case 'PENDING_HPA':
                                            case 'PENDING':
                                            case 'Pending':
                                                return 'badge-error';
                                            default:
                                                return 'badge-secondary';
                                        }
                                    };

                                    return (
                                        <tr
                                            key={lr.id}
                                            style={{
                                                borderBottom: index < Math.min(pendingLRs.results.length, 10) - 1 ? '1px solid #f3f4f6' : 'none',
                                                transition: 'background 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => e.target.closest('tr').style.background = '#f9fafb'}
                                            onMouseLeave={(e) => e.target.closest('tr').style.background = 'transparent'}
                                            onClick={() => navigate('/hpa', { state: { createNew: true, lrId: lr.id } })}
                                        >
                                            <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                                {lr.lr_number || '-'}
                                            </td>
                                            <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                                {lr.truck_number || '-'}
                                            </td>
                                            <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                                {lr.consignee_name || lr.consignor_name || '-'}
                                            </td>
                                            <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                                <span className={`badge ${getStatusBadgeClass(lr.status)}`}>
                                                    {lr.status || 'DRAFT'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                                                {parseFloat(lr.quantity_mt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {pendingLRs?.count > pageSize && (
                            <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
                                <button 
                                    className="btn btn-secondary"
                                    onClick={() => navigate('/lr')}
                                    style={{ fontSize: '14px' }}
                                >
                                    View All {pendingLRs?.count} LRs
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        <ExclamationTriangleIcon style={{ width: '48px', height: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
                        <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>All LRs have HPAs</p>
                        <p style={{ fontSize: '14px' }}>Great job! No pending HPAs to create.</p>
                    </div>
                )}
            </div>

            {/* HPAs Without Bills */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                            Open HPAs (Without Bills)
                        </h2>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            {isLoadingHPAs ? 'Loading...' : (
                                hpasWithoutBillsData?.count ? 
                                    `${hpasWithoutBillsData.count} open HPA${hpasWithoutBillsData.count !== 1 ? 's' : ''} awaiting billing` :
                                    'All HPAs are billed'
                            )}
                        </p>
                    </div>
                    {hpasWithoutBillsData?.count > 0 && (
                        <button 
                            className="btn btn-primary" 
                            style={{ justifyContent: 'center' }}
                            onClick={() => navigate('/billing')}
                        >
                            Create Bills
                        </button>
                    )}
                </div>
                {isLoadingHPAs ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        Loading HPAs...
                    </div>
                ) : pendingHPAs?.results && pendingHPAs.results.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        {/* Search + Pagination controls */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search HPAs (number, LR, truck, driver)"
                                value={hpaSearch}
                                onChange={(e) => { setHPASearch(e.target.value); setHPAPage(1); }}
                                style={{ maxWidth: '300px' }}
                            />
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button className="btn" onClick={() => setHPAPage(Math.max(1, hpaPage - 1))} disabled={!pendingHPAs?.previous}>Prev</button>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {hpaPage}</span>
                                <button className="btn" onClick={() => setHPAPage(hpaPage + 1)} disabled={!pendingHPAs?.next}>Next</button>
                                <select className="input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 10); setHPAPage(1); }}>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        HPA Number
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        LR Number
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        Truck Number
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        Date
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        Balance (₹)
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingHPAs.results.map((hpa, index) => {
                                    const getStatusBadgeClass = (status) => {
                                        switch (status) {
                                            case 'PAID':
                                                return 'badge-success';
                                            case 'PARTIAL':
                                                return 'badge-warning';
                                            case 'PENDING_BILL':
                                            case 'PENDING':
                                                return 'badge-error';
                                            default:
                                                return 'badge-secondary';
                                        }
                                    };
                                    
                                    return (
                                        <tr
                                            key={hpa.id}
                                            style={{
                                                borderBottom: index < Math.min(hpasWithoutBillsData.hpas.length, 10) - 1 ? '1px solid #f3f4f6' : 'none',
                                                transition: 'background 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => e.target.closest('tr').style.background = '#f9fafb'}
                                            onMouseLeave={(e) => e.target.closest('tr').style.background = 'transparent'}
                                            onClick={() => navigate('/billing')}
                                        >
                                            <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                                {hpa.hpa_number || '-'}
                                            </td>
                                            <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                                {hpa.lr_number || '-'}
                                            </td>
                                            <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                                {hpa.truck_number || '-'}
                                            </td>
                                            <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                                {hpa.hpa_date ? new Date(hpa.hpa_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                                                ₹{parseFloat(hpa.balance_rs || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                                <span className={`badge ${getStatusBadgeClass(hpa.payment_status)}`}>
                                                    {hpa.payment_status || 'PENDING'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {pendingHPAs?.count > pageSize && (
                            <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
                                <button 
                                    className="btn btn-secondary"
                                    onClick={() => navigate('/billing')}
                                    style={{ fontSize: '14px' }}
                                >
                                    View All {pendingHPAs?.count} HPAs
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        <ExclamationTriangleIcon style={{ width: '48px', height: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
                        <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>All HPAs are billed</p>
                        <p style={{ fontSize: '14px' }}>Great job! No pending bills to generate.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
