import { api } from '../../app/api';

export const authApi = api.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (credentials) => ({
                url: '/accounts/auth/login/',
                method: 'POST',
                body: credentials,
            }),
        }),
        getCurrentUser: builder.query({
            query: () => '/accounts/users/me/',
            providesTags: ['User'],
        }),
    }),
});

export const {
    useLoginMutation,
    useGetCurrentUserQuery,
} = authApi;
