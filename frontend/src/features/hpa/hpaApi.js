import { api } from '../../app/api';

export const hpaApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getHPAs: builder.query({
            query: (params = {}) => ({
                url: '/hpa/hire-payment-advices/',
                params,
            }),
            providesTags: ['HPA'],
        }),

        getHPAById: builder.query({
            query: (id) => `/hpa/hire-payment-advices/${id}/`,
            providesTags: (result, error, id) => [{ type: 'HPA', id }],
        }),

        getPendingPayments: builder.query({
            query: () => '/hpa/hire-payment-advices/pending_payments/',
            providesTags: [{ type: 'HPA', id: 'PENDING' }],
        }),

        getHPAsByTruck: builder.query({
            query: (truckId) => `/hpa/hire-payment-advices/by_truck/?truck_id=${truckId}`,
            providesTags: [{ type: 'HPA', id: 'TRUCK_HISTORY' }],
        }),

        createHPA: builder.mutation({
            query: (data) => ({
                url: '/hpa/hire-payment-advices/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['HPA', 'LR'],
        }),

        updateHPA: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/hpa/hire-payment-advices/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'HPA', id }, 'HPA'],
        }),

        deleteHPA: builder.mutation({
            query: (id) => ({
                url: `/hpa/hire-payment-advices/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['HPA'],
        }),

        markAsPaid: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/hpa/hire-payment-advices/${id}/mark_as_paid/`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'HPA', id }, 'HPA'],
        }),

        // Get HPAs by date range
        getHPAsByDateRange: builder.query({
            query: ({ start_date, end_date }) => ({
                url: '/hpa/hire-payment-advices/by_date_range/',
                params: { start_date, end_date },
            }),
            providesTags: ['HPA'],
        }),

        // Get HPA transactions
        getHPATransactions: builder.query({
            query: (hpaId) => ({
                url: `/hpa/hire-payment-advices/${hpaId}/transactions/`,
            }),
            providesTags: (result, error, hpaId) => [{ type: 'HPATransaction', id: hpaId }],
            // Force refetch every time the query is called
            keepUnusedDataFor: 0,
        }),

        // Add transaction to HPA
        addHPATransaction: builder.mutation({
            query: ({ hpaId, ...data }) => ({
                url: `/hpa/hire-payment-advices/${hpaId}/transactions/`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, { hpaId }) => [
                { type: 'HPATransaction', id: hpaId },
                { type: 'HPA', id: hpaId },
                'HPA'
            ],
        }),

        // Get HPAs without bills
        getHPAsWithoutBills: builder.query({
            query: (params = {}) => ({
                url: '/hpa/hire-payment-advices/without_bills/',
                params,
            }),
            providesTags: ['HPA'],
        }),

        // ============================================================
        // PHASE 1: Multiple Invoice Numbers per HPA
        // ============================================================

        // Get all invoices for an HPA
        getHPAInvoices: builder.query({
            query: (hpaId) => ({
                url: `/hpa/hire-payment-advices/${hpaId}/invoices/`,
            }),
            providesTags: (result, error, hpaId) => [{ type: 'HPAInvoice', id: hpaId }],
            keepUnusedDataFor: 0,
        }),

        // Add invoice to HPA
        addHPAInvoice: builder.mutation({
            query: ({ hpaId, ...data }) => ({
                url: `/hpa/hire-payment-advices/${hpaId}/add_invoice/`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, { hpaId }) => [
                { type: 'HPAInvoice', id: hpaId },
                { type: 'HPA', id: hpaId },
                'HPA'
            ],
        }),

        // Delete invoice from HPA
        deleteHPAInvoice: builder.mutation({
            query: ({ hpaId, invoiceId }) => ({
                url: `/hpa/hire-payment-advices/${hpaId}/invoices/${invoiceId}/`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { hpaId }) => [
                { type: 'HPAInvoice', id: hpaId },
                { type: 'HPA', id: hpaId },
                'HPA'
            ],
        }),

        // ============================================================
        // PHASE 2: Active HPA Tracking Dashboard
        // ============================================================

        // Get all active HPAs (no POD received)
        getActiveHPAs: builder.query({
            query: (params = {}) => ({
                url: '/hpa/active-hpas/',
                params,
            }),
            providesTags: ['ActiveHPA', 'HPA'],
        }),

        // Get active HPA statistics for dashboard
        getActiveHPAStatistics: builder.query({
            query: (params = {}) => ({
                url: '/hpa/active-hpas/statistics/',
                params,
            }),
            providesTags: ['ActiveHPA'],
        }),

        // Get details for a specific active HPA
        getActiveHPADetails: builder.query({
            query: (id) => `/hpa/active-hpas/${id}/details/`,
            providesTags: (result, error, id) => [{ type: 'ActiveHPA', id }],
        }),
    }),
});

export const {
    useGetHPAsQuery,
    useGetHPAByIdQuery,
    useGetPendingPaymentsQuery,
    useGetHPAsByTruckQuery,
    useGetHPAsByDateRangeQuery,
    useCreateHPAMutation,
    useUpdateHPAMutation,
    useDeleteHPAMutation,
    useMarkAsPaidMutation,
    useGetHPATransactionsQuery,
    useAddHPATransactionMutation,
    useGetHPAsWithoutBillsQuery,
    // Phase 1: Invoice Management
    useGetHPAInvoicesQuery,
    useAddHPAInvoiceMutation,
    useDeleteHPAInvoiceMutation,
    // Phase 2: Active HPA Tracking
    useGetActiveHPAsQuery,
    useGetActiveHPAStatisticsQuery,
    useGetActiveHPADetailsQuery,
} = hpaApi;
