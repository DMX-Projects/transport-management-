import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const reportsApi = createApi({
    reducerPath: 'reportsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'http://localhost:8000/api/v1/reports',
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('token');
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    endpoints: (builder) => ({
        getReportsSummary: builder.query({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params?.from_date) queryParams.append('from_date', params.from_date);
                if (params?.to_date) queryParams.append('to_date', params.to_date);
                return `summary/?${queryParams.toString()}`;
            },
        }),
        getLRReport: builder.query({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params?.from_date) queryParams.append('from_date', params.from_date);
                if (params?.to_date) queryParams.append('to_date', params.to_date);
                if (params?.status) queryParams.append('status', params.status);
                if (params?.search) queryParams.append('search', params.search);
                if (params?.page) queryParams.append('page', params.page);
                if (params?.page_size) queryParams.append('page_size', params.page_size);
                return `lr_report/?${queryParams.toString()}`;
            },
        }),
        getHPAReport: builder.query({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params?.from_date) queryParams.append('from_date', params.from_date);
                if (params?.to_date) queryParams.append('to_date', params.to_date);
                if (params?.payment_status) queryParams.append('payment_status', params.payment_status);
                if (params?.search) queryParams.append('search', params.search);
                if (params?.page) queryParams.append('page', params.page);
                if (params?.page_size) queryParams.append('page_size', params.page_size);
                return `hpa_report/?${queryParams.toString()}`;
            },
        }),
        getPaymentReport: builder.query({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params?.from_date) queryParams.append('from_date', params.from_date);
                if (params?.to_date) queryParams.append('to_date', params.to_date);
                if (params?.status) queryParams.append('status', params.status);
                if (params?.search) queryParams.append('search', params.search);
                if (params?.page) queryParams.append('page', params.page);
                if (params?.page_size) queryParams.append('page_size', params.page_size);
                return `payment_report/?${queryParams.toString()}`;
            },
        }),
        getBillReport: builder.query({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params?.from_date) queryParams.append('from_date', params.from_date);
                if (params?.to_date) queryParams.append('to_date', params.to_date);
                if (params?.status) queryParams.append('status', params.status);
                if (params?.search) queryParams.append('search', params.search);
                if (params?.page) queryParams.append('page', params.page);
                if (params?.page_size) queryParams.append('page_size', params.page_size);
                return `bill_report/?${queryParams.toString()}`;
            },
        }),
    }),
});

export const {
    useGetReportsSummaryQuery,
    useGetLRReportQuery,
    useGetHPAReportQuery,
    useGetPaymentReportQuery,
    useGetBillReportQuery,
} = reportsApi;
