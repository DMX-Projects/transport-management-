import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout } from '../features/auth/authSlice';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const baseQueryWithReauth = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
        const token = getState().auth.token;
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    },
});

let refreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

const baseQueryWithTokenRefresh = async (args, api, extraOptions) => {
    let result = await baseQueryWithReauth(args, api, extraOptions);

    if (result.error?.status === 401) {
        if (!refreshing) {
            refreshing = true;
            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
                try {
                    const refreshResult = await baseQueryWithReauth(
                        {
                            url: '/accounts/auth/refresh/',
                            method: 'POST',
                            body: { refresh: refreshToken },
                        },
                        api,
                        extraOptions
                    );

                    if (refreshResult.data) {
                        const { access } = refreshResult.data;
                        // Update token in Redux store
                        api.dispatch(
                            setCredentials({
                                user: api.getState().auth.user,
                                access,
                                refresh: refreshToken,
                            })
                        );
                        processQueue(null, access);
                        // Retry the original request
                        result = await baseQueryWithReauth(args, api, extraOptions);
                    } else {
                        processQueue(refreshResult.error, null);
                        api.dispatch(logout());
                    }
                } catch (err) {
                    processQueue(err, null);
                    api.dispatch(logout());
                }
            } else {
                api.dispatch(logout());
                processQueue(new Error('No refresh token available'), null);
            }
            refreshing = false;
        } else {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                if (token) {
                    return baseQueryWithReauth(args, api, extraOptions);
                }
                return result;
            });
        }
    }

    return result;
};

// Base API configuration
export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithTokenRefresh,
    tagTypes: ['User', 'Company', 'Branch', 'Consignor', 'Party', 'Truck', 'LR', 'HPA', 'POD', 'Bill', 'Payment', 'Dashboard', 'Receipt', 'Report'],
    endpoints: () => ({}),
});
