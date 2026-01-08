import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
    baseUrl: 'http://localhost:8000/api/v1',
    prepareHeaders: (headers, { getState }) => {
        const token = getState().auth.token;
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    },
});

export const hpaApi = createApi({
    reducerPath: 'hpaApi',
    baseQuery,
    tagTypes: ['HPA'],
    endpoints: (builder) => ({
        getHPAs: builder.query({
            query: (params = {}) => ({
                url: '/hpa/hire-payment-advices/',
                params,
            }),
            providesTags: (result) =>
                result?.results
                    ? [
                        ...result.results.map(({ id }) => ({ type: 'HPA', id })),
                        { type: 'HPA', id: 'LIST' },
                    ]
                    : [{ type: 'HPA', id: 'LIST' }],
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
            invalidatesTags: [{ type: 'HPA', id: 'LIST' }, { type: 'HPA', id: 'PENDING' }],
        }),

        updateHPA: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/hpa/hire-payment-advices/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'HPA', id },
                { type: 'HPA', id: 'LIST' },
                { type: 'HPA', id: 'PENDING' },
            ],
        }),

        deleteHPA: builder.mutation({
            query: (id) => ({
                url: `/hpa/hire-payment-advices/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'HPA', id: 'LIST' }],
        }),

        markAsPaid: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/hpa/hire-payment-advices/${id}/mark_as_paid/`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'HPA', id },
                { type: 'HPA', id: 'LIST' },
                { type: 'HPA', id: 'PENDING' },
            ],
        }),
    }),
});

export const {
    useGetHPAsQuery,
    useGetHPAByIdQuery,
    useGetPendingPaymentsQuery,
    useGetHPAsByTruckQuery,
    useCreateHPAMutation,
    useUpdateHPAMutation,
    useDeleteHPAMutation,
    useMarkAsPaidMutation,
} = hpaApi;
