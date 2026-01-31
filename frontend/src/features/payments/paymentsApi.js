import { api } from '../../app/api';

export const paymentsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get all payments
        getPayments: builder.query({
            query: (params) => ({
                url: '/payments/payments/',
                params,
            }),
            providesTags: ['Payment'],
        }),

        // Get payment by ID
        getPayment: builder.query({
            query: (id) => `/payments/payments/${id}/`,
            providesTags: (result, error, id) => [{ type: 'Payment', id }],
        }),

        // Get payments by HPA number
        getPaymentsByHPANumber: builder.query({
            query: (hpaNumber) => ({
                url: '/payments/payments/by_hpa/',
                params: { hpa_number: hpaNumber },
            }),
            providesTags: ['Payment'],
        }),

        // Get payments by HPA ID
        getPaymentsByHPAId: builder.query({
            query: (hpaId) => ({
                url: '/payments/payments/by_hpa_id/',
                params: { hpa_id: hpaId },
            }),
            providesTags: ['Payment'],
        }),

        // Create payment
        createPayment: builder.mutation({
            query: (data) => ({
                url: '/payments/payments/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Payment', 'HPA', 'Dashboard'],
        }),

        // Update payment (SUPER_ADMIN only)
        updatePayment: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/payments/payments/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Payment', 'HPA', 'Dashboard'],
        }),
    }),
});

export const {
    useGetPaymentsQuery,
    useGetPaymentQuery,
    useGetPaymentsByHPANumberQuery,
    useGetPaymentsByHPAIdQuery,
    useCreatePaymentMutation,
    useUpdatePaymentMutation,
} = paymentsApi;



