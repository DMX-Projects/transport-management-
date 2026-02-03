import { useState } from 'react';
import { useGetTruckStatementQuery, useGetPendingTruckPaymentsQuery } from '../features/reports/reportsApi';
import { useGetTrucksQuery } from '../features/masters/mastersApi';

export default function TruckStatement() {
    const [selectedTruck, setSelectedTruck] = useState('');
    const [fromDate, setFromDate] = useState(new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState('statement'); // 'statement' or 'pending'

    // Fetch trucks for dropdown
    const { data: trucksData } = useGetTrucksQuery({ page_size: 500 });
    const trucks = trucksData?.results || [];

    // Fetch truck statement
    const { data: statementData, isLoading: isLoadingStatement, refetch: refetchStatement } = useGetTruckStatementQuery(
        { truckId: selectedTruck, from_date: fromDate, to_date: toDate },
        { skip: !selectedTruck || activeTab !== 'statement' }
    );

    // Fetch pending payments
    const { data: pendingData, isLoading: isLoadingPending } = useGetPendingTruckPaymentsQuery(
        { from_date: fromDate, to_date: toDate },
        { skip: activeTab !== 'pending' }
    );

    const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                        🚛 Truck Statement
                    </h1>
                    <p style={{ color: '#6b7280' }}>
                        View payment history and outstanding balance for trucks
                    </p>
                </div>
                <button
                    onClick={handlePrint}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    🖨️ Print
                </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', paddingBottom: '0' }}>
                <button
                    onClick={() => setActiveTab('statement')}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: activeTab === 'statement' ? '#4f46e5' : 'transparent',
                        color: activeTab === 'statement' ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: '8px 8px 0 0',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}
                >
                    📋 Truck Statement
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: activeTab === 'pending' ? '#4f46e5' : 'transparent',
                        color: activeTab === 'pending' ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: '8px 8px 0 0',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}
                >
                    ⏳ Pending Payments
                </button>
            </div>

            {/* Filters */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: activeTab === 'statement' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                gap: '16px',
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                {activeTab === 'statement' && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                            Select Truck *
                        </label>
                        <select
                            value={selectedTruck}
                            onChange={(e) => setSelectedTruck(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px'
                            }}
                        >
                            <option value="">-- Select Truck --</option>
                            {trucks.map(truck => (
                                <option key={truck.id} value={truck.id}>
                                    {truck.truck_number} - {truck.owner_name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                        From Date
                    </label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '14px'
                        }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                        To Date
                    </label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '14px'
                        }}
                    />
                </div>
                {activeTab === 'statement' && (
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            onClick={() => refetchStatement()}
                            disabled={!selectedTruck}
                            style={{
                                width: '100%',
                                padding: '10px 20px',
                                backgroundColor: selectedTruck ? '#10b981' : '#d1d5db',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: selectedTruck ? 'pointer' : 'not-allowed',
                                fontWeight: 600
                            }}
                        >
                            🔍 View Statement
                        </button>
                    </div>
                )}
            </div>

            {/* Truck Statement Tab */}
            {activeTab === 'statement' && (
                <>
                    {!selectedTruck && (
                        <div style={{
                            padding: '60px',
                            textAlign: 'center',
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            color: '#6b7280'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚛</div>
                            <p style={{ fontSize: '18px', fontWeight: 500 }}>Select a truck to view statement</p>
                            <p style={{ fontSize: '14px', marginTop: '8px' }}>Choose a truck from the dropdown above</p>
                        </div>
                    )}

                    {selectedTruck && isLoadingStatement && (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                            Loading statement...
                        </div>
                    )}

                    {selectedTruck && statementData && (
                        <>
                            {/* Truck Info Header */}
                            <div style={{
                                padding: '20px',
                                backgroundColor: '#1e40af',
                                color: 'white',
                                borderRadius: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
                                            {statementData.truck?.truck_number}
                                        </h2>
                                        <p style={{ opacity: 0.9 }}>
                                            Owner: {statementData.truck?.owner_name} | Driver: {statementData.truck?.driver_name}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '14px', opacity: 0.8 }}>Period</p>
                                        <p style={{ fontWeight: 600 }}>
                                            {statementData.period?.from_date} to {statementData.period?.to_date}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    borderLeft: '4px solid #3b82f6'
                                }}>
                                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Total HPAs</p>
                                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>
                                        {statementData.summary?.total_hpas || 0}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    borderLeft: '4px solid #10b981'
                                }}>
                                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Total Lorry Hire</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                                        {formatCurrency(statementData.summary?.total_lorry_hire)}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    borderLeft: '4px solid #8b5cf6'
                                }}>
                                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Total Paid</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6' }}>
                                        {formatCurrency(statementData.summary?.total_paid)}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    borderLeft: '4px solid #ef4444'
                                }}>
                                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Balance Outstanding</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
                                        {formatCurrency(statementData.summary?.total_balance)}
                                    </p>
                                </div>
                            </div>

                            {/* Payment Breakdown */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '16px'
                            }}>
                                <div style={{
                                    padding: '16px',
                                    backgroundColor: '#fef3c7',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ color: '#92400e', fontSize: '12px', fontWeight: 500 }}>Advance Paid</p>
                                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#d97706' }}>
                                        {formatCurrency(statementData.summary?.total_advance)}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '16px',
                                    backgroundColor: '#dbeafe',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ color: '#1e40af', fontSize: '12px', fontWeight: 500 }}>Diesel Paid</p>
                                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>
                                        {formatCurrency(statementData.summary?.total_diesel)}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '16px',
                                    backgroundColor: '#d1fae5',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ color: '#065f46', fontSize: '12px', fontWeight: 500 }}>Bank Transfer</p>
                                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
                                        {formatCurrency(statementData.summary?.total_bank)}
                                    </p>
                                </div>
                            </div>

                            {/* Transactions Table */}
                            <div style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    padding: '16px 20px',
                                    backgroundColor: '#f9fafb',
                                    borderBottom: '1px solid #e5e7eb'
                                }}>
                                    <h3 style={{ fontWeight: 600, fontSize: '16px' }}>Transaction History</h3>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Lorry Hire</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Advance</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Diesel</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Bank</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {statementData.transactions?.filter(t => t.type === 'HPA').map((txn, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{txn.date}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            backgroundColor: '#dbeafe',
                                                            color: '#1e40af',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}>
                                                            {txn.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>{txn.reference}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{txn.description}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(txn.lorry_hire)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', color: '#f59e0b' }}>{formatCurrency(txn.advance)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', color: '#3b82f6' }}>{formatCurrency(txn.diesel)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', color: '#10b981' }}>{formatCurrency(txn.bank)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', fontWeight: 600, color: txn.balance > 0 ? '#ef4444' : '#10b981' }}>
                                                        {formatCurrency(txn.balance)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!statementData.transactions || statementData.transactions.filter(t => t.type === 'HPA').length === 0) && (
                                                <tr>
                                                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                                        No transactions found for this period
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Pending Payments Tab */}
            {activeTab === 'pending' && (
                <>
                    {isLoadingPending && (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                            Loading pending payments...
                        </div>
                    )}

                    {pendingData && (
                        <>
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                <div style={{
                                    padding: '24px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    borderLeft: '4px solid #ef4444'
                                }}>
                                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Total Pending Amount</p>
                                    <p style={{ fontSize: '32px', fontWeight: 700, color: '#ef4444' }}>
                                        {formatCurrency(pendingData.summary?.total_pending)}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '24px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    borderLeft: '4px solid #f59e0b'
                                }}>
                                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Pending HPAs</p>
                                    <p style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>
                                        {pendingData.summary?.total_hpas || 0}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '24px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    borderLeft: '4px solid #3b82f6'
                                }}>
                                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Trucks with Balance</p>
                                    <p style={{ fontSize: '32px', fontWeight: 700, color: '#3b82f6' }}>
                                        {pendingData.summary?.trucks_with_pending || 0}
                                    </p>
                                </div>
                            </div>

                            {/* By Truck Summary */}
                            <div style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    padding: '16px 20px',
                                    backgroundColor: '#f9fafb',
                                    borderBottom: '1px solid #e5e7eb'
                                }}>
                                    <h3 style={{ fontWeight: 600, fontSize: '16px' }}>Pending by Truck</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', padding: '20px' }}>
                                    {pendingData.by_truck?.map((truck, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setSelectedTruck(truck.truck_id);
                                                setActiveTab('statement');
                                            }}
                                            style={{
                                                padding: '16px',
                                                backgroundColor: '#fef2f2',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                border: '1px solid #fecaca',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: '16px', color: '#1f2937' }}>{truck.truck_number}</p>
                                                    <p style={{ fontSize: '12px', color: '#6b7280' }}>{truck.hpa_count} pending HPAs</p>
                                                </div>
                                                <p style={{ fontWeight: 700, fontSize: '18px', color: '#dc2626' }}>
                                                    {formatCurrency(truck.total_balance)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Detailed Table */}
                            <div style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    padding: '16px 20px',
                                    backgroundColor: '#f9fafb',
                                    borderBottom: '1px solid #e5e7eb'
                                }}>
                                    <h3 style={{ fontWeight: 600, fontSize: '16px' }}>All Pending HPAs</h3>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>HPA #</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Truck</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Route</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Lorry Hire</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Paid</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Balance</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Days</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingData.details?.map((hpa, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>{hpa.hpa_number}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{hpa.hpa_date}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{hpa.truck_number}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{hpa.from_location} → {hpa.to_location}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>{formatCurrency(hpa.lorry_hire)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', color: '#10b981' }}>{formatCurrency(hpa.total_paid)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{formatCurrency(hpa.balance)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            backgroundColor: hpa.days_pending > 30 ? '#fef2f2' : hpa.days_pending > 7 ? '#fef3c7' : '#d1fae5',
                                                            color: hpa.days_pending > 30 ? '#dc2626' : hpa.days_pending > 7 ? '#d97706' : '#059669',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}>
                                                            {hpa.days_pending}d
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!pendingData.details || pendingData.details.length === 0) && (
                                                <tr>
                                                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                                        No pending payments found 🎉
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
