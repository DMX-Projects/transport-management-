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
        refreshToken: builder.mutation({
            query: (refreshToken) => ({
                url: '/accounts/auth/refresh/',
                method: 'POST',
                body: { refresh: refreshToken },
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
    useRefreshTokenMutation,
    useGetCurrentUserQuery,
} = authApi;
