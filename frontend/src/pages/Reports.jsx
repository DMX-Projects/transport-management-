import { useState, useEffect } from 'react';
// Backend-driven HPA search & pagination is handled via getHPAReport
import { useGetReportsSummaryQuery, useGetLRReportQuery, useGetHPAReportQuery, useGetPaymentReportQuery, useGetBillReportQuery, useRequestBillPdfMutation, useRequestLrPdfMutation, useRequestHpaPdfMutation, useCheckTaskStatusQuery } from '../features/reports/reportsApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const reportTypes = [
    { id: 'summary', label: 'Executive Summary', icon: '📊' },
    { id: 'lr', label: 'LR Report', icon: '📋' },
    { id: 'hpa', label: 'HPA Report', icon: '💼' },
    { id: 'payment', label: 'Payment Report', icon: '💳' },
    { id: 'bill', label: 'Bill Report', icon: '📄' },
];

export default function Reports() {
    const [reportType, setReportType] = useState('summary');
    const [fromDate, setFromDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('');
    const [pageSize, setPageSize] = useState(20);
    const [hpaSearch, setHpaSearch] = useState('');
    const [hpaPage, setHpaPage] = useState(1);
    const [lrSearch, setLrSearch] = useState('');
    const [lrPage, setLrPage] = useState(1);
    const [paymentSearch, setPaymentSearch] = useState('');
    const [paymentPage, setPaymentPage] = useState(1);
    const [billSearch, setBillSearch] = useState('');
    const [billPage, setBillPage] = useState(1);
    
    // PDF download state
    const [pdfTaskId, setPdfTaskId] = useState(null);
    const [pdfProgress, setPdfProgress] = useState(0);
    const [pdfStatus, setPdfStatus] = useState(null);
    const [pdfError, setPdfError] = useState(null);

    const debouncedHpaSearch = useDebouncedValue(hpaSearch, 300);
    const debouncedLrSearch = useDebouncedValue(lrSearch, 300);
    const debouncedPaymentSearch = useDebouncedValue(paymentSearch, 300);
    const debouncedBillSearch = useDebouncedValue(billSearch, 300);

    // PDF generation mutations
    const [requestBillPdf] = useRequestBillPdfMutation();
    const [requestLrPdf] = useRequestLrPdfMutation();
    const [requestHpaPdf] = useRequestHpaPdfMutation();
    
    // Poll task status when generating PDF
    const { data: taskStatus } = useCheckTaskStatusQuery(
        pdfTaskId,
        { skip: !pdfTaskId, pollingInterval: 2000 }
    );

    // Fetch reports based on type
    const { data: summaryData, isLoading: isLoadingSummary } = useGetReportsSummaryQuery(
        { from_date: fromDate, to_date: toDate },
        { skip: reportType !== 'summary' }
    );
    
    const { data: lrData, isLoading: isLoadingLR } = useGetLRReportQuery(
        { from_date: fromDate, to_date: toDate, status, search: debouncedLrSearch, page: lrPage, page_size: pageSize },
        { skip: reportType !== 'lr' }
    );
    
    const { data: hpaData, isLoading: isLoadingHPA } = useGetHPAReportQuery(
        { from_date: fromDate, to_date: toDate, payment_status: status, search: debouncedHpaSearch, page: hpaPage, page_size: pageSize },
        { skip: reportType !== 'hpa' }
    );
    
    const { data: paymentData, isLoading: isLoadingPayment } = useGetPaymentReportQuery(
        { from_date: fromDate, to_date: toDate, status, search: debouncedPaymentSearch, page: paymentPage, page_size: pageSize },
        { skip: reportType !== 'payment' }
    );
    
    const { data: billData, isLoading: isLoadingBill } = useGetBillReportQuery(
        { from_date: fromDate, to_date: toDate, status, search: debouncedBillSearch, page: billPage, page_size: pageSize },
        { skip: reportType !== 'bill' }
    );

    // Handle PDF task status updates
    useEffect(() => {
        if (!taskStatus) return;
        
        setPdfProgress(taskStatus.progress || 0);
        setPdfStatus(taskStatus.status);
        
        if (taskStatus.status === 'success') {
            // Auto-download when ready
            const downloadUrl = taskStatus.download_url;
            const filename = taskStatus.file_name;
            downloadPdfFile(downloadUrl, filename);
            setPdfTaskId(null);
        } else if (taskStatus.status === 'failed') {
            setPdfError(taskStatus.error || 'PDF generation failed');
            setPdfTaskId(null);
        }
    }, [taskStatus]);

    const downloadPdfFile = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            link.href = blobUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
            console.error('Download failed:', error);
            setPdfError('Failed to download PDF');
        });
    };

    const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString()}`;

    const handleExportPDF = async () => {
        if (reportType === 'summary') {
            setPdfError('PDF export not available for Summary reports');
            return;
        }

        let itemsToExport = [];
        let reportName = '';

        try {
            setPdfError(null);
            setPdfProgress(0);
            setPdfStatus('pending');

            switch (reportType) {
                case 'lr':
                    itemsToExport = lrData?.results || [];
                    reportName = 'LR';
                    break;
                case 'hpa':
                    itemsToExport = hpaData?.results || [];
                    reportName = 'HPA';
                    break;
                case 'bill':
                    itemsToExport = billData?.results || [];
                    reportName = 'Bill';
                    break;
                default:
                    setPdfError('PDF export not available for this report type');
                    return;
            }

            if (!itemsToExport.length) {
                setPdfError(`No ${reportName} data available to export`);
                setPdfStatus(null);
                return;
            }

            const firstItem = itemsToExport[0];
            if (!firstItem.id) {
                setPdfError('Invalid item data');
                setPdfStatus(null);
                return;
            }

            let result;
            switch (reportType) {
                case 'lr':
                    result = await requestLrPdf(firstItem.id).unwrap();
                    break;
                case 'hpa':
                    result = await requestHpaPdf(firstItem.id).unwrap();
                    break;
                case 'bill':
                    result = await requestBillPdf(firstItem.id).unwrap();
                    break;
            }

            if (result?.task_id) {
                setPdfTaskId(result.task_id);
                setPdfStatus('processing');
            }
        } catch (error) {
            console.error('PDF request error:', error);
            setPdfError(error?.data?.error || 'Failed to request PDF export');
            setPdfStatus(null);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                    <span className="gradient-text">Reports & Analytics</span>
                </h1>
                <p style={{ color: '#6b7280' }}>Generate detailed reports on LRs, HPAs, Payments, and Bills</p>
            </div>

            {/* Filters */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                    Report Filters
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                            From Date
                        </label>
                        <input
                            type="date"
                            className="input"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                            To Date
                        </label>
                        <input
                            type="date"
                            className="input"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                    {reportType !== 'hpa' ? (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                                Status Filter
                            </label>
                            <select
                                className="input"
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setLrPage(1);
                                    setHpaPage(1);
                                    setPaymentPage(1);
                                    setBillPage(1);
                                }}
                            >
                                <option value="">All</option>
                                <option value="PENDING">Pending</option>
                                <option value="PAID">Paid</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="ISSUED">Issued</option>
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                                Search HPA (Number)
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., BA-0002"
                                value={hpaSearch}
                                onChange={(e) => { setHpaSearch(e.target.value); setHpaPage(1); }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                                <button className="btn btn-secondary" type="button" disabled={!hpaData?.previous || hpaPage <= 1} onClick={() => setHpaPage((p) => Math.max(1, p - 1))}>Prev</button>
                                <button className="btn btn-secondary" type="button" disabled={!hpaData?.next} onClick={() => setHpaPage((p) => p + 1)}>Next</button>
                                {hpaData?.count !== undefined && (
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {hpaPage}</span>
                                )}
                                <select className="input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 20); setHpaPage(1); }}>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                    )}
                    {reportType === 'lr' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                                Search LR
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="LR number, truck, consignor"
                                value={lrSearch}
                                onChange={(e) => { setLrSearch(e.target.value); setLrPage(1); }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                                <button className="btn btn-secondary" type="button" disabled={!lrData?.previous || lrPage <= 1} onClick={() => setLrPage((p) => Math.max(1, p - 1))}>Prev</button>
                                <button className="btn btn-secondary" type="button" disabled={!lrData?.next} onClick={() => setLrPage((p) => p + 1)}>Next</button>
                                {lrData?.count !== undefined && (
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {lrPage}</span>
                                )}
                                <select className="input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 20); setLrPage(1); }}>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                    )}
                    {reportType === 'payment' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                                Search Payment
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Payment #, HPA #, reference"
                                value={paymentSearch}
                                onChange={(e) => { setPaymentSearch(e.target.value); setPaymentPage(1); }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                                <button className="btn btn-secondary" type="button" disabled={!paymentData?.previous || paymentPage <= 1} onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}>Prev</button>
                                <button className="btn btn-secondary" type="button" disabled={!paymentData?.next} onClick={() => setPaymentPage((p) => p + 1)}>Next</button>
                                {paymentData?.count !== undefined && (
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {paymentPage}</span>
                                )}
                                <select className="input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 20); setPaymentPage(1); }}>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                    )}
                    {reportType === 'bill' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                                Search Bill
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Bill #, Consignor, GSTIN"
                                value={billSearch}
                                onChange={(e) => { setBillSearch(e.target.value); setBillPage(1); }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                                <button className="btn btn-secondary" type="button" disabled={!billData?.previous || billPage <= 1} onClick={() => setBillPage((p) => Math.max(1, p - 1))}>Prev</button>
                                <button className="btn btn-secondary" type="button" disabled={!billData?.next} onClick={() => setBillPage((p) => p + 1)}>Next</button>
                                {billData?.count !== undefined && (
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {billPage}</span>
                                )}
                                <select className="input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 20); setBillPage(1); }}>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Report Type Selection */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#111827' }}>
                    Select Report Type
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    {reportTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setReportType(type.id)}
                            style={{
                                padding: '16px',
                                border: reportType === type.id ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
                                background: reportType === type.id ? '#f5f3ff' : '#fff',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{type.icon}</div>
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                    className="btn btn-primary"
                    onClick={handleExportPDF}
                    disabled={pdfStatus === 'processing'}
                >
                    {pdfStatus === 'processing' ? (
                        <>📥 Generating PDF ({pdfProgress}%)</>
                    ) : (
                        <>📥 Export to PDF</>
                    )}
                </button>
            </div>

            {/* PDF Status Messages */}
            {pdfError && (
                <div style={{
                    padding: '12px 16px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '6px',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>❌ {pdfError}</span>
                    <button
                        onClick={() => setPdfError(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {pdfStatus === 'processing' && (
                <div style={{
                    padding: '12px 16px',
                    background: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '6px',
                    fontSize: '14px'
                }}>
                    <div style={{ marginBottom: '8px' }}>⏳ Generating PDF... {pdfProgress}%</div>
                    <div style={{
                        width: '100%',
                        height: '6px',
                        background: '#bfdbfe',
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            background: '#3b82f6',
                            width: `${pdfProgress}%`,
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            )}

            {pdfStatus === 'success' && (
                <div style={{
                    padding: '12px 16px',
                    background: '#dcfce7',
                    color: '#166534',
                    borderRadius: '6px',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>✓ PDF downloaded successfully!</span>
                    <button
                        onClick={() => setPdfStatus(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Report Content */}
            {reportType === 'summary' && (
                <SummaryReport data={summaryData} isLoading={isLoadingSummary} formatCurrency={formatCurrency} />
            )}
            {reportType === 'lr' && (
                <LRReport data={lrData} isLoading={isLoadingLR} formatCurrency={formatCurrency} />
            )}
            {reportType === 'hpa' && (
                <HPAReport data={hpaData} isLoading={isLoadingHPA} formatCurrency={formatCurrency} />
            )}
            {reportType === 'payment' && (
                <PaymentReport data={paymentData} isLoading={isLoadingPayment} formatCurrency={formatCurrency} />
            )}
            {reportType === 'bill' && (
                <BillReport data={billData} isLoading={isLoadingBill} formatCurrency={formatCurrency} />
            )}
        </div>
    );
}

function SummaryReport({ data, isLoading, formatCurrency }) {
    if (isLoading) return <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading summary...</div>;
    if (!data) return <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No data available</div>;

    const { summary, lr_status_breakdown, hpa_status_breakdown, bill_status_breakdown } = data;

    return (
        <div className="card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>Executive Summary</h2>
            
            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <MetricCard label="Total LRs" value={summary.total_lrs} />
                <MetricCard label="Total HPAs" value={summary.total_hpas} />
                <MetricCard label="Total Payments" value={summary.total_payments} />
                <MetricCard label="Total Bills" value={summary.total_bills} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <MetricCard label="Total Freight" value={formatCurrency(summary.total_freight_charge)} />
                <MetricCard label="Total Lorry Hire" value={formatCurrency(summary.total_lorry_hire)} />
                <MetricCard label="Amount Paid" value={formatCurrency(summary.total_amount_paid)} />
                <MetricCard label="Amount Billed" value={formatCurrency(summary.total_amount_billed)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <MetricCard label="Amount Collected" value={formatCurrency(summary.total_amount_collected)} color="#16a34a" />
                <MetricCard label="Pending Collection" value={formatCurrency(summary.pending_collection)} color="#dc2626" />
            </div>

            {/* Status Breakdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '32px' }}>
                <BreakdownCard title="LR Status Breakdown" data={lr_status_breakdown} />
                <BreakdownCard title="HPA Status Breakdown" data={hpa_status_breakdown} />
                <BreakdownCard title="Bill Status Breakdown" data={bill_status_breakdown} />
            </div>
        </div>
    );
}

function MetricCard({ label, value, color = '#8b5cf6' }) {
    return (
        <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', borderLeft: `4px solid ${color}` }}>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{label}</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{value}</p>
        </div>
    );
}

function BreakdownCard({ title, data }) {
    return (
        <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#111827' }}>{title}</h3>
            {Object.entries(data).map(([status, count]) => (
                <div key={status} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#4b5563' }}>{status}</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{count}</span>
                </div>
            ))}
        </div>
    );
}

function LRReport({ data, isLoading, formatCurrency }) {
    if (isLoading) return <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading LR report...</div>;
    const rows = data?.results || [];
    if (!data || data.count === 0 || rows.length === 0) return <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No LR data available</div>;

    return (
        <div className="card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                Lorry Receipt Report ({data.count} records)
            </h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>LR Number</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Consignor</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Truck</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Qty (MT)</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Freight</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((lr, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{lr.lr_number}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{new Date(lr.lr_date).toLocaleDateString()}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{lr.consignor}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{lr.truck}</td>
                                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#4b5563' }}>{parseFloat(lr.quantity_mt).toFixed(2)}</td>
                                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatCurrency(lr.freight_charge)}</td>
                                <td style={{ padding: '12px', fontSize: '12px' }}>
                                    <span className={`badge badge-${(lr.status || '').toLowerCase()}`}>{lr.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function HPAReport({ data, isLoading, formatCurrency }) {
    if (isLoading) return <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading HPA report...</div>;
    const rows = data?.results || [];
    if (!data || data.count === 0 || rows.length === 0) return <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No HPA data available</div>;

    return (
        <div className="card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                Hire Payment Advice Report ({data.count} records)
            </h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>HPA Number</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Lorry Hire</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Advance</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Balance</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((hpa, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{hpa.hpa_number}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{new Date(hpa.hpa_date).toLocaleDateString()}</td>
                                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatCurrency(hpa.lorry_hire)}</td>
                                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#4b5563' }}>{formatCurrency(hpa.advance_paid)}</td>
                                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 700, color: hpa.balance > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(hpa.balance)}</td>
                                <td style={{ padding: '12px', fontSize: '12px' }}>
                                    <span className={`badge badge-${(hpa.payment_status || '').toLowerCase()}`}>{hpa.payment_status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PaymentReport({ data, isLoading, formatCurrency }) {
    if (isLoading) return <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading Payment report...</div>;
    const rows = data?.results || [];
    if (!data || data.count === 0 || rows.length === 0) return <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No Payment data available</div>;

    return (
        <div className="card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                Payment Report ({data.count} records)
            </h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Payment #</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>HPA</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Method</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Amount</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((payment, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{payment.payment_number}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{new Date(payment.payment_date).toLocaleDateString()}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{payment.hpa_number}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{payment.payment_method}</td>
                                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatCurrency(payment.amount)}</td>
                                <td style={{ padding: '12px', fontSize: '12px' }}>
                                    <span className={`badge badge-${(payment.status || '').toLowerCase()}`}>{payment.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function BillReport({ data, isLoading, formatCurrency }) {
    if (isLoading) return <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading Bill report...</div>;
    const rows = data?.results || [];
    if (!data || data.count === 0 || rows.length === 0) return <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No Bill data available</div>;

    return (
        <div className="card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                Bill Report ({data.count} records)
            </h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Bill #</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Total</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Paid</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Balance</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((bill, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{bill.bill_number}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{new Date(bill.bill_date).toLocaleDateString()}</td>
                                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatCurrency(bill.total_amount)}</td>
                                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{formatCurrency(bill.paid_amount)}</td>
                                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 700, color: bill.balance_amount > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(bill.balance_amount)}</td>
                                <td style={{ padding: '12px', fontSize: '12px' }}>
                                    <span className={`badge badge-${(bill.bill_status || bill.status || '').toLowerCase()}`}>{bill.bill_status || bill.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
