import { useState } from 'react';
import { useGetHPAsQuery, useAddHPATransactionMutation, useGetHPATransactionsQuery } from '../features/hpa/hpaApi';
import { useAuth } from '../hooks/useAuth';
import { XMarkIcon, PlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export default function Payments() {
    const { canEdit } = useAuth();
    const [selectedHPA, setSelectedHPA] = useState(null);
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
    const [showViewTransactionsModal, setShowViewTransactionsModal] = useState(false);
    const [filters, setFilters] = useState({});
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [search, setSearch] = useState('');

    const debouncedSearch = useDebouncedValue(search, 300);

    // Get all HPAs
    const { data: hpasData, isLoading: isLoadingHPAs } = useGetHPAsQuery({ ...filters, search: debouncedSearch, page, page_size: pageSize });
    const hpas = Array.isArray(hpasData) ? hpasData : (hpasData?.results || []);

    // Add HPA transaction mutation
    const [addHPATransaction, { isLoading: isAddingTransaction }] = useAddHPATransactionMutation();

    const handleAddPayment = async (formData) => {
        try {
            await addHPATransaction({ hpaId: selectedHPA.id, ...formData }).unwrap();
            alert('✅ Payment added successfully!');
            setShowAddPaymentModal(false);
        } catch (error) {
            console.error('Error adding payment:', error);
            alert('Error adding payment: ' + (error.data?.detail || error.message || 'Unknown error'));
        }
    };

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
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                    <span className="gradient-text">Payment Management</span>
                </h1>
                <p style={{ color: '#6b7280' }}>Add and track payment transactions for HPAs</p>
            </div>

            {/* HPA List with Payment Options */}
            <div className="card">
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>HPAs</h2>
                
                {isLoadingHPAs ? (
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
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search HPA/LR/Truck"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                style={{ maxWidth: '300px' }}
                            />
                            {hpasData?.count !== undefined && (
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button className="btn" onClick={() => setPage(Math.max(1, page - 1))} disabled={!hpasData?.previous}>Prev</button>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {page}</span>
                                    <button className="btn" onClick={() => setPage(page + 1)} disabled={!hpasData?.next}>Next</button>
                                    <select className="input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 25); setPage(1); }}>
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                    </select>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Total: {hpasData?.count || hpas.length}</span>
                                </div>
                            )}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>HPA Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>LR Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Truck</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Lorry Hire</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Deductions</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Balance</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hpas.map(hpa => (
                                    <tr key={hpa.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '16px 12px', fontWeight: 600, color: '#6366f1' }}>{hpa.hpa_number}</td>
                                        <td style={{ padding: '16px 12px' }}>{hpa.lr_number || 'N/A'}</td>
                                        <td style={{ padding: '16px 12px' }}>{hpa.truck_number || 'N/A'}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(hpa.lorry_hire_rs || 0).toLocaleString()}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', color: '#dc2626' }}>-₹{parseFloat(hpa.total_deductions || 0).toLocaleString()}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>₹{parseFloat(hpa.balance_rs || 0).toLocaleString()}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>{getPaymentStatusBadge(hpa)}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedHPA(hpa);
                                                        setShowViewTransactionsModal(true);
                                                    }}
                                                    style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#10b981' }}
                                                    title="View Transactions"
                                                >
                                                    <EyeIcon style={{ width: '18px', height: '18px' }} />
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedHPA(hpa);
                                                            setShowAddPaymentModal(true);
                                                        }}
                                                        style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6366f1' }}
                                                        title="Add Payment"
                                                    >
                                                        <PlusIcon style={{ width: '18px', height: '18px' }} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Payment Modal */}
            {showAddPaymentModal && selectedHPA && (
                <AddPaymentModal
                    hpa={selectedHPA}
                    onClose={() => {
                        setShowAddPaymentModal(false);
                        setSelectedHPA(null);
                    }}
                    onSubmit={handleAddPayment}
                    isLoading={isAddingTransaction}
                />
            )}

            {/* View Transactions Modal */}
            {showViewTransactionsModal && selectedHPA && (
                <ViewTransactionsModal
                    hpa={selectedHPA}
                    onClose={() => {
                        setShowViewTransactionsModal(false);
                        setSelectedHPA(null);
                    }}
                />
            )}
        </div>
    );
}

function AddPaymentModal({ hpa, onClose, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        transaction_type: 'ADVANCE',
        transaction_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_mode: 'CASH',
        pump_name: '',
        cheque_number: '',
        bank_name: '',
        upi_transaction_id: '',
        reference_number: '',
        description: '',
        remarks: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }} onClick={onClose}>
            <div
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    maxWidth: '700px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '32px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Add Payment</h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            HPA #{hpa.hpa_number} | Balance: ₹{parseFloat(hpa.balance_rs || 0).toLocaleString()}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        {/* Transaction Type */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Transaction Type <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                name="transaction_type"
                                value={formData.transaction_type}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            >
                                <option value="ADVANCE">Advance Payment</option>
                                <option value="DIESEL">Diesel</option>
                                <option value="BANK">Bank Deduction</option>
                                <option value="EXTRA">Extra Charge</option>
                                <option value="OTHER">Other Deduction</option>
                                <option value="BALANCE_PAYMENT">Balance Payment (Final Payment)</option>
                            </select>
                        </div>

                        {/* Transaction Date */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Transaction Date <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="date"
                                name="transaction_date"
                                value={formData.transaction_date}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                required
                                step="0.01"
                                min="0"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* Payment Mode */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Payment Mode <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                name="payment_mode"
                                value={formData.payment_mode}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            >
                                <option value="CASH">Cash</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="UPI">UPI</option>
                                <option value="NEFT">NEFT</option>
                                <option value="RTGS">RTGS</option>
                                <option value="IMPS">IMPS</option>
                            </select>
                        </div>

                        {/* Conditional fields based on transaction type */}
                        {formData.transaction_type === 'DIESEL' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                    Pump Name
                                </label>
                                <input
                                    type="text"
                                    name="pump_name"
                                    value={formData.pump_name}
                                    onChange={handleChange}
                                    placeholder="Enter pump name"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        )}

                        {/* Conditional fields based on payment mode */}
                        {formData.payment_mode === 'CHEQUE' && (
                            <>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                        Cheque Number
                                    </label>
                                    <input
                                        type="text"
                                        name="cheque_number"
                                        value={formData.cheque_number}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                        Bank Name
                                    </label>
                                    <input
                                        type="text"
                                        name="bank_name"
                                        value={formData.bank_name}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        {formData.payment_mode === 'UPI' && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                    UPI Transaction ID
                                </label>
                                <input
                                    type="text"
                                    name="upi_transaction_id"
                                    value={formData.upi_transaction_id}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        )}

                        {(formData.payment_mode === 'BANK_TRANSFER' || formData.payment_mode === 'NEFT' || 
                          formData.payment_mode === 'RTGS' || formData.payment_mode === 'IMPS') && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                    Reference Number
                                </label>
                                <input
                                    type="text"
                                    name="reference_number"
                                    value={formData.reference_number}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        )}

                        {/* Description */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Enter transaction description"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        {/* Remarks */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Remarks
                            </label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                rows="2"
                                placeholder="Additional remarks"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit',
                                    resize: 'vertical'
                                }}
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 24px',
                                background: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Adding...' : 'Add Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ViewTransactionsModal({ hpa, onClose }) {
    const { data: transactionsData, isLoading } = useGetHPATransactionsQuery(hpa.id);
    const transactions = transactionsData?.transactions || [];

    const getTransactionTypeBadge = (type) => {
        const badges = {
            'ADVANCE': { class: 'badge-info', label: 'Advance' },
            'DIESEL': { class: 'badge-warning', label: 'Diesel' },
            'BANK': { class: 'badge-success', label: 'Bank' },
            'EXTRA': { class: 'badge-error', label: 'Extra' },
            'OTHER': { class: 'badge-secondary', label: 'Other' },
        };
        return badges[type] || badges['OTHER'];
    };

    // Calculate totals
    const totals = transactions.reduce((acc, t) => {
        acc[t.transaction_type] = (acc[t.transaction_type] || 0) + parseFloat(t.amount || 0);
        acc.total += parseFloat(t.amount || 0);
        return acc;
    }, { ADVANCE: 0, DIESEL: 0, BANK: 0, EXTRA: 0, OTHER: 0, total: 0 });

    const remainingBalance = (parseFloat(hpa.lorry_hire_rs) || 0) - (parseFloat(hpa.total_deductions) || 0) - totals.total;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }} onClick={onClose}>
            <div
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    maxWidth: '1000px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '32px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>HPA Transactions</h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            HPA #{hpa.hpa_number} - Track all payment transactions
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                        <p style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: 600 }}>Total Advance</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{totals.ADVANCE.toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '12px', border: '2px solid #f59e0b' }}>
                        <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px', fontWeight: 600 }}>Total Diesel</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{totals.DIESEL.toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', borderRadius: '12px', border: '2px solid #10b981' }}>
                        <p style={{ fontSize: '11px', color: '#065f46', marginBottom: '4px', fontWeight: 600 }}>Total Bank</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{totals.BANK.toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', borderRadius: '12px', border: '2px solid #ef4444' }}>
                        <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px', fontWeight: 600 }}>Total Payments</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{totals.total.toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', borderRadius: '12px', border: '2px solid #6366f1' }}>
                        <p style={{ fontSize: '11px', color: '#3730a3', marginBottom: '4px', fontWeight: 600 }}>Remaining Balance</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{remainingBalance.toLocaleString()}</p>
                    </div>
                </div>

                {/* Transactions List */}
                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        Loading transactions...
                    </div>
                ) : transactions.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        No transactions found for this HPA
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Type</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Amount</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Payment Mode</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(transaction => {
                                    const badge = getTransactionTypeBadge(transaction.transaction_type);
                                    return (
                                        <tr key={transaction.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '16px 12px' }}>{transaction.transaction_date}</td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <span className={badge.class}>{badge.label}</span>
                                            </td>
                                            <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600 }}>
                                                ₹{parseFloat(transaction.amount).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>{transaction.payment_mode || '-'}</td>
                                            <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>
                                                {transaction.description || transaction.remarks || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
