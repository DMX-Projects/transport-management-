import { createSlice } from '@reduxjs/toolkit';

// Safely get user from localStorage
const getUserFromStorage = () => {
    try {
        const userStr = localStorage.getItem('user');
        return userStr && userStr !== 'undefined' ? JSON.parse(userStr) : null;
    } catch (error) {
        return null;
    }
};

const initialState = {
    user: getUserFromStorage(),
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { user, access, refresh } = action.payload;
            state.user = user;
            state.token = access;
            state.isAuthenticated = true;

            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', access);
            if (refresh) {
                localStorage.setItem('refreshToken', refresh);
            }
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;

            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectToken = (state) => state.auth.token;
