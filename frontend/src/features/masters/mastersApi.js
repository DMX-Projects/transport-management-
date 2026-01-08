import { api } from '../../app/api';

export const mastersApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Branches
        getBranches: builder.query({
            query: () => '/masters/branches/',
            providesTags: ['Branch'],
        }),
        createBranch: builder.mutation({
            query: (data) => ({
                url: '/masters/branches/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Branch'],
        }),

        // Trucks
        getTrucks: builder.query({
            query: (params) => ({
                url: '/masters/trucks/',
                params,
            }),
            providesTags: ['Truck'],
        }),
        createTruck: builder.mutation({
            query: (data) => ({
                url: '/masters/trucks/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Truck'],
        }),

        // Parties
        getParties: builder.query({
            query: () => '/masters/parties/',
            providesTags: ['Party'],
        }),
        createParty: builder.mutation({
            query: (data) => ({
                url: '/masters/parties/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Party'],
        }),

        // Companies
        getCompanies: builder.query({
            query: () => '/masters/companies/',
            providesTags: ['Company'],
        }),
    }),
});

export const {
    useGetBranchesQuery,
    useCreateBranchMutation,
    useGetTrucksQuery,
    useCreateTruckMutation,
    useGetPartiesQuery,
    useCreatePartyMutation,
    useGetCompaniesQuery,
} = mastersApi;
