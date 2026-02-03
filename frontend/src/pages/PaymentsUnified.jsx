import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
    useGetPaymentTransactionsQuery,
    useCreatePaymentTransactionMutation,
    useDeletePaymentTransactionMutation
} from '../features/transactions/transactionsApi';
import { useGetHPAsQuery } from '../features/hpa/hpaApi';
import {
    BanknotesIcon,
    PlusIcon,
    TrashIcon,
    FunnelIcon,
    XMarkIcon,
    ChartBarIcon,
    TruckIcon,
    CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const PAYMENT_TYPES = [
    { value: 'ADVANCE', label: 'Advance Payment', color: '#3b82f6' },
    { value: 'DIESEL', label: 'Diesel Payment', color: '#f59e0b' },
    { value: 'BANK', label: 'Bank Transfer', color: '#10b981' },
    { value: 'BALANCE', label: 'Balance Payment', color: '#6366f1' },
    { value: 'DEDUCTION', label: 'Deduction', color: '#ef4444' },
    { value: 'TOLL', label: 'Toll', color: '#8b5cf6' },
    { value: 'COMMISSION', label: 'Commission', color: '#ec4899' },
    { value: 'OTHER', label: 'Other', color: '#6b7280' }
];

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'UPI', label: 'UPI' },
    { value: 'DIESEL_VOUCHER', label: 'Diesel Voucher' }
];

export default function PaymentsUnified() {
    const { user, isSuperAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'transactions'
    const [showAddModal, setShowAddModal] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        payment_type: '',
        from_date: '',
        to_date: '',
        hpa_id: ''
    });

    const debouncedSearch = useDebouncedValue(search, 300);

    // API Queries
    const { data: paymentsData, isLoading: loadingPayments } = useGetPaymentTransactionsQuery(filters);
    const { data: hpasData } = useGetHPAsQuery({ search: debouncedSearch, page, page_size: pageSize });
    
    const payments = paymentsData?.results || paymentsData || [];
    const hpas = Array.isArray(hpasData) ? hpasData : (hpasData?.results || []);

    // Calculate summary
    const summary = useMemo(() => {
        const result = {
            total: 0,
            byType: {},
            count: payments.length
        };
        
        PAYMENT_TYPES.forEach(pt => {
            result.byType[pt.value] = 0;
        });
        
        payments.forEach(payment => {
            result.total += parseFloat(payment.amount) || 0;
            if (result.byType[payment.payment_type] !== undefined) {
                result.byType[payment.payment_type] += parseFloat(payment.amount) || 0;
            }
        });
        
        return result;
    }, [payments]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const clearFilters = () => {
        setFilters({
            payment_type: '',
            from_date: '',
            to_date: '',
            hpa_id: ''
        });
        setSearch('');
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                        <span className="gradient-text">Payment Management</span>
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '4px' }}>
                        Comprehensive truck payment tracking and analytics
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <PlusIcon style={{ width: '20px', height: '20px' }} />
                    Add Payment
                </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '24px',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '0'
            }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        padding: '12px 24px',
                        background: activeTab === 'overview' ? 'white' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'overview' ? '3px solid #3b82f6' : '3px solid transparent',
                        color: activeTab === 'overview' ? '#3b82f6' : '#6b7280',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <ChartBarIcon style={{ width: '20px', height: '20px' }} />
                    Analytics & HPAs
                </button>
                <button
                    onClick={() => setActiveTab('transactions')}
                    style={{
                        padding: '12px 24px',
                        background: activeTab === 'transactions' ? 'white' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'transactions' ? '3px solid #3b82f6' : '3px solid transparent',
                        color: activeTab === 'transactions' ? '#3b82f6' : '#6b7280',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <BanknotesIcon style={{ width: '20px', height: '20px' }} />
                    All Transactions
                </button>
            </div>

            {/* Summary Cards - Always Visible */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px', 
                marginBottom: '24px' 
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '14px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BanknotesIcon style={{ width: '18px', height: '18px' }} />
                        Total Payments
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
                        {formatCurrency(summary.total)}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                        {summary.count} transactions
                    </div>
                </div>
                
                {PAYMENT_TYPES.slice(0, 3).map(pt => (
                    <div key={pt.value} style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid #e5e7eb',
                        borderLeft: `4px solid ${pt.color}`
                    }}>
                        <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{pt.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: '#111827' }}>
                            {formatCurrency(summary.byType[pt.value])}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            {payments.filter(p => p.payment_type === pt.value).length} txns
                        </div>
                    </div>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' ? (
                <OverviewTab 
                    hpas={hpas}
                    hpasData={hpasData}
                    search={search}
                    setSearch={setSearch}
                    page={page}
                    setPage={setPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    formatCurrency={formatCurrency}
                />
            ) : (
                <TransactionsTab
                    payments={payments}
                    loadingPayments={loadingPayments}
                    filters={filters}
                    setFilters={setFilters}
                    clearFilters={clearFilters}
                    formatCurrency={formatCurrency}
                    hpas={hpas}
                />
            )}

            {/* Add Payment Modal */}
            {showAddModal && (
                <AddPaymentModal
                    hpas={hpas}
                    onClose={() => setShowAddModal(false)}
                    userBranchId={user?.branch?.id}
                />
            )}
        </div>
    );
}

function OverviewTab({ hpas, hpasData, search, setSearch, page, setPage, pageSize, setPageSize, formatCurrency }) {
    const isLoading = false; // You can pass this from parent if needed

    const getPaymentStatusBadge = (hpa) => {
        const remaining = parseFloat(hpa.balance_rs) || 0;
        
        if (remaining <= 0) {
            return <span className="badge-success">Fully Paid</span>;
        } else if (remaining < parseFloat(hpa.lorry_hire_rs || 0)) {
            return <span className="badge-warning">Partial</span>;
        } else {
            return <span className="badge-error">Pending</span>;
        }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TruckIcon style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                    Active HPAs & Payment Status
                </h2>
            </div>
            
            {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    Loading HPAs...
                </div>
            ) : hpas.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    No HPAs found
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    {/* Search + Pagination controls */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Search HPA/LR/Truck..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            style={{ maxWidth: '300px' }}
                        />
                        {hpasData?.count !== undefined && (
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setPage(Math.max(1, page - 1))} 
                                    disabled={!hpasData?.previous}
                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                >
                                    Prev
                                </button>
                                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                                    Page {page}
                                </span>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setPage(page + 1)} 
                                    disabled={!hpasData?.next}
                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                >
                                    Next
                                </button>
                                <select 
                                    className="input" 
                                    value={pageSize} 
                                    onChange={(e) => { setPageSize(parseInt(e.target.value) || 25); setPage(1); }}
                                    style={{ width: '80px', padding: '8px' }}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                    Total: {hpasData?.count || hpas.length}
                                </span>
                            </div>
                        )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>HPA Number</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Truck</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Driver</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Lorry Hire</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Paid</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Balance</th>
                                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hpas.map(hpa => {
                                const lorryHire = parseFloat(hpa.lorry_hire_rs) || 0;
                                const balance = parseFloat(hpa.balance_rs) || 0;
                                const paid = lorryHire - balance;
                                
                                return (
                                    <tr key={hpa.id} style={{ 
                                        borderBottom: '1px solid #e5e7eb',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                    >
                                        <td style={{ padding: '16px 12px', fontWeight: 600, color: '#3b82f6' }}>
                                            {hpa.hpa_number}
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>{hpa.truck_number}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px' }}>{hpa.driver_name}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600 }}>
                                            {formatCurrency(lorryHire)}
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                                            {formatCurrency(paid)}
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 700, color: balance > 0 ? '#ef4444' : '#10b981' }}>
                                            {formatCurrency(balance)}
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            {getPaymentStatusBadge(hpa)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function TransactionsTab({ payments, loadingPayments, filters, setFilters, clearFilters, formatCurrency, hpas }) {
    const [deletePayment] = useDeletePaymentTransactionMutation();

    const handleDelete = async (paymentId) => {
        if (!window.confirm('Are you sure you want to delete this payment?')) return;
        
        try {
            await deletePayment(paymentId).unwrap();
            toast.success('Payment deleted successfully');
        } catch (error) {
            toast.error('Failed to delete payment');
        }
    };

    return (
        <div className="card">
            {/* Filters */}
            <div style={{ 
                background: '#f9fafb', 
                borderRadius: '12px', 
                padding: '16px', 
                marginBottom: '24px',
                border: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FunnelIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                        <span style={{ fontWeight: 600, color: '#374151' }}>Filters:</span>
                    </div>
                    
                    <select
                        className="input"
                        style={{ width: '180px' }}
                        value={filters.payment_type}
                        onChange={(e) => setFilters({ ...filters, payment_type: e.target.value })}
                    >
                        <option value="">All Types</option>
                        {PAYMENT_TYPES.map(pt => (
                            <option key={pt.value} value={pt.value}>{pt.label}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        className="input"
                        style={{ width: '150px' }}
                        placeholder="From Date"
                        value={filters.from_date}
                        onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                    />

                    <input
                        type="date"
                        className="input"
                        style={{ width: '150px' }}
                        placeholder="To Date"
                        value={filters.to_date}
                        onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                    />

                    <select
                        className="input"
                        style={{ width: '200px' }}
                        value={filters.hpa_id}
                        onChange={(e) => setFilters({ ...filters, hpa_id: e.target.value })}
                    >
                        <option value="">All HPAs</option>
                        {hpas.map(hpa => (
                            <option key={hpa.id} value={hpa.id}>
                                {hpa.hpa_number} - {hpa.truck_number}
                            </option>
                        ))}
                    </select>

                    {(filters.payment_type || filters.from_date || filters.to_date || filters.hpa_id) && (
                        <button
                            onClick={clearFilters}
                            className="btn btn-secondary"
                            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <XMarkIcon style={{ width: '16px', height: '16px' }} />
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Transactions Table */}
            {loadingPayments ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: '16px' }}>Loading transactions...</div>
                </div>
            ) : payments.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <BanknotesIcon style={{ width: '48px', height: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
                    <div style={{ fontSize: '16px', color: '#6b7280' }}>No payment transactions found</div>
                    <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                        Try adjusting your filters or add a new payment
                    </div>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Date</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>HPA</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Type</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Amount</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Method</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(payment => {
                                const paymentType = PAYMENT_TYPES.find(pt => pt.value === payment.payment_type);
                                return (
                                    <tr key={payment.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                                            {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                                        </td>
                                        <td style={{ padding: '12px', fontWeight: 600, color: '#3b82f6', fontSize: '14px' }}>
                                            {payment.hpa_display || payment.hpa}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                background: paymentType ? `${paymentType.color}20` : '#f3f4f6',
                                                color: paymentType?.color || '#6b7280'
                                            }}>
                                                {paymentType?.label || payment.payment_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: '15px', color: '#111827' }}>
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                                            {payment.payment_method_display || payment.payment_method}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                                            {payment.pump_name && <div>Pump: {payment.pump_name}</div>}
                                            {payment.bank_name && <div>Bank: {payment.bank_name}</div>}
                                            {payment.reference_number && <div>Ref: {payment.reference_number}</div>}
                                            {payment.remarks && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{payment.remarks}</div>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function AddPaymentModal({ hpas, onClose, userBranchId }) {
    const [createPayment, { isLoading }] = useCreatePaymentTransactionMutation();
    const [formData, setFormData] = useState({
        hpa: '',
        payment_type: 'ADVANCE',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'CASH',
        reference_number: '',
        pump_name: '',
        bank_name: '',
        remarks: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            await createPayment({
                ...formData,
                branch: userBranchId
            }).unwrap();
            toast.success('Payment recorded successfully!');
            onClose();
        } catch (error) {
            console.error('Error creating payment:', error);
            toast.error('Failed to record payment: ' + (error.data?.detail || error.message));
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '550px',
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                <div style={{ 
                    padding: '20px 24px', 
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>
                            Record Payment
                        </h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            Add a new payment transaction
                        </p>
                    </div>
                    <button onClick={onClose} style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        padding: '8px'
                    }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label className="form-label">HPA *</label>
                        <select
                            className="input"
                            value={formData.hpa}
                            onChange={(e) => setFormData({ ...formData, hpa: e.target.value })}
                            required
                        >
                            <option value="">Select HPA</option>
                            {hpas.map(hpa => (
                                <option key={hpa.id} value={hpa.id}>
                                    {hpa.hpa_number} - {hpa.truck_number} ({hpa.driver_name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label className="form-label">Payment Type *</label>
                            <select
                                className="input"
                                value={formData.payment_type}
                                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                                required
                            >
                                {PAYMENT_TYPES.map(pt => (
                                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Amount (₹) *</label>
                            <input
                                type="number"
                                step="0.01"
                                className="input"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label className="form-label">Payment Date *</label>
                            <input
                                type="date"
                                className="input"
                                value={formData.payment_date}
                                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="form-label">Payment Method *</label>
                            <select
                                className="input"
                                value={formData.payment_method}
                                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                required
                            >
                                {PAYMENT_METHODS.map(pm => (
                                    <option key={pm.value} value={pm.value}>{pm.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {formData.payment_type === 'DIESEL' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label">Pump Name *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.pump_name}
                                onChange={(e) => setFormData({ ...formData, pump_name: e.target.value })}
                                placeholder="Enter diesel pump name"
                                required
                            />
                        </div>
                    )}

                    {formData.payment_type === 'BANK' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label">Bank Name *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.bank_name}
                                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                placeholder="Enter bank name"
                                required
                            />
                        </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                        <label className="form-label">Reference Number</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.reference_number}
                            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                            placeholder="Transaction reference"
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label className="form-label">Remarks</label>
                        <textarea
                            className="input"
                            rows={3}
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
