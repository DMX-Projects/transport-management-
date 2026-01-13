import { api } from '../../app/api';

export const lrApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get all LRs with filters
        getLRs: builder.query({
            query: (params) => ({
                url: '/lr/lorry-receipts/',
                params,
            }),
            providesTags: ['LR'],
        }),

        // Get single LR by ID
        getLRById: builder.query({
            query: (id) => `/lr/lorry-receipts/${id}/`,
            providesTags: (result, error, id) => [{ type: 'LR', id }],
        }),

        // Create new LR
        createLR: builder.mutation({
            query: (data) => ({
                url: '/lr/lorry-receipts/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['LR'],
        }),

        // Update LR
        updateLR: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/lr/lorry-receipts/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'LR', id }, 'LR'],
        }),

        // Delete LR (soft delete)
        deleteLR: builder.mutation({
            query: (id) => ({
                url: `/lr/lorry-receipts/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['LR'],
        }),

        // Get LRs by date range
        getLRsByDateRange: builder.query({
            query: ({ start_date, end_date }) => ({
                url: '/lr/lorry-receipts/by_date_range/',
                params: { start_date, end_date },
            }),
            providesTags: ['LR'],
        }),

        // Get audit history
        getLRAuditHistory: builder.query({
            query: (id) => `/lr/lorry-receipts/${id}/audit_history/`,
        }),

        // Search LRs (for searchable select)
        searchLRs: builder.query({
            query: (searchTerm) => ({
                url: '/lr/lorry-receipts/',
                params: { search: searchTerm },
            }),
            providesTags: ['LR'],
        }),

        // Get LRs without HPA (for HPA creation)
        getLRsWithoutHPA: builder.query({
            query: (params = {}) => ({
                url: '/lr/lorry-receipts/without_hpa/',
                params,
            }),
            providesTags: ['LR', 'HPA'],
        }),
    }),
});

export const {
    useGetLRsQuery,
    useGetLRByIdQuery,
    useCreateLRMutation,
    useUpdateLRMutation,
    useDeleteLRMutation,
    useGetLRsByDateRangeQuery,
    useGetLRAuditHistoryQuery,
    useSearchLRsQuery,
    useGetLRsWithoutHPAQuery,
} = lrApi;
