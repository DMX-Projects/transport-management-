import { api } from '../../app/api';

export const reportsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Request async PDF generation
        requestBillPdf: builder.mutation({
            query: (billId) => ({
                url: '/reports/request-bill-pdf/',
                method: 'POST',
                body: { bill_id: billId },
            }),
        }),
        requestLrPdf: builder.mutation({
            query: (lrId) => ({
                url: '/reports/request-lr-pdf/',
                method: 'POST',
                body: { lr_id: lrId },
            }),
        }),
        requestHpaPdf: builder.mutation({
            query: (hpaId) => ({
                url: '/reports/request-hpa-pdf/',
                method: 'POST',
                body: { hpa_id: hpaId },
            }),
        }),
        
        // Check task status
        checkTaskStatus: builder.query({
            query: (taskId) => ({
                url: '/reports/task-status/',
                params: { task_id: taskId },
            }),
        }),
        
        // Download generated PDFs
        downloadBillPdf: builder.query({
            query: (billId) => ({
                url: '/reports/download-bill/',
                params: { bill_id: billId },
            }),
        }),
        downloadLrPdf: builder.query({
            query: (lrId) => ({
                url: '/reports/download-lr/',
                params: { lr_id: lrId },
            }),
        }),
        downloadHpaPdf: builder.query({
            query: (hpaId) => ({
                url: '/reports/download-hpa/',
                params: { hpa_id: hpaId },
            }),
        }),
        
        // Synchronous Bill PDF download (on-demand generation)
        downloadBillPdfSync: builder.mutation({
            query: (billId) => ({
                url: '/reports/download-bill-sync/',
                method: 'GET',
                params: { bill_id: billId, t: Date.now() }, // Cache busting with timestamp
                responseHandler: (response) => response.blob(), // Return blob directly
            }),
        }),
        
        // Legacy report endpoints
        getReportsSummary: builder.query({
            query: (params) => ({
                url: '/reports/summary/',
                params,
            }),
            providesTags: ['Report'],
        }),
        getLRReport: builder.query({
            query: (params) => ({
                url: '/reports/lr-report/',
                params,
            }),
            providesTags: ['Report'],
        }),
        getHPAReport: builder.query({
            query: (params) => ({
                url: '/reports/hpa-report/',
                params,
            }),
            providesTags: ['Report'],
        }),
        getPaymentReport: builder.query({
            query: (params) => ({
                url: '/reports/payment-report/',
                params,
            }),
            providesTags: ['Report'],
        }),
        getBillReport: builder.query({
            query: (params) => ({
                url: '/reports/bill-report/',
                params,
            }),
            providesTags: ['Report'],
        }),

        // ============================================================
        // PHASE 5: Outstanding Reports & Financial Analysis
        // ============================================================

        // Outstanding summary report
        getOutstandingSummary: builder.query({
            query: () => '/reports/outstanding_summary/',
            providesTags: ['Report', 'Outstanding'],
        }),

        // Outstanding detailed report
        getOutstandingDetailed: builder.query({
            query: (params = {}) => ({
                url: '/reports/outstanding_detailed/',
                params,
            }),
            providesTags: ['Report', 'Outstanding'],
        }),

        // Aging analysis report
        getAgingAnalysis: builder.query({
            query: () => '/reports/aging_analysis/',
            providesTags: ['Report', 'Outstanding'],
        }),

        // Settlement report
        getSettlementReport: builder.query({
            query: (params = {}) => ({
                url: '/reports/settlement_report/',
                params,
            }),
            providesTags: ['Report'],
        }),

        // Client statement
        getClientStatement: builder.query({
            query: ({ consignorId, ...params }) => ({
                url: `/reports/client-statement/${consignorId}/`,
                params,
            }),
            providesTags: ['Report'],
        }),

        // ============================================================
        // EXCEL EXPORT ENDPOINTS
        // ============================================================

        // Export outstanding bills to Excel
        exportOutstanding: builder.mutation({
            query: (params = {}) => ({
                url: '/reports/export-outstanding/',
                method: 'GET',
                params,
                responseHandler: (response) => response.blob(),
            }),
        }),

        // Export aging analysis to Excel
        exportAging: builder.mutation({
            query: () => ({
                url: '/reports/export-aging/',
                method: 'GET',
                responseHandler: (response) => response.blob(),
            }),
        }),

        // Export settlement report to Excel
        exportSettlement: builder.mutation({
            query: (params = {}) => ({
                url: '/reports/export-settlement/',
                method: 'GET',
                params,
                responseHandler: (response) => response.blob(),
            }),
        }),

        // Export client statement to Excel
        exportClientStatement: builder.mutation({
            query: ({ consignorId, ...params }) => ({
                url: `/reports/export-client-statement/${consignorId}/`,
                method: 'GET',
                params,
                responseHandler: (response) => response.blob(),
            }),
        }),

        // ============================================================
        // PHASE 5 ADDITIONS: Truck Statement & LR-HPA Mapping
        // ============================================================

        // Truck statement - all HPAs and payments for a specific truck
        getTruckStatement: builder.query({
            query: ({ truckId, ...params }) => ({
                url: `/reports/truck-statement/${truckId}/`,
                params,
            }),
            providesTags: ['Report', 'HPA', 'PaymentTransaction'],
        }),

        // LR to HPA mapping report
        getLrHpaMapping: builder.query({
            query: (params = {}) => ({
                url: '/reports/lr-hpa-mapping/',
                params,
            }),
            providesTags: ['Report', 'LR', 'HPA'],
        }),

        // Pending truck payments report
        getPendingTruckPayments: builder.query({
            query: (params = {}) => ({
                url: '/reports/pending-truck-payments/',
                params,
            }),
            providesTags: ['Report', 'HPA', 'PaymentTransaction'],
        }),
    }),
});

export const {
    useRequestBillPdfMutation,
    useRequestLrPdfMutation,
    useRequestHpaPdfMutation,
    useCheckTaskStatusQuery,
    useDownloadBillPdfQuery,
    useDownloadLrPdfQuery,
    useDownloadHpaPdfQuery,
    useDownloadBillPdfSyncMutation,
    useGetReportsSummaryQuery,
    useGetLRReportQuery,
    useGetHPAReportQuery,
    useGetPaymentReportQuery,
    useGetBillReportQuery,
    // Phase 5: Outstanding Reports
    useGetOutstandingSummaryQuery,
    useGetOutstandingDetailedQuery,
    useGetAgingAnalysisQuery,
    useGetSettlementReportQuery,
    useGetClientStatementQuery,
    // Excel Export
    useExportOutstandingMutation,
    useExportAgingMutation,
    useExportSettlementMutation,
    useExportClientStatementMutation,
    // Phase 5 Additions: Truck Statement & LR-HPA Mapping
    useGetTruckStatementQuery,
    useGetLrHpaMappingQuery,
    useGetPendingTruckPaymentsQuery,
} = reportsApi;
