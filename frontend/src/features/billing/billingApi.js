import { api } from '../../app/api';

export const billingApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get all Bills with filters
        getBills: builder.query({
            query: (params) => ({
                url: '/billing/bills/',
                params,
            }),
            providesTags: ['Bill'],
        }),

        // Get single Bill by ID
        getBillById: builder.query({
            query: (id) => `/billing/bills/${id}/`,
            providesTags: (result, error, id) => [{ type: 'Bill', id }],
        }),

        // Create new Bill
        createBill: builder.mutation({
            query: (data) => ({
                url: '/billing/bills/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Bill'],
        }),

        // Update Bill
        updateBill: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/billing/bills/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Bill', id }, 'Bill'],
        }),

        // Delete Bill (soft delete)
        deleteBill: builder.mutation({
            query: (id) => ({
                url: `/billing/bills/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Bill'],
        }),

        // Bill Items
        getBillItems: builder.query({
            query: (params) => ({
                url: '/billing/bill-items/',
                params,
            }),
            providesTags: ['Bill'],
        }),

        createBillItem: builder.mutation({
            query: (data) => ({
                url: '/billing/bill-items/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Bill'],
        }),

        updateBillItem: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/billing/bill-items/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Bill'],
        }),

        deleteBillItem: builder.mutation({
            query: (id) => ({
                url: `/billing/bill-items/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Bill'],
        }),

        // Get HPA details with transactions for billing
        getHPADetailsForBilling: builder.query({
            query: (hpaId) => ({
                url: '/billing/bills/hpa_details_for_billing/',
                params: { hpa_id: hpaId },
            }),
            providesTags: (result, error, hpaId) => [{ type: 'HPA', id: hpaId }],
        }),

        // Get unbilled invoices (invoices that don't have bills yet)
        getUnbilledInvoices: builder.query({
            query: (params = {}) => ({
                url: '/billing/bills/unbilled_invoices/',
                params,
            }),
            providesTags: ['UnbilledInvoice'],
        }),

        // ============================================================
        // PHASE 3: Billing Templates
        // ============================================================

        // Get all billing templates
        getBillingTemplates: builder.query({
            query: (params = {}) => ({
                url: '/billing/templates/',
                params,
            }),
            providesTags: ['BillingTemplate'],
        }),

        // Get single template by ID
        getBillingTemplateById: builder.query({
            query: (id) => `/billing/templates/${id}/`,
            providesTags: (result, error, id) => [{ type: 'BillingTemplate', id }],
        }),

        // Get templates for a specific consignor
        getTemplatesForConsignor: builder.query({
            query: (consignorId) => ({
                url: '/billing/templates/for_consignor/',
                params: { consignor_id: consignorId },
            }),
            providesTags: ['BillingTemplate'],
        }),

        // Get default templates (global)
        getDefaultTemplates: builder.query({
            query: () => '/billing/templates/defaults/',
            providesTags: ['BillingTemplate'],
        }),

        // Create new template
        createBillingTemplate: builder.mutation({
            query: (data) => ({
                url: '/billing/templates/',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['BillingTemplate'],
        }),

        // Update template
        updateBillingTemplate: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/billing/templates/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'BillingTemplate', id }, 'BillingTemplate'],
        }),

        // Delete/Deactivate template
        deleteBillingTemplate: builder.mutation({
            query: (id) => ({
                url: `/billing/templates/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['BillingTemplate'],
        }),

        // Set template as default
        setDefaultTemplate: builder.mutation({
            query: (id) => ({
                url: `/billing/templates/${id}/set_default/`,
                method: 'POST',
            }),
            invalidatesTags: ['BillingTemplate'],
        }),

        // Duplicate template
        duplicateTemplate: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/billing/templates/${id}/duplicate/`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['BillingTemplate'],
        }),

        // Preview template
        previewTemplate: builder.query({
            query: (id) => `/billing/templates/${id}/preview/`,
            providesTags: (result, error, id) => [{ type: 'BillingTemplate', id }],
        }),

        // ============================================================
        // PHASE 4: Client Payment Tracking
        // ============================================================

        // Get client accounts list
        getClientAccounts: builder.query({
            query: (params = {}) => ({
                url: '/billing/client-accounts/',
                params,
            }),
            providesTags: ['ClientAccount'],
        }),

        // Get client account details
        getClientAccountById: builder.query({
            query: (id) => `/billing/client-accounts/${id}/`,
            providesTags: (result, error, id) => [{ type: 'ClientAccount', id }],
        }),

        // Get client accounts summary
        getClientAccountsSummary: builder.query({
            query: () => '/billing/client-accounts/summary/',
            providesTags: ['ClientAccount'],
        }),

        // Get consignor bills
        getConsignorBills: builder.query({
            query: ({ id, ...params }) => ({
                url: `/billing/client-accounts/${id}/bills/`,
                params,
            }),
            providesTags: ['Bill', 'ClientAccount'],
        }),

        // Get consignor payments
        getConsignorPayments: builder.query({
            query: (id) => `/billing/client-accounts/${id}/payments/`,
            providesTags: ['ClientPayment', 'ClientAccount'],
        }),

        // Get bill payments
        getBillPayments: builder.query({
            query: (billId) => `/billing/bills/${billId}/payments/`,
            providesTags: ['ClientPayment'],
        }),

        // Record payment on bill
        addBillPayment: builder.mutation({
            query: ({ billId, ...data }) => ({
                url: `/billing/bills/${billId}/add_payment/`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Bill', 'ClientPayment', 'ClientAccount'],
        }),

        // Get outstanding bills
        getOutstandingBills: builder.query({
            query: (params = {}) => ({
                url: '/billing/bills/outstanding/',
                params,
            }),
            providesTags: ['Bill'],
        }),

        // Get billing summary
        getBillingSummary: builder.query({
            query: () => '/billing/bills/summary/',
            providesTags: ['Bill'],
        }),

        // Client Payments CRUD
        getClientPayments: builder.query({
            query: (params = {}) => ({
                url: '/billing/client-payments/',
                params,
            }),
            providesTags: ['ClientPayment'],
        }),

        deleteClientPayment: builder.mutation({
            query: (id) => ({
                url: `/billing/client-payments/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ClientPayment', 'Bill', 'ClientAccount'],
        }),
    }),
});

export const {
    useGetBillsQuery,
    useGetBillByIdQuery,
    useCreateBillMutation,
    useUpdateBillMutation,
    useDeleteBillMutation,
    useGetBillItemsQuery,
    useCreateBillItemMutation,
    useUpdateBillItemMutation,
    useDeleteBillItemMutation,
    useGetHPADetailsForBillingQuery,
    useGetUnbilledInvoicesQuery,
    // Phase 3: Billing Templates
    useGetBillingTemplatesQuery,
    useGetBillingTemplateByIdQuery,
    useGetTemplatesForConsignorQuery,
    useGetDefaultTemplatesQuery,
    useCreateBillingTemplateMutation,
    useUpdateBillingTemplateMutation,
    useDeleteBillingTemplateMutation,
    useSetDefaultTemplateMutation,
    useDuplicateTemplateMutation,
    usePreviewTemplateQuery,
    // Phase 4: Client Payments
    useGetClientAccountsQuery,
    useGetClientAccountByIdQuery,
    useGetClientAccountsSummaryQuery,
    useGetConsignorBillsQuery,
    useGetConsignorPaymentsQuery,
    useGetBillPaymentsQuery,
    useAddBillPaymentMutation,
    useGetOutstandingBillsQuery,
    useGetBillingSummaryQuery,
    useGetClientPaymentsQuery,
    useDeleteClientPaymentMutation,
} = billingApi;

