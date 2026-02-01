import { api } from '../../app/api';

export const dashboardApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get current dashboard statistics
        getDashboardStats: builder.query({
            query: () => '/dashboard/stats/current/',
            providesTags: ['Dashboard'],
        }),

        // Get dashboard summary with comparisons
        getDashboardSummary: builder.query({
            query: () => '/dashboard/stats/summary/',
            providesTags: ['Dashboard'],
        }),

        // Get dashboard metrics with date range filtering (OPTIMIZED)
        getDashboardMetrics: builder.query({
            query: (params = {}) => ({
                url: '/dashboard/stats/metrics/',
                params,
            }),
            providesTags: ['Dashboard'],
        }),

        // Refresh dashboard stats (SUPER_ADMIN only)
        refreshDashboardStats: builder.mutation({
            query: (data) => ({
                url: '/dashboard/stats/refresh/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Dashboard'],
        }),

        // Get HPAs without bills
        getHPAsWithoutBills: builder.query({
            query: () => '/dashboard/stats/hpas_without_bills/',
            providesTags: ['Dashboard', 'HPA', 'Bill'],
        }),

        // Get pending LRs (without HPA)
        getPendingLRs: builder.query({
            query: (params = {}) => ({
                url: '/dashboard/stats/pending_lrs/',
                params,
            }),
            providesTags: ['Dashboard', 'LR'],
        }),

        // Get pending HPAs (without bills)
        getPendingHPAs: builder.query({
            query: (params = {}) => ({
                url: '/dashboard/stats/pending_hpas/',
                params,
            }),
            providesTags: ['Dashboard', 'HPA'],
        }),

        // Get stats by date range
        getStatsByDateRange: builder.query({
            query: (params = {}) => ({
                url: '/dashboard/stats/stats_by_date_range/',
                params,
            }),
            providesTags: ['Dashboard'],
        }),
    }),
});

export const {
    useGetDashboardStatsQuery,
    useGetDashboardSummaryQuery,
    useGetDashboardMetricsQuery,
    useRefreshDashboardStatsMutation,
    useGetHPAsWithoutBillsQuery,
    useGetPendingLRsQuery,
    useGetPendingHPAsQuery,
    useGetStatsByDateRangeQuery,
} = dashboardApi;

