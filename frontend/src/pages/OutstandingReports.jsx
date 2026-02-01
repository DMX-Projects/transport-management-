import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    useGetOutstandingSummaryQuery,
    useGetOutstandingDetailedQuery,
    useGetAgingAnalysisQuery,
    useGetSettlementReportQuery,
    useGetClientStatementQuery,
    useExportOutstandingMutation,
    useExportAgingMutation,
    useExportSettlementMutation,
    useExportClientStatementMutation,
} from '../features/reports/reportsApi';
import { useGetConsignorsQuery } from '../features/masters/mastersApi';
import { useAuth } from '../hooks/useAuth';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
    MagnifyingGlassIcon,
    CurrencyRupeeIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    DocumentArrowDownIcon,
    FunnelIcon,
    ChartBarIcon,
    ExclamationCircleIcon,
    CheckCircleIcon,
    XMarkIcon,
    ArrowDownTrayIcon,
    TableCellsIcon,
} from '@heroicons/react/24/outline';

export default function OutstandingReports() {
    const { isSuperAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('summary');
    const [selectedConsignorId, setSelectedConsignorId] = useState(null);
    const [showStatementModal, setShowStatementModal] = useState(false);
    
    // Filters for detailed view
    const [filters, setFilters] = useState({
        consignor: '',
        aging: '',
        payment_status: '',
        from_date: '',
        to_date: '',
        order_by: '-outstanding',
        search: '',
    });
    const [page, setPage] = useState(1);
    
    // Settlement date range
    const [settlementDates, setSettlementDates] = useState({
        from_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
    });
    
    // API Queries
    const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useGetOutstandingSummaryQuery();
    const { data: agingData, isLoading: agingLoading } = useGetAgingAnalysisQuery();
    const { data: detailedData, isLoading: detailedLoading } = useGetOutstandingDetailedQuery({
        ...filters,
        page,
    });
    const { data: settlementData, isLoading: settlementLoading, refetch: refetchSettlement } = useGetSettlementReportQuery(settlementDates);
    const { data: consignorsData } = useGetConsignorsQuery({ page_size: 1000 });
    
    // Export mutations
    const [exportOutstanding, { isLoading: exportingOutstanding }] = useExportOutstandingMutation();
    const [exportAging, { isLoading: exportingAging }] = useExportAgingMutation();
    const [exportSettlement, { isLoading: exportingSettlement }] = useExportSettlementMutation();
    
    const consignors = consignorsData?.results || [];
    const outstandingBills = detailedData?.results || [];
    
    const handleViewStatement = (consignorId) => {
        setSelectedConsignorId(consignorId);
        setShowStatementModal(true);
    };

    // Download Excel helper
    const downloadExcel = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    // Export handlers
    const handleExportOutstanding = async () => {
        const loadingToast = toast.loading('Exporting to Excel...');
        try {
            const blob = await exportOutstanding(filters).unwrap();
            downloadExcel(blob, `outstanding_bills_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Excel file downloaded successfully', { id: loadingToast });
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export. Please try again.', { id: loadingToast });
        }
    };

    const handleExportAging = async () => {
        const loadingToast = toast.loading('Exporting to Excel...');
        try {
            const blob = await exportAging().unwrap();
            downloadExcel(blob, `aging_analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Excel file downloaded successfully', { id: loadingToast });
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export. Please try again.', { id: loadingToast });
        }
    };

    const handleExportSettlement = async () => {
        const loadingToast = toast.loading('Exporting to Excel...');
        try {
            const blob = await exportSettlement(settlementDates).unwrap();
            downloadExcel(blob, `settlement_report_${settlementDates.from_date}_${settlementDates.to_date}.xlsx`);
            toast.success('Excel file downloaded successfully', { id: loadingToast });
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export. Please try again.', { id: loadingToast });
        }
    };

    const getRiskBadge = (risk) => {
        const styles = {
            LOW: { bg: '#d1fae5', color: '#065f46' },
            MEDIUM: { bg: '#fef3c7', color: '#92400e' },
            HIGH: { bg: '#fee2e2', color: '#991b1b' },
        };
        const style = styles[risk] || styles.LOW;
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                background: style.bg,
                color: style.color
            }}>
                {risk} RISK
            </span>
        );
    };

    const getAgingBadge = (bucket) => {
        const styles = {
            'current': { bg: '#d1fae5', color: '#065f46' },
            '0-30': { bg: '#dbeafe', color: '#1e40af' },
            '31-60': { bg: '#fef3c7', color: '#92400e' },
            '61-90': { bg: '#fed7aa', color: '#9a3412' },
            '90+': { bg: '#fee2e2', color: '#991b1b' },
        };
        const style = styles[bucket] || styles['current'];
        return (
            <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                background: style.bg,
                color: style.color
            }}>
                {bucket}
            </span>
        );
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                            Outstanding Reports
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            Comprehensive financial analysis and aging reports
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => refetchSummary()}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <ArrowPathIcon style={{ width: '18px', height: '18px' }} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '12px'
            }}>
                {[
                    { id: 'summary', label: 'Summary', icon: ChartBarIcon },
                    { id: 'detailed', label: 'Detailed', icon: DocumentArrowDownIcon },
                    { id: 'aging', label: 'Aging Analysis', icon: ClockIcon },
                    { id: 'settlement', label: 'Settlement', icon: CurrencyRupeeIcon },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                            color: activeTab === tab.id ? 'white' : '#374151',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <tab.icon style={{ width: '18px', height: '18px' }} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Summary Tab */}
            {activeTab === 'summary' && (
                <div>
                    {/* Summary Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px'
                    }}>
                        {/* Total Outstanding */}
                        <div style={{
                            padding: '24px',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            borderRadius: '16px',
                            color: 'white'
                        }}>
                            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '8px' }}>Total Outstanding</p>
                            <p style={{ fontSize: '28px', fontWeight: 700 }}>
                                Rs.{summaryLoading ? '...' : parseFloat(summaryData?.total_outstanding || 0).toLocaleString()}
                            </p>
                            <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                                {summaryData?.outstanding_bills_count || 0} bills
                            </p>
                        </div>

                        {/* Total Billed */}
                        <div style={{
                            padding: '24px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            borderRadius: '16px',
                            color: 'white'
                        }}>
                            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '8px' }}>Total Billed</p>
                            <p style={{ fontSize: '28px', fontWeight: 700 }}>
                                Rs.{summaryLoading ? '...' : parseFloat(summaryData?.total_billed || 0).toLocaleString()}
                            </p>
                        </div>

                        {/* Total Collected */}
                        <div style={{
                            padding: '24px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: '16px',
                            color: 'white'
                        }}>
                            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '8px' }}>Total Collected</p>
                            <p style={{ fontSize: '28px', fontWeight: 700 }}>
                                Rs.{summaryLoading ? '...' : parseFloat(summaryData?.total_collected || 0).toLocaleString()}
                            </p>
                        </div>

                        {/* Collection Rate */}
                        <div style={{
                            padding: '24px',
                            background: 'white',
                            borderRadius: '16px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Collection Rate</p>
                            <p style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>
                                {summaryLoading ? '...' : summaryData?.collection_rate || 0}%
                            </p>
                        </div>
                    </div>

                    {/* Aging Buckets */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                            Aging Breakdown
                        </h3>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {[
                                { key: 'current', label: 'Current', color: '#10b981' },
                                { key: '0-30', label: '0-30 Days', color: '#3b82f6' },
                                { key: '31-60', label: '31-60 Days', color: '#f59e0b' },
                                { key: '61-90', label: '61-90 Days', color: '#f97316' },
                                { key: '90+', label: '90+ Days', color: '#ef4444' },
                            ].map(bucket => {
                                const data = summaryData?.aging_buckets?.[bucket.key] || { count: 0, amount: 0 };
                                return (
                                    <div key={bucket.key} style={{
                                        flex: '1',
                                        minWidth: '150px',
                                        padding: '16px',
                                        background: `${bucket.color}15`,
                                        border: `2px solid ${bucket.color}`,
                                        borderRadius: '12px',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '12px', color: bucket.color, fontWeight: 600 }}>
                                            {bucket.label}
                                        </p>
                                        <p style={{ fontSize: '20px', fontWeight: 700, color: bucket.color, marginTop: '8px' }}>
                                            Rs.{parseFloat(data.amount || 0).toLocaleString()}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                            {data.count || 0} bills
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Top Consignors */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                            Top Consignors by Outstanding
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Consignor</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Bills</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Outstanding</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Overdue</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(summaryData?.top_consignors || []).map((consignor, idx) => (
                                    <tr key={consignor.consignor_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px' }}>
                                            <p style={{ fontWeight: 500 }}>{consignor.consignor_name}</p>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{consignor.gstin}</p>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>{consignor.bill_count}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>
                                            Rs.{parseFloat(consignor.outstanding).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            {consignor.overdue_count > 0 ? (
                                                <span style={{
                                                    background: '#fee2e2',
                                                    color: '#991b1b',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: 600
                                                }}>
                                                    {consignor.overdue_count}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleViewStatement(consignor.consignor_id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Statement
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detailed Tab */}
            {activeTab === 'detailed' && (
                <div>
                    {/* Filters */}
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px',
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap',
                        alignItems: 'flex-end'
                    }}>
                        <div style={{ flex: '1', minWidth: '250px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                                Search
                            </label>
                            <div style={{ position: 'relative' }}>
                                <MagnifyingGlassIcon style={{
                                    position: 'absolute',
                                    left: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '16px',
                                    height: '16px',
                                    color: '#9ca3af'
                                }} />
                                <input
                                    type="text"
                                    placeholder="Bill #, Consignor, GSTIN..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="input"
                                    style={{ paddingLeft: '34px' }}
                                />
                            </div>
                        </div>
                        <div style={{ minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                                Consignor
                            </label>
                            <select
                                value={filters.consignor}
                                onChange={(e) => setFilters({ ...filters, consignor: e.target.value })}
                                className="input"
                            >
                                <option value="">All Consignors</option>
                                {consignors.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                                Aging
                            </label>
                            <select
                                value={filters.aging}
                                onChange={(e) => setFilters({ ...filters, aging: e.target.value })}
                                className="input"
                            >
                                <option value="">All</option>
                                <option value="current">Current</option>
                                <option value="0-30">0-30 Days</option>
                                <option value="31-60">31-60 Days</option>
                                <option value="61-90">61-90 Days</option>
                                <option value="90+">90+ Days</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                                Status
                            </label>
                            <select
                                value={filters.payment_status}
                                onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
                                className="input"
                            >
                                <option value="">All</option>
                                <option value="PENDING">Pending</option>
                                <option value="PARTIAL">Partial</option>
                                <option value="OVERDUE">Overdue</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                                Bill Date From
                            </label>
                            <input
                                type="date"
                                value={filters.from_date}
                                onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                                Bill Date To
                            </label>
                            <input
                                type="date"
                                value={filters.to_date}
                                onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                                Order By
                            </label>
                            <select
                                value={filters.order_by}
                                onChange={(e) => setFilters({ ...filters, order_by: e.target.value })}
                                className="input"
                            >
                                <option value="-outstanding">Outstanding (High to Low)</option>
                                <option value="outstanding">Outstanding (Low to High)</option>
                                <option value="-aging_days">Aging (Old to New)</option>
                                <option value="aging_days">Aging (New to Old)</option>
                            </select>
                        </div>
                        <button
                            onClick={handleExportOutstanding}
                            disabled={exportingOutstanding}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <TableCellsIcon style={{ width: '18px', height: '18px' }} />
                            {exportingOutstanding ? 'Exporting...' : 'Export Excel'}
                        </button>
                    </div>

                    {/* Bills Table */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        {detailedLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                Loading outstanding bills...
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Bill #</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Consignor</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Date</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Amount</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Paid</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Outstanding</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Aging</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {outstandingBills.map(bill => (
                                        <tr key={bill.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '12px', fontWeight: 500 }}>{bill.bill_number}</td>
                                            <td style={{ padding: '12px' }}>
                                                <p>{bill.consignor_name}</p>
                                                <p style={{ fontSize: '11px', color: '#6b7280' }}>{bill.consignor_gstin}</p>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                                                {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                Rs.{parseFloat(bill.grand_total || 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#10b981' }}>
                                                Rs.{parseFloat(bill.payments_received || 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>
                                                Rs.{parseFloat(bill.outstanding || 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                {getAgingBadge(bill.aging_bucket)}
                                                <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                                                    {bill.aging_days} days
                                                </p>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    background: bill.payment_status === 'OVERDUE' ? '#fee2e2' :
                                                                bill.payment_status === 'PARTIAL' ? '#fef3c7' : '#f3f4f6',
                                                    color: bill.payment_status === 'OVERDUE' ? '#991b1b' :
                                                           bill.payment_status === 'PARTIAL' ? '#92400e' : '#374151'
                                                }}>
                                                    {bill.payment_status_display || bill.payment_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* Pagination */}
                        {detailedData?.count > 25 && (
                            <div style={{
                                padding: '16px',
                                borderTop: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="btn btn-secondary"
                                >
                                    Previous
                                </button>
                                <span style={{ padding: '8px 16px', color: '#6b7280' }}>
                                    Page {page}
                                </span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={!detailedData?.next}
                                    className="btn btn-secondary"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Aging Analysis Tab */}
            {activeTab === 'aging' && (
                <div>
                    {/* Risk Assessment Card */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Risk Assessment</h3>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {agingData && getRiskBadge(agingData.risk_assessment)}
                                <button
                                    onClick={handleExportAging}
                                    disabled={exportingAging}
                                    className="btn btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <TableCellsIcon style={{ width: '18px', height: '18px' }} />
                                    {exportingAging ? 'Exporting...' : 'Export Excel'}
                                </button>
                            </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                                <p style={{ fontSize: '12px', color: '#6b7280' }}>Total Outstanding</p>
                                <p style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                                    Rs.{agingLoading ? '...' : parseFloat(agingData?.total_outstanding || 0).toLocaleString()}
                                </p>
                            </div>
                            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                                <p style={{ fontSize: '12px', color: '#6b7280' }}>Average Aging</p>
                                <p style={{ fontSize: '24px', fontWeight: 700 }}>
                                    {agingLoading ? '...' : agingData?.average_aging_days || 0} days
                                </p>
                            </div>
                            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                                <p style={{ fontSize: '12px', color: '#6b7280' }}>High Risk (60+ days)</p>
                                <p style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
                                    Rs.{agingLoading ? '...' : parseFloat(agingData?.high_risk_amount || 0).toLocaleString()}
                                </p>
                                <p style={{ fontSize: '11px', color: '#6b7280' }}>
                                    {agingLoading ? '...' : agingData?.high_risk_percentage || 0}% of total
                                </p>
                            </div>
                            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                                <p style={{ fontSize: '12px', color: '#6b7280' }}>Total Bills</p>
                                <p style={{ fontSize: '24px', fontWeight: 700 }}>
                                    {agingLoading ? '...' : agingData?.total_bills || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Aging Buckets Detailed */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Aging Buckets</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { key: 'current', label: 'Current (Not Due)', color: '#10b981', icon: CheckCircleIcon },
                                { key: '0-30', label: '0-30 Days', color: '#3b82f6', icon: ClockIcon },
                                { key: '31-60', label: '31-60 Days', color: '#f59e0b', icon: ClockIcon },
                                { key: '61-90', label: '61-90 Days', color: '#f97316', icon: ExclamationCircleIcon },
                                { key: '90+', label: '90+ Days (Critical)', color: '#ef4444', icon: ExclamationTriangleIcon },
                            ].map(bucket => {
                                const data = agingData?.aging_buckets?.[bucket.key] || { count: 0, amount: 0, consignor_count: 0 };
                                const percentage = agingData?.total_outstanding > 0
                                    ? (parseFloat(data.amount) / parseFloat(agingData.total_outstanding) * 100).toFixed(1)
                                    : 0;
                                
                                return (
                                    <div key={bucket.key} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px',
                                        background: '#f9fafb',
                                        borderRadius: '12px',
                                        borderLeft: `4px solid ${bucket.color}`
                                    }}>
                                        <bucket.icon style={{ width: '24px', height: '24px', color: bucket.color }} />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 600 }}>{bucket.label}</p>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>
                                                {data.count} bills • {data.consignor_count} consignors
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '18px', fontWeight: 700, color: bucket.color }}>
                                                Rs.{parseFloat(data.amount || 0).toLocaleString()}
                                            </p>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{percentage}%</p>
                                        </div>
                                        {/* Progress bar */}
                                        <div style={{
                                            width: '100px',
                                            height: '8px',
                                            background: '#e5e7eb',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${percentage}%`,
                                                height: '100%',
                                                background: bucket.color,
                                                borderRadius: '4px'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Settlement Tab */}
            {activeTab === 'settlement' && (
                <div>
                    {/* Date Range Selector */}
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-end'
                    }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                                From Date
                            </label>
                            <input
                                type="date"
                                value={settlementDates.from_date}
                                onChange={(e) => setSettlementDates({ ...settlementDates, from_date: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                                To Date
                            </label>
                            <input
                                type="date"
                                value={settlementDates.to_date}
                                onChange={(e) => setSettlementDates({ ...settlementDates, to_date: e.target.value })}
                                className="input"
                            />
                        </div>
                        <button onClick={refetchSettlement} className="btn btn-primary">
                            Apply
                        </button>
                        <button
                            onClick={handleExportSettlement}
                            disabled={exportingSettlement}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <TableCellsIcon style={{ width: '18px', height: '18px' }} />
                            {exportingSettlement ? 'Exporting...' : 'Export Excel'}
                        </button>
                    </div>

                    {/* Settlement Summary */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px'
                    }}>
                        <div style={{
                            padding: '24px',
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Bills Raised</p>
                            <p style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>
                                {settlementLoading ? '...' : settlementData?.bills?.count || 0}
                            </p>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                                Rs.{settlementLoading ? '...' : parseFloat(settlementData?.bills?.amount || 0).toLocaleString()}
                            </p>
                        </div>
                        <div style={{
                            padding: '24px',
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Payments Received</p>
                            <p style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
                                {settlementLoading ? '...' : settlementData?.payments?.count || 0}
                            </p>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                                Rs.{settlementLoading ? '...' : parseFloat(settlementData?.payments?.amount || 0).toLocaleString()}
                            </p>
                        </div>
                        <div style={{
                            padding: '24px',
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Collection Efficiency</p>
                            <p style={{ fontSize: '28px', fontWeight: 700, color: settlementData?.collection_efficiency >= 80 ? '#10b981' : '#f59e0b' }}>
                                {settlementLoading ? '...' : settlementData?.collection_efficiency || 0}%
                            </p>
                        </div>
                        <div style={{
                            padding: '24px',
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Outstanding for Period</p>
                            <p style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>
                                Rs.{settlementLoading ? '...' : parseFloat(settlementData?.outstanding_for_period || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Payment Methods Breakdown */}
                    {settlementData?.payment_methods && Object.keys(settlementData.payment_methods).length > 0 && (
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                                Payment Methods
                            </h3>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                {Object.entries(settlementData.payment_methods).map(([method, data]) => (
                                    <div key={method} style={{
                                        padding: '16px',
                                        background: '#f9fafb',
                                        borderRadius: '12px',
                                        minWidth: '150px'
                                    }}>
                                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{method}</p>
                                        <p style={{ fontSize: '18px', fontWeight: 700 }}>
                                            Rs.{parseFloat(data.amount).toLocaleString()}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#6b7280' }}>{data.count} payments</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Client Statement Modal */}
            {showStatementModal && selectedConsignorId && (
                <ClientStatementModal
                    consignorId={selectedConsignorId}
                    onClose={() => {
                        setShowStatementModal(false);
                        setSelectedConsignorId(null);
                    }}
                />
            )}
        </div>
    );
}

// Client Statement Modal Component
function ClientStatementModal({ consignorId, onClose }) {
    const [dateRange, setDateRange] = useState({
        from_date: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
    });
    
    const { data, isLoading, refetch } = useGetClientStatementQuery({
        consignorId,
        ...dateRange,
    });
    const [exportStatement, { isLoading: exporting }] = useExportClientStatementMutation();

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = async () => {
        const loadingToast = toast.loading('Exporting statement to Excel...');
        try {
            const blob = await exportStatement({
                consignorId,
                ...dateRange,
            }).unwrap();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `statement_${consignorId}_${dateRange.from_date}_${dateRange.to_date}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Statement downloaded successfully', { id: loadingToast });
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export. Please try again.', { id: loadingToast });
        }
    };

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
                <div style={{ color: 'white', fontSize: '18px' }}>Loading statement...</div>
            </div>
        );
    }

    const consignor = data?.consignor || {};
    const summary = data?.summary || {};
    const transactions = data?.transactions || [];

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
                        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Client Statement</h2>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>{consignor.name}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleExportExcel}
                            disabled={exporting}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <TableCellsIcon style={{ width: '18px', height: '18px' }} />
                            {exporting ? 'Exporting...' : 'Download Excel'}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <ArrowDownTrayIcon style={{ width: '18px', height: '18px' }} />
                            Print
                        </button>
                        <button
                            onClick={onClose}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                        </button>
                    </div>
                </div>

                {/* Date Range */}
                <div style={{
                    padding: '16px 24px',
                    background: '#f9fafb',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'flex-end'
                }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                            From
                        </label>
                        <input
                            type="date"
                            value={dateRange.from_date}
                            onChange={(e) => setDateRange({ ...dateRange, from_date: e.target.value })}
                            className="input"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                            To
                        </label>
                        <input
                            type="date"
                            value={dateRange.to_date}
                            onChange={(e) => setDateRange({ ...dateRange, to_date: e.target.value })}
                            className="input"
                        />
                    </div>
                    <button onClick={refetch} className="btn btn-primary">
                        Refresh
                    </button>
                </div>

                {/* Summary */}
                <div style={{
                    padding: '16px 24px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    borderBottom: '1px solid #e5e7eb'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: '#6b7280' }}>Opening Balance</p>
                        <p style={{ fontSize: '16px', fontWeight: 600 }}>
                            Rs.{parseFloat(summary.opening_balance || 0).toLocaleString()}
                        </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: '#6b7280' }}>Bills Raised</p>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>
                            +Rs.{parseFloat(summary.period_billed || 0).toLocaleString()}
                        </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: '#6b7280' }}>Payments</p>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#10b981' }}>
                            -Rs.{parseFloat(summary.period_paid || 0).toLocaleString()}
                        </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: '#6b7280' }}>Closing Balance</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>
                            Rs.{parseFloat(summary.closing_balance || 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Transactions */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Date</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Type</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Reference</th>
                                <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Description</th>
                                <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Debit</th>
                                <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Credit</th>
                                <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ background: '#f9fafb' }}>
                                <td colSpan={6} style={{ padding: '8px', fontWeight: 500 }}>Opening Balance</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                                    Rs.{parseFloat(summary.opening_balance || 0).toLocaleString()}
                                </td>
                            </tr>
                            {transactions.map((txn, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '8px' }}>
                                        {new Date(txn.date).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            background: txn.type === 'BILL' ? '#dbeafe' : '#d1fae5',
                                            color: txn.type === 'BILL' ? '#1e40af' : '#065f46'
                                        }}>
                                            {txn.type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px', fontWeight: 500 }}>{txn.reference}</td>
                                    <td style={{ padding: '8px', color: '#6b7280', fontSize: '13px' }}>{txn.description}</td>
                                    <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444' }}>
                                        {parseFloat(txn.debit) > 0 ? `Rs.${parseFloat(txn.debit).toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', color: '#10b981' }}>
                                        {parseFloat(txn.credit) > 0 ? `Rs.${parseFloat(txn.credit).toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500 }}>
                                        Rs.{parseFloat(txn.balance || 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            <tr style={{ background: '#f9fafb', fontWeight: 600 }}>
                                <td colSpan={6} style={{ padding: '8px' }}>Closing Balance</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b' }}>
                                    Rs.{parseFloat(summary.closing_balance || 0).toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
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

