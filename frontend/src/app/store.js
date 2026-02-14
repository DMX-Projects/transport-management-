import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import { reportsApi } from '../features/reports/reportsApi';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        [api.reducerPath]: api.reducer,
        [reportsApi.reducerPath]: reportsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware, reportsApi.middleware),
});
