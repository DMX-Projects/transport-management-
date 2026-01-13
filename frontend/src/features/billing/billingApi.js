import { api } from '../../app/api';

export const billingApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get all Bills with filters
        getBills: builder.query({
            query: (params) => ({
                url: '/billing/bills/',
                params,
            }),
            providesTags: ['Bill'],
        }),

        // Get single Bill by ID
        getBillById: builder.query({
            query: (id) => `/billing/bills/${id}/`,
            providesTags: (result, error, id) => [{ type: 'Bill', id }],
        }),

        // Create new Bill
        createBill: builder.mutation({
            query: (data) => ({
                url: '/billing/bills/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Bill'],
        }),

        // Update Bill
        updateBill: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/billing/bills/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Bill', id }, 'Bill'],
        }),

        // Delete Bill (soft delete)
        deleteBill: builder.mutation({
            query: (id) => ({
                url: `/billing/bills/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Bill'],
        }),

        // Bill Items
        getBillItems: builder.query({
            query: (params) => ({
                url: '/billing/bill-items/',
                params,
            }),
            providesTags: ['Bill'],
        }),

        createBillItem: builder.mutation({
            query: (data) => ({
                url: '/billing/bill-items/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Bill'],
        }),

        updateBillItem: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/billing/bill-items/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Bill'],
        }),

        deleteBillItem: builder.mutation({
            query: (id) => ({
                url: `/billing/bill-items/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Bill'],
        }),

        // Get HPA details with transactions for billing
        getHPADetailsForBilling: builder.query({
            query: (hpaId) => ({
                url: '/billing/bills/hpa_details_for_billing/',
                params: { hpa_id: hpaId },
            }),
            providesTags: (result, error, hpaId) => [{ type: 'HPA', id: hpaId }],
        }),
    }),
});

export const {
    useGetBillsQuery,
    useGetBillByIdQuery,
    useCreateBillMutation,
    useUpdateBillMutation,
    useDeleteBillMutation,
    useGetBillItemsQuery,
    useCreateBillItemMutation,
    useUpdateBillItemMutation,
    useDeleteBillItemMutation,
    useGetHPADetailsForBillingQuery,
} = billingApi;

