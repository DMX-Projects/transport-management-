import { api } from '../../app/api';

export const transactionsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Payment Transactions - Now using unified HPATransaction table
        getPaymentTransactions: builder.query({
            query: (params = {}) => {
                // Build query parameters
                const queryParams = { ...params };
                
                // Map frontend filter names to backend field names
                if (params.payment_type) {
                    queryParams.transaction_type = params.payment_type;
                    delete queryParams.payment_type;
                }
                if (params.from_date) {
                    queryParams.transaction_date__gte = params.from_date;
                    delete queryParams.from_date;
                }
                if (params.to_date) {
                    queryParams.transaction_date__lte = params.to_date;
                    delete queryParams.to_date;
                }
                if (params.hpa_id) {
                    queryParams.hpa = params.hpa_id;
                    delete queryParams.hpa_id;
                }
                
                return {
                    url: '/hpa/transactions/',
                    params: queryParams,
                };
            },
            providesTags: ['PaymentTransaction', 'HPATransaction'],
            transformResponse: (response) => {
                // Transform to match expected format
                const results = response.results || response || [];
                return {
                    results: results.map(txn => ({
                        ...txn,
                        payment_type: txn.transaction_type,
                        payment_type_display: txn.transaction_type_display,
                        payment_date: txn.transaction_date,
                        payment_method: txn.payment_mode,
                        payment_method_display: txn.payment_mode_display,
                        hpa_display: txn.hpa_number || `HPA #${txn.hpa}`,
                    })),
                    count: response.count || results.length,
                };
            },
        }),

        getPaymentTransactionById: builder.query({
            query: (id) => `/hpa/transactions/${id}/`,
            providesTags: (result, error, id) => [
                { type: 'PaymentTransaction', id },
                { type: 'HPATransaction', id }
            ],
        }),

        getPaymentsByHPA: builder.query({
            query: (hpaId) => `/hpa/transactions/by_hpa/?hpa_id=${hpaId}`,
            providesTags: (result, error, hpaId) => [
                { type: 'PaymentTransaction', id: `HPA-${hpaId}` },
                { type: 'HPATransaction', id: `HPA-${hpaId}` },
            ],
            transformResponse: (response) => response.transactions || [],
        }),

        getPaymentSummary: builder.query({
            query: (params = {}) => ({
                url: '/hpa/transactions/summary/',
                params,
            }),
            providesTags: ['PaymentTransaction', 'HPATransaction'],
        }),

        createPaymentTransaction: builder.mutation({
            query: (data) => ({
                url: `/hpa/transactions/`,
                method: 'POST',
                body: {
                    hpa: data.hpa,
                    transaction_type: data.payment_type,
                    amount: data.amount,
                    transaction_date: data.payment_date,
                    payment_mode: data.payment_method,
                    pump_name: data.pump_name,
                    bank_name: data.bank_name,
                    reference_number: data.reference_number,
                    remarks: data.remarks,
                    description: data.remarks,
                },
            }),
            invalidatesTags: ['PaymentTransaction', 'HPATransaction', 'HPA'],
        }),

        updatePaymentTransaction: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/hpa/transactions/${id}/`,
                method: 'PATCH',
                body: {
                    transaction_type: data.payment_type,
                    amount: data.amount,
                    transaction_date: data.payment_date,
                    payment_mode: data.payment_method,
                    pump_name: data.pump_name,
                    bank_name: data.bank_name,
                    reference_number: data.reference_number,
                    remarks: data.remarks,
                    description: data.remarks,
                },
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'PaymentTransaction', id },
                { type: 'HPATransaction', id },
                'PaymentTransaction',
                'HPATransaction',
                'HPA',
            ],
        }),

        deletePaymentTransaction: builder.mutation({
            query: (id) => ({
                url: `/hpa/transactions/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['PaymentTransaction', 'HPATransaction', 'HPA'],
        }),

        // HPA-LR Links
        getHPALRLinks: builder.query({
            query: (params = {}) => ({
                url: '/transactions/hpa-lr-links/',
                params,
            }),
            providesTags: ['HPALRLink'],
        }),

        getHPALRLinkById: builder.query({
            query: (id) => `/transactions/hpa-lr-links/${id}/`,
            providesTags: (result, error, id) => [{ type: 'HPALRLink', id }],
        }),

        getLRLinksByHPA: builder.query({
            query: (hpaId) => ({
                url: '/transactions/hpa-lr-links/by_hpa/',
                params: { hpa_id: hpaId },
            }),
            providesTags: (result, error, hpaId) => [
                { type: 'HPALRLink', id: `HPA-${hpaId}` },
            ],
        }),

        getAvailableLRsForHPA: builder.query({
            query: (params = {}) => ({
                url: '/transactions/hpa-lr-links/available_lrs/',
                params,
            }),
            providesTags: ['LR'],
        }),

        createHPALRLink: builder.mutation({
            query: (data) => ({
                url: '/transactions/hpa-lr-links/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['HPALRLink', 'HPA', 'LR'],
        }),

        bulkCreateHPALRLinks: builder.mutation({
            query: (data) => ({
                url: '/transactions/hpa-lr-links/bulk_create/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['HPALRLink', 'HPA', 'LR'],
        }),

        updateHPALRLink: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/transactions/hpa-lr-links/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'HPALRLink', id },
                'HPALRLink',
                'HPA',
            ],
        }),

        deleteHPALRLink: builder.mutation({
            query: (id) => ({
                url: `/transactions/hpa-lr-links/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['HPALRLink', 'HPA', 'LR'],
        }),
    }),
});

export const {
    // Payment Transactions
    useGetPaymentTransactionsQuery,
    useGetPaymentTransactionByIdQuery,
    useGetPaymentsByHPAQuery,
    useGetPaymentSummaryQuery,
    useCreatePaymentTransactionMutation,
    useUpdatePaymentTransactionMutation,
    useDeletePaymentTransactionMutation,

    // HPA-LR Links
    useGetHPALRLinksQuery,
    useGetHPALRLinkByIdQuery,
    useGetLRLinksByHPAQuery,
    useGetAvailableLRsForHPAQuery,
    useCreateHPALRLinkMutation,
    useBulkCreateHPALRLinksMutation,
    useUpdateHPALRLinkMutation,
    useDeleteHPALRLinkMutation,
} = transactionsApi;
