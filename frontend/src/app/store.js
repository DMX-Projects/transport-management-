import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import authReducer from '../features/auth/authSlice';
import { hpaApi } from '../features/hpa/hpaApi';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        [api.reducerPath]: api.reducer,
        [hpaApi.reducerPath]: hpaApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware, hpaApi.middleware),
});
