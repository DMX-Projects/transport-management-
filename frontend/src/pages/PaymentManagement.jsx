import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
    useGetPaymentTransactionsQuery,
    useGetPaymentSummaryQuery,
    useCreatePaymentTransactionMutation,
    useDeletePaymentTransactionMutation
} from '../features/transactions/transactionsApi';
import { useGetHPAsQuery } from '../features/hpa/hpaApi';
import SearchableSelect from '../components/SearchableSelect';
import {
    BanknotesIcon,
    PlusIcon,
    TrashIcon,
    FunnelIcon,
    XMarkIcon,
    CheckCircleIcon,
    ClockIcon
} from '@heroicons/react/24/outline';

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

export default function PaymentManagement() {
    const { user, isSuperAdmin } = useAuth();
    const [showAddModal, setShowAddModal] = useState(false);
    const [filters, setFilters] = useState({
        payment_type: '',
        from_date: '',
        to_date: '',
        hpa_id: ''
    });

    // API Queries
    const { data: paymentsData, isLoading: loadingPayments } = useGetPaymentTransactionsQuery(filters);
    const { data: summaryData } = useGetPaymentSummaryQuery(filters);
    const { data: hpasData } = useGetHPAsQuery({ page_size: 100 });

    const payments = paymentsData?.results || paymentsData || [];
    const hpas = hpasData?.results || hpasData || [];

    // Calculate summary
    const summary = useMemo(() => {
        const result = {
            total: 0,
            byType: {}
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
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                        Payment Management
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '4px' }}>
                        Track and manage all truck payments
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

            {/* Summary Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '16px', 
                marginBottom: '24px' 
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Payments</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>
                        {formatCurrency(summary.total)}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                        {payments.length} transactions
                    </div>
                </div>
                
                {PAYMENT_TYPES.slice(0, 4).map(pt => (
                    <div key={pt.value} style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid #e5e7eb',
                        borderLeft: `4px solid ${pt.color}`
                    }}>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{pt.label}</div>
                        <div style={{ fontSize: '22px', fontWeight: 600, marginTop: '8px', color: '#111827' }}>
                            {formatCurrency(summary.byType[pt.value])}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '16px', 
                marginBottom: '24px',
                border: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FunnelIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                        <span style={{ fontWeight: 500, color: '#374151' }}>Filters:</span>
                    </div>
                    
                    <select
                        className="input"
                        style={{ width: '160px' }}
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
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <XMarkIcon style={{ width: '16px', height: '16px' }} />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Payments Table */}
            <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
            }}>
                {loadingPayments ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                        Loading payments...
                    </div>
                ) : payments.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                        <BanknotesIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No payments found</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-primary"
                            style={{ marginTop: '16px' }}
                        >
                            Add First Payment
                        </button>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Date</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>HPA #</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Truck</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Type</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Amount</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Method</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((payment, index) => {
                                const typeInfo = PAYMENT_TYPES.find(pt => pt.value === payment.payment_type) || PAYMENT_TYPES[7];
                                return (
                                    <tr key={payment.id} style={{ 
                                        borderBottom: index < payments.length - 1 ? '1px solid #e5e7eb' : 'none'
                                    }}>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>
                                            {payment.hpa_number}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            {payment.truck_number}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: '16px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                background: `${typeInfo.color}15`,
                                                color: typeInfo.color
                                            }}>
                                                {typeInfo.label}
                                            </span>
                                        </td>
                                        <td style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '14px', 
                                            fontWeight: 600, 
                                            color: '#111827',
                                            textAlign: 'right'
                                        }}>
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                                            {payment.payment_method_display || payment.payment_method}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                                            {payment.pump_name && <span>Pump: {payment.pump_name}</span>}
                                            {payment.bank_name && <span>Bank: {payment.bank_name}</span>}
                                            {payment.reference_number && <span>Ref: {payment.reference_number}</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

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
            toast.error('Failed to record payment');
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
                maxWidth: '500px',
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
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
                        Record Payment
                    </h2>
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
