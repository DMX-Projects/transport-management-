import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    useGetClientAccountsQuery,
    useGetClientAccountByIdQuery,
    useGetClientAccountsSummaryQuery,
    useAddBillPaymentMutation,
    useGetConsignorBillsQuery,
    useGetConsignorPaymentsQuery,
} from '../features/billing/billingApi';
import { useAuth } from '../hooks/useAuth';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
    MagnifyingGlassIcon,
    CurrencyRupeeIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    EyeIcon,
    PlusIcon,
    XMarkIcon,
    CheckIcon,
    BanknotesIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

export default function ClientPayments() {
    const { isSuperAdmin } = useAuth();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selectedConsignorId, setSelectedConsignorId] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
    
    const debouncedSearch = useDebouncedValue(search, 300);
    
    // API queries
    const { data: accountsData, isLoading, refetch } = useGetClientAccountsQuery({
        search: debouncedSearch,
        page,
        page_size: pageSize,
    });
    const { data: summaryData, isLoading: summaryLoading } = useGetClientAccountsSummaryQuery();
    
    const accounts = accountsData?.results || [];
    const totalCount = accountsData?.count || 0;

    const handleViewDetails = (consignorId) => {
        setSelectedConsignorId(consignorId);
    };

    const handleRecordPayment = (bill) => {
        setSelectedBillForPayment(bill);
        setShowPaymentModal(true);
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                            Client Payment Management
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            Track outstanding balances and record payments from consignors
                        </p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <ArrowPathIcon style={{ width: '18px', height: '18px' }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {/* Total Billed */}
                <div style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    borderRadius: '16px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <CurrencyRupeeIcon style={{ width: '20px', height: '20px', opacity: 0.8 }} />
                        <p style={{ fontSize: '12px', opacity: 0.8 }}>Total Billed</p>
                    </div>
                    <p style={{ fontSize: '24px', fontWeight: 700 }}>
                        Rs.{summaryLoading ? '...' : (summaryData?.total_billed || 0).toLocaleString()}
                    </p>
                </div>

                {/* Total Paid */}
                <div style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '16px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <BanknotesIcon style={{ width: '20px', height: '20px', opacity: 0.8 }} />
                        <p style={{ fontSize: '12px', opacity: 0.8 }}>Total Collected</p>
                    </div>
                    <p style={{ fontSize: '24px', fontWeight: 700 }}>
                        Rs.{summaryLoading ? '...' : (summaryData?.total_paid || 0).toLocaleString()}
                    </p>
                </div>

                {/* Outstanding */}
                <div style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '16px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <ClockIcon style={{ width: '20px', height: '20px', opacity: 0.8 }} />
                        <p style={{ fontSize: '12px', opacity: 0.8 }}>Outstanding</p>
                    </div>
                    <p style={{ fontSize: '24px', fontWeight: 700 }}>
                        Rs.{summaryLoading ? '...' : (summaryData?.total_outstanding || 0).toLocaleString()}
                    </p>
                </div>

                {/* Overdue */}
                <div style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    borderRadius: '16px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <ExclamationTriangleIcon style={{ width: '20px', height: '20px', opacity: 0.8 }} />
                        <p style={{ fontSize: '12px', opacity: 0.8 }}>Overdue Bills</p>
                    </div>
                    <p style={{ fontSize: '24px', fontWeight: 700 }}>
                        {summaryLoading ? '...' : summaryData?.overdue_count || 0}
                    </p>
                    <p style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
                        Rs.{summaryLoading ? '...' : (summaryData?.overdue_amount || 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <MagnifyingGlassIcon style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '18px',
                        height: '18px',
                        color: '#9ca3af'
                    }} />
                    <input
                        type="text"
                        placeholder="Search clients by name, GSTIN..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input"
                        style={{ paddingLeft: '42px' }}
                    />
                </div>
            </div>

            {/* Client Cards Grid */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                    Loading client accounts...
                </div>
            ) : accounts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                    <BuildingOfficeIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                    <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No Client Accounts</p>
                    <p style={{ fontSize: '14px' }}>Client accounts will appear here once bills are created.</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    {accounts.map(account => (
                        <ClientAccountCard
                            key={account.id}
                            account={account}
                            onViewDetails={() => handleViewDetails(account.id)}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalCount > pageSize && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '24px'
                }}>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn btn-secondary"
                    >
                        Previous
                    </button>
                    <span style={{ padding: '8px 16px', fontSize: '14px', color: '#6b7280' }}>
                        Page {page} of {Math.ceil(totalCount / pageSize)}
                    </span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= Math.ceil(totalCount / pageSize)}
                        className="btn btn-secondary"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Client Details Modal */}
            {selectedConsignorId && (
                <ClientDetailsModal
                    consignorId={selectedConsignorId}
                    onClose={() => setSelectedConsignorId(null)}
                    onRecordPayment={handleRecordPayment}
                />
            )}

            {/* Record Payment Modal */}
            {showPaymentModal && selectedBillForPayment && (
                <RecordPaymentModal
                    bill={selectedBillForPayment}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedBillForPayment(null);
                    }}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        setSelectedBillForPayment(null);
                        refetch();
                    }}
                />
            )}
        </div>
    );
}

// Client Account Card Component
function ClientAccountCard({ account, onViewDetails }) {
    const getOutstandingColor = (outstanding) => {
        if (outstanding <= 0) return '#10b981';
        if (outstanding > 100000) return '#ef4444';
        if (outstanding > 50000) return '#f59e0b';
        return '#6b7280';
    };

    return (
        <div
            style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: account.overdue_count > 0 ? '2px solid #ef4444' : '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            onClick={onViewDetails}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                    {account.name}
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                    {account.gstin || 'No GSTIN'} • {account.city || 'N/A'}
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                    <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Total Billed</p>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>
                        Rs.{parseFloat(account.total_billed || 0).toLocaleString()}
                    </p>
                </div>
                <div>
                    <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Total Paid</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                        Rs.{parseFloat(account.total_paid || 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Outstanding */}
            <div style={{
                background: '#f9fafb',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Outstanding</p>
                    <p style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: getOutstandingColor(parseFloat(account.outstanding || 0))
                    }}>
                        Rs.{parseFloat(account.outstanding || 0).toLocaleString()}
                    </p>
                </div>
                {account.overdue_count > 0 && (
                    <div style={{
                        background: '#fee2e2',
                        color: '#991b1b',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <ExclamationTriangleIcon style={{ width: '12px', height: '12px' }} />
                        {account.overdue_count} Overdue
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#6b7280'
            }}>
                <span>{account.total_bills} Bill{account.total_bills !== 1 ? 's' : ''}</span>
                <span>
                    {account.last_payment_date
                        ? `Last payment: ${new Date(account.last_payment_date).toLocaleDateString()}`
                        : 'No payments yet'}
                </span>
            </div>
        </div>
    );
}

// Client Details Modal Component
function ClientDetailsModal({ consignorId, onClose, onRecordPayment }) {
    const { data, isLoading } = useGetClientAccountByIdQuery(consignorId);
    const { data: billsData } = useGetConsignorBillsQuery({ id: consignorId });
    const [activeTab, setActiveTab] = useState('bills');

    if (isLoading) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
            </div>
        );
    }

    const consignor = data?.consignor || {};
    const summary = data?.summary || {};
    const aging = data?.aging || {};
    const recentPayments = data?.recent_payments || [];
    const bills = billsData || [];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '900px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{consignor.name}</h2>
                        <p style={{ fontSize: '13px', color: '#6b7280' }}>
                            GSTIN: {consignor.gstin || 'N/A'} • {consignor.city}, {consignor.state}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    padding: '16px 24px',
                    background: '#f9fafb'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: '#6b7280' }}>Total Billed</p>
                        <p style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                            Rs.{parseFloat(summary.total_billed || 0).toLocaleString()}
                        </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: '#6b7280' }}>Total Paid</p>
                        <p style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                            Rs.{parseFloat(summary.total_paid || 0).toLocaleString()}
                        </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: '#6b7280' }}>Outstanding</p>
                        <p style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
                            Rs.{parseFloat(summary.outstanding || 0).toLocaleString()}
                        </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: '#6b7280' }}>Avg Payment Days</p>
                        <p style={{ fontSize: '18px', fontWeight: 700 }}>
                            {summary.avg_payment_days || 0} days
                        </p>
                    </div>
                </div>

                {/* Aging Breakdown */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>
                        Aging Analysis
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {[
                            { key: 'current', label: 'Current', color: '#10b981' },
                            { key: '0-30', label: '0-30 Days', color: '#22c55e' },
                            { key: '31-60', label: '31-60 Days', color: '#f59e0b' },
                            { key: '61-90', label: '61-90 Days', color: '#f97316' },
                            { key: '90+', label: '90+ Days', color: '#ef4444' },
                        ].map(bucket => (
                            <div key={bucket.key} style={{
                                padding: '8px 16px',
                                background: `${bucket.color}15`,
                                border: `1px solid ${bucket.color}`,
                                borderRadius: '8px',
                                textAlign: 'center',
                                minWidth: '100px'
                            }}>
                                <p style={{ fontSize: '11px', color: bucket.color }}>{bucket.label}</p>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: bucket.color }}>
                                    Rs.{parseFloat(aging[bucket.key] || 0).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '12px 24px',
                    borderBottom: '1px solid #e5e7eb'
                }}>
                    <button
                        onClick={() => setActiveTab('bills')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === 'bills' ? '#3b82f6' : '#f3f4f6',
                            color: activeTab === 'bills' ? 'white' : '#374151',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Bills ({bills.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === 'payments' ? '#3b82f6' : '#f3f4f6',
                            color: activeTab === 'payments' ? 'white' : '#374151',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Recent Payments ({recentPayments.length})
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                    {activeTab === 'bills' && (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Bill #</th>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Amount</th>
                                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Outstanding</th>
                                    <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                                    <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bills.map(bill => (
                                    <tr key={bill.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px 8px', fontWeight: 500 }}>{bill.bill_number}</td>
                                        <td style={{ padding: '12px 8px', color: '#6b7280' }}>
                                            {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                            Rs.{parseFloat(bill.grand_total || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>
                                            Rs.{parseFloat(bill.outstanding_amount || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                background: bill.payment_status === 'PAID' ? '#d1fae5' :
                                                            bill.payment_status === 'OVERDUE' ? '#fee2e2' :
                                                            bill.payment_status === 'PARTIAL' ? '#fef3c7' : '#f3f4f6',
                                                color: bill.payment_status === 'PAID' ? '#065f46' :
                                                       bill.payment_status === 'OVERDUE' ? '#991b1b' :
                                                       bill.payment_status === 'PARTIAL' ? '#92400e' : '#374151'
                                            }}>
                                                {bill.payment_status_display || bill.payment_status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                            {bill.payment_status !== 'PAID' && (
                                                <button
                                                    onClick={() => onRecordPayment(bill)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        margin: '0 auto'
                                                    }}
                                                >
                                                    <PlusIcon style={{ width: '12px', height: '12px' }} />
                                                    Pay
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'payments' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentPayments.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>
                                    No payments recorded yet
                                </p>
                            ) : (
                                recentPayments.map(payment => (
                                    <div key={payment.id} style={{
                                        padding: '12px 16px',
                                        background: '#f9fafb',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <p style={{ fontWeight: 500 }}>Rs.{parseFloat(payment.amount).toLocaleString()}</p>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>
                                                {payment.payment_method_display} • {payment.reference_number || 'No Ref'}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '13px' }}>{payment.bill_number}</p>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>
                                                {new Date(payment.payment_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button onClick={onClose} className="btn btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Record Payment Modal Component
function RecordPaymentModal({ bill, onClose, onSuccess }) {
    const [addPayment, { isLoading }] = useAddBillPaymentMutation();
    const [formData, setFormData] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        amount: parseFloat(bill.outstanding_amount || 0),
        payment_method: 'BANK_TRANSFER',
        reference_number: '',
        bank_name: '',
        remarks: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        const loadingToast = toast.loading('Recording payment...');
        
        try {
            await addPayment({
                billId: bill.id,
                ...formData,
            }).unwrap();
            toast.success('Payment recorded successfully', { id: loadingToast });
            onSuccess();
        } catch (error) {
            console.error('Error recording payment:', error);
            const errorMsg = error.data?.message || error.message || 'Failed to record payment';
            toast.error(errorMsg, { id: loadingToast, duration: 5000 });
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '500px',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Record Payment</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                {/* Bill Info */}
                <div style={{ padding: '16px 24px', background: '#f9fafb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6b7280' }}>Bill</p>
                            <p style={{ fontWeight: 600 }}>{bill.bill_number}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '13px', color: '#6b7280' }}>Outstanding</p>
                            <p style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
                                Rs.{parseFloat(bill.outstanding_amount || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                    Payment Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.payment_date}
                                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={parseFloat(bill.outstanding_amount || 0)}
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                    className="input"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                Payment Method *
                            </label>
                            <select
                                value={formData.payment_method}
                                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                className="input"
                                required
                            >
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="RTGS">RTGS</option>
                                <option value="NEFT">NEFT</option>
                                <option value="DD">Demand Draft</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                    Reference Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.reference_number}
                                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                                    className="input"
                                    placeholder="Transaction ID, Cheque #"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                    Bank Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="input"
                                    placeholder="HDFC, SBI, etc."
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                Remarks
                            </label>
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                className="input"
                                rows={2}
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        marginTop: '24px'
                    }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <CheckIcon style={{ width: '18px', height: '18px' }} />
                            {isLoading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

