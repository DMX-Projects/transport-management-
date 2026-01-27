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

        // LRItem endpoints
        getLRItems: builder.query({
            query: (params) => ({
                url: '/lr/lr-items/',
                params,
            }),
            providesTags: ['LRItem'],
        }),

        getLRItemsByLR: builder.query({
            query: (lrId) => ({
                url: `/lr/lr-items/by_lr/?lr=${lrId}`,
            }),
            providesTags: (result, error, lrId) => [{ type: 'LRItem', id: `lr-${lrId}` }],
        }),

        getLRItemById: builder.query({
            query: (id) => `/lr/lr-items/${id}/`,
            providesTags: (result, error, id) => [{ type: 'LRItem', id }],
        }),

        createLRItem: builder.mutation({
            query: (data) => ({
                url: '/lr/lr-items/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['LRItem', 'LR'],
        }),

        updateLRItem: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/lr/lr-items/${id}/`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'LRItem', id }, 'LRItem', 'LR'],
        }),

        deleteLRItem: builder.mutation({
            query: (id) => ({
                url: `/lr/lr-items/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['LRItem', 'LR'],
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
    // LRItem hooks
    useGetLRItemsQuery,
    useGetLRItemsByLRQuery,
    useGetLRItemByIdQuery,
    useCreateLRItemMutation,
    useUpdateLRItemMutation,
    useDeleteLRItemMutation,
} = lrApi;
