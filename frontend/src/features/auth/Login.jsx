import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from './authApi';
import { setCredentials } from './authSlice';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [login, { isLoading }] = useLoginMutation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const result = await login({ username, password }).unwrap();
            dispatch(setCredentials(result));
            navigate('/dashboard');
        } catch (err) {
            const status = err.status;
            const detail = err.data?.detail || err.message;
            if (status === 404 || detail === 'Not Found') {
                setError('Backend not reachable. Make sure the Django server is running (e.g. python manage.py runserver on port 8000).');
            } else {
                setError(typeof detail === 'string' ? detail : 'Login failed. Please check your credentials.');
            }
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '32px 24px'
        }}>
            <div style={{ width: '100%', maxWidth: '448px' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{
                        fontSize: '36px',
                        fontWeight: 700,
                        color: '#ffffff',
                        marginBottom: '8px',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        Capital Logistics
                    </h1>
                    <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.9)' }}>
                        Transport Management System
                    </p>
                </div>

                {/* Login Card */}
                <div className="card" style={{ padding: '40px' }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#111827',
                        marginBottom: '32px',
                        textAlign: 'center'
                    }}>
                        Welcome Back
                    </h2>

                    {error && (
                        <div style={{
                            marginBottom: '24px',
                            padding: '12px 16px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px'
                        }}>
                            <p style={{ fontSize: '14px', color: '#991b1b' }}>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#374151',
                                marginBottom: '8px'
                            }}>
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input"
                                placeholder="Enter your username"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#374151',
                                marginBottom: '8px'
                            }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                marginTop: '8px',
                                padding: '12px 24px',
                                fontSize: '15px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <svg style={{
                                        animation: 'spin 1s linear infinite',
                                        width: '20px',
                                        height: '20px'
                                    }} fill="none" viewBox="0 0 24 24">
                                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div style={{
                        marginTop: '32px',
                        paddingTop: '24px',
                        borderTop: '1px solid #e5e7eb',
                        textAlign: 'center'
                    }}>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            Need help? Contact your administrator
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        © 2026 Capital Logistics. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
