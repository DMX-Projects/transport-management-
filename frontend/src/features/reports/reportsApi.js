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
} = reportsApi;
