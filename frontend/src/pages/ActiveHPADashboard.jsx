import { useState, useEffect } from 'react';
import { useGetActiveHPAsQuery, useGetActiveHPAStatisticsQuery } from '../features/hpa/hpaApi';
import { useGetBranchesQuery } from '../features/masters/mastersApi';
import { useAuth } from '../hooks/useAuth';
import { 
    MagnifyingGlassIcon, 
    ClockIcon, 
    ExclamationTriangleIcon,
    ArrowPathIcon,
    EyeIcon,
    DocumentArrowUpIcon,
    FunnelIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';

export default function ActiveHPADashboard() {
    const navigate = useNavigate();
    const { user, isSuperAdmin, canEdit } = useAuth();
    
    // Filters state
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [branch, setBranch] = useState('');
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    
    const debouncedSearch = useDebouncedValue(search, 300);
    
    // Build query params
    const queryParams = {
        search: debouncedSearch,
        page,
        page_size: pageSize,
        ...(fromDate && { from_date: fromDate }),
        ...(toDate && { to_date: toDate }),
        ...(paymentStatus && { payment_status: paymentStatus }),
        ...(branch && { branch }),
        ...(overdueOnly && { overdue_only: 'true' }),
    };
    
    // API queries
    const { data: hpasData, isLoading, isFetching, refetch } = useGetActiveHPAsQuery(queryParams);
    const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useGetActiveHPAStatisticsQuery({});
    const { data: branches = [] } = useGetBranchesQuery();
    
    const hpas = hpasData?.results || [];
    const totalCount = hpasData?.count || 0;
    
    // Auto-refresh statistics every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            refetchStats();
        }, 30000);
        return () => clearInterval(interval);
    }, [refetchStats]);
    
    const clearFilters = () => {
        setSearch('');
        setFromDate('');
        setToDate('');
        setPaymentStatus('');
        setBranch('');
        setOverdueOnly(false);
        setPage(1);
    };
    
    const getDaysActiveBadge = (hpa) => {
        const days = hpa.days_active || 0;
        const category = hpa.days_active_category || 'on_track';
        
        const styles = {
            delivered: { bg: '#d1fae5', color: '#065f46', border: '#10b981' },
            on_track: { bg: '#d1fae5', color: '#065f46', border: '#10b981' },
            warning: { bg: '#fef3c7', color: '#92400e', border: '#f59e0b' },
            overdue: { bg: '#fee2e2', color: '#991b1b', border: '#ef4444' },
        };
        
        const style = styles[category] || styles.on_track;
        
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                background: style.bg,
                color: style.color,
                border: `1px solid ${style.border}`
            }}>
                <ClockIcon style={{ width: '14px', height: '14px' }} />
                {days} day{days !== 1 ? 's' : ''}
            </span>
        );
    };
    
    const getPaymentStatusBadge = (status) => {
        const badges = {
            'PENDING': 'badge-warning',
            'PARTIAL': 'badge-info',
            'PAID': 'badge-success',
            'PENDING_BILL': 'badge-secondary',
        };
        return badges[status] || 'badge-secondary';
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                            Active HPA Dashboard
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            Track in-transit shipments awaiting delivery acknowledgement
                        </p>
                    </div>
                    <button
                        onClick={() => { refetch(); refetchStats(); }}
                        disabled={isFetching}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <ArrowPathIcon style={{ width: '18px', height: '18px', animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>
            
            {/* Statistics Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '16px', 
                marginBottom: '24px' 
            }}>
                {/* Total Active */}
                <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                    borderRadius: '16px',
                    color: 'white'
                }}>
                    <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Total Active HPAs</p>
                    <p style={{ fontSize: '32px', fontWeight: 700 }}>
                        {statsLoading ? '...' : statsData?.total_active || 0}
                    </p>
                </div>
                
                {/* Total Lorry Hire */}
                <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                    borderRadius: '16px',
                    color: 'white'
                }}>
                    <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Total Lorry Hire</p>
                    <p style={{ fontSize: '24px', fontWeight: 700 }}>
                        ₹{statsLoading ? '...' : (statsData?.total_lorry_hire || 0).toLocaleString()}
                    </p>
                </div>
                
                {/* Total Balance */}
                <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                    borderRadius: '16px',
                    color: 'white'
                }}>
                    <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Balance Due</p>
                    <p style={{ fontSize: '24px', fontWeight: 700 }}>
                        ₹{statsLoading ? '...' : (statsData?.total_balance || 0).toLocaleString()}
                    </p>
                </div>
                
                {/* Average Days Active */}
                <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
                    borderRadius: '16px',
                    color: 'white'
                }}>
                    <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Avg Days Active</p>
                    <p style={{ fontSize: '32px', fontWeight: 700 }}>
                        {statsLoading ? '...' : statsData?.average_days_active || 0}
                    </p>
                </div>
                
                {/* Overdue Count */}
                <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                    borderRadius: '16px',
                    color: 'white',
                    cursor: 'pointer'
                }}
                onClick={() => setOverdueOnly(!overdueOnly)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <ExclamationTriangleIcon style={{ width: '16px', height: '16px' }} />
                        <p style={{ fontSize: '12px', opacity: 0.8 }}>Overdue ({'>'}7 days)</p>
                    </div>
                    <p style={{ fontSize: '32px', fontWeight: 700 }}>
                        {statsLoading ? '...' : statsData?.overdue_count || 0}
                    </p>
                </div>
            </div>
            
            {/* Days Breakdown */}
            {statsData?.days_breakdown && (
                <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    marginBottom: '24px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ 
                        padding: '12px 20px', 
                        background: '#d1fae5', 
                        borderRadius: '12px',
                        border: '2px solid #10b981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: '#065f46' }}>
                            {statsData.days_breakdown.on_track}
                        </span>
                        <span style={{ fontSize: '13px', color: '#065f46' }}>On Track (0-3 days)</span>
                    </div>
                    <div style={{ 
                        padding: '12px 20px', 
                        background: '#fef3c7', 
                        borderRadius: '12px',
                        border: '2px solid #f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: '#92400e' }}>
                            {statsData.days_breakdown.warning}
                        </span>
                        <span style={{ fontSize: '13px', color: '#92400e' }}>Warning (4-7 days)</span>
                    </div>
                    <div style={{ 
                        padding: '12px 20px', 
                        background: '#fee2e2', 
                        borderRadius: '12px',
                        border: '2px solid #ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: '#991b1b' }}>
                            {statsData.days_breakdown.overdue}
                        </span>
                        <span style={{ fontSize: '13px', color: '#991b1b' }}>Overdue (8+ days)</span>
                    </div>
                </div>
            )}
            
            {/* Filters */}
            <div style={{ 
                padding: '20px', 
                background: '#f9fafb', 
                borderRadius: '12px', 
                marginBottom: '24px',
                border: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <FunnelIcon style={{ width: '18px', height: '18px', color: '#6b7280' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Filters</span>
                    {(search || fromDate || toDate || paymentStatus || branch || overdueOnly) && (
                        <button
                            onClick={clearFilters}
                            style={{ 
                                marginLeft: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 12px',
                                background: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            <XMarkIcon style={{ width: '14px', height: '14px' }} />
                            Clear Filters
                        </button>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {/* Search */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
                            Search
                        </label>
                        <div style={{ position: 'relative' }}>
                            <MagnifyingGlassIcon style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                            <input
                                type="text"
                                placeholder="HPA#, LR#, Invoice#, Truck#..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input"
                                style={{ paddingLeft: '36px' }}
                            />
                        </div>
                    </div>
                    
                    {/* Date Range */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
                            From Date
                        </label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
                            To Date
                        </label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="input"
                        />
                    </div>
                    
                    {/* Payment Status */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
                            Payment Status
                        </label>
                        <select
                            value={paymentStatus}
                            onChange={(e) => setPaymentStatus(e.target.value)}
                            className="input"
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="PARTIAL">Partially Paid</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING_BILL">Pending Bill</option>
                        </select>
                    </div>
                    
                    {/* Branch (for super admin) */}
                    {isSuperAdmin && branches.length > 0 && (
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
                                Branch
                            </label>
                            <select
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                className="input"
                            >
                                <option value="">All Branches</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {/* Overdue Toggle */}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={overdueOnly}
                                onChange={(e) => setOverdueOnly(e.target.checked)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#ef4444' }}>
                                Show Overdue Only
                            </span>
                        </label>
                    </div>
                </div>
            </div>
            
            {/* Results Table */}
            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {/* Table Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        Showing {hpas.length} of {totalCount} active HPAs
                    </span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                    >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>
                
                {/* Table */}
                {isLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                        Loading active HPAs...
                    </div>
                ) : hpas.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                        <ClockIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                        <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No Active HPAs</p>
                        <p style={{ fontSize: '14px' }}>All HPAs have received delivery acknowledgement!</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>HPA Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>LR / Invoice</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Truck</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Route</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Balance</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Days Active</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hpas.map((hpa, index) => (
                                    <tr 
                                        key={hpa.id}
                                        style={{ 
                                            borderBottom: index < hpas.length - 1 ? '1px solid #f3f4f6' : 'none',
                                            background: hpa.is_overdue ? '#fef2f2' : 'transparent'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = hpa.is_overdue ? '#fee2e2' : '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = hpa.is_overdue ? '#fef2f2' : 'transparent'}
                                    >
                                        <td style={{ padding: '16px 12px' }}>
                                            <span style={{ fontWeight: 600, color: '#111827' }}>{hpa.hpa_number}</span>
                                            {hpa.is_overdue && (
                                                <ExclamationTriangleIcon style={{ width: '16px', height: '16px', color: '#ef4444', marginLeft: '6px', verticalAlign: 'middle' }} />
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                            {hpa.hpa_date ? new Date(hpa.hpa_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{hpa.lr_number || '-'}</div>
                                            {hpa.invoice_list && (
                                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={hpa.invoice_list}>
                                                    {hpa.invoice_list}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{hpa.truck_number || '-'}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{hpa.driver_name || '-'}</div>
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '13px', color: '#4b5563' }}>
                                            {hpa.from_location && hpa.to_location 
                                                ? `${hpa.from_location} → ${hpa.to_location}` 
                                                : hpa.delivery_locations_summary || '-'}
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                            ₹{parseFloat(hpa.balance_rs || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            {getDaysActiveBadge(hpa)}
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <span className={`badge ${getPaymentStatusBadge(hpa.payment_status)}`}>
                                                {hpa.payment_status || 'PENDING'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => navigate('/hpa')}
                                                    style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                                                    title="View HPA Details"
                                                >
                                                    <EyeIcon style={{ width: '18px', height: '18px' }} />
                                                </button>
                                                <button
                                                    onClick={() => navigate('/pod')}
                                                    style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#10b981' }}
                                                    title="Add POD"
                                                >
                                                    <DocumentArrowUpIcon style={{ width: '18px', height: '18px' }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* Pagination */}
                {totalCount > pageSize && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            style={{ 
                                padding: '8px 16px', 
                                borderRadius: '6px', 
                                border: '1px solid #d1d5db',
                                background: page === 1 ? '#f3f4f6' : 'white',
                                cursor: page === 1 ? 'not-allowed' : 'pointer',
                                opacity: page === 1 ? 0.5 : 1
                            }}
                        >
                            Previous
                        </button>
                        <span style={{ padding: '8px 16px', fontSize: '14px', color: '#6b7280' }}>
                            Page {page} of {Math.ceil(totalCount / pageSize)}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= Math.ceil(totalCount / pageSize)}
                            style={{ 
                                padding: '8px 16px', 
                                borderRadius: '6px', 
                                border: '1px solid #d1d5db',
                                background: page >= Math.ceil(totalCount / pageSize) ? '#f3f4f6' : 'white',
                                cursor: page >= Math.ceil(totalCount / pageSize) ? 'not-allowed' : 'pointer',
                                opacity: page >= Math.ceil(totalCount / pageSize) ? 0.5 : 1
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

