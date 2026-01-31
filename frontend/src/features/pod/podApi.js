import { api } from '../../app/api';

export const podApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get all PODs with filters
        getPODs: builder.query({
            query: (params) => ({
                url: '/pod/proof-of-deliveries/',
                params,
            }),
            providesTags: ['POD'],
        }),

        // Get single POD by ID
        getPODById: builder.query({
            query: (id) => `/pod/proof-of-deliveries/${id}/`,
            providesTags: (result, error, id) => [{ type: 'POD', id }],
        }),

        // Create new POD
        createPOD: builder.mutation({
            query: (data) => ({
                url: '/pod/proof-of-deliveries/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['POD', 'HPA', 'LR'],
        }),

        // Update POD
        updatePOD: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/pod/proof-of-deliveries/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'POD', id }, 'POD'],
        }),

        // Delete POD (soft delete)
        deletePOD: builder.mutation({
            query: (id) => ({
                url: `/pod/proof-of-deliveries/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['POD'],
        }),
    }),
});

export const {
    useGetPODsQuery,
    useGetPODByIdQuery,
    useCreatePODMutation,
    useUpdatePODMutation,
    useDeletePODMutation,
} = podApi;



