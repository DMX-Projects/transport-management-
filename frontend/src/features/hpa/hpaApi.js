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
} = hpaApi;
