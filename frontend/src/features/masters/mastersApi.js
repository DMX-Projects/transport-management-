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

        // Consignors (Companies sending goods)
        getConsignors: builder.query({
            query: (params) => ({
                url: '/masters/consignors/',
                params,
            }),
            providesTags: ['Consignor'],
        }),
        createConsignor: builder.mutation({
            query: (data) => ({
                url: '/masters/consignors/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Consignor'],
        }),

        // Parties (Consignees - Destination parties receiving goods)
        getParties: builder.query({
            query: (params) => ({
                url: '/masters/parties/',
                params,
            }),
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
        createCompany: builder.mutation({
            query: (data) => ({
                url: '/masters/companies/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Company'],
        }),
        updateCompany: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/masters/companies/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Company'],
        }),

        // Search endpoints for searchable selects
        searchTrucks: builder.query({
            query: (searchTerm) => ({
                url: '/masters/trucks/',
                params: { search: searchTerm },
            }),
            providesTags: ['Truck'],
        }),

        searchBranches: builder.query({
            query: (searchTerm) => ({
                url: '/masters/branches/',
                params: { search: searchTerm },
            }),
            providesTags: ['Branch'],
        }),

        searchConsignors: builder.query({
            query: (searchTerm) => ({
                url: '/masters/consignors/',
                params: { search: searchTerm },
            }),
            providesTags: ['Consignor'],
        }),

        searchParties: builder.query({
            query: (searchTerm) => ({
                url: '/masters/parties/',
                params: { search: searchTerm },
            }),
            providesTags: ['Party'],
        }),
    }),
});

export const {
    useGetBranchesQuery,
    useCreateBranchMutation,
    useGetTrucksQuery,
    useCreateTruckMutation,
    useGetConsignorsQuery,
    useCreateConsignorMutation,
    useGetPartiesQuery,
    useCreatePartyMutation,
    useGetCompaniesQuery,
    useCreateCompanyMutation,
    useUpdateCompanyMutation,
    useSearchTrucksQuery,
    useSearchBranchesQuery,
    useSearchConsignorsQuery,
    useSearchPartiesQuery,
} = mastersApi;
