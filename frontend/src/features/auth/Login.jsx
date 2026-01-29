import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from './authApi';
import { setCredentials } from './authSlice';

export default function Login() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [login, { isLoading }] = useLoginMutation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const trimmedIdentifier = identifier.trim();
            const result = await login({ username: trimmedIdentifier, password }).unwrap();
            dispatch(setCredentials(result));
            navigate('/dashboard');
        } catch (err) {
            const message = err?.data?.detail || 'Authentication failed. Double-check your credentials and try again.';
            setError(message);
        }
    };

    const disabled = isLoading || !identifier.trim() || !password;

    return (
        <div className="auth-shell">
            <div className="auth-card animate-fade-in">
                <div className="auth-card__header">
                    <p className="auth-card__eyebrow">Transport ERP</p>
                    <h2>Welcome back</h2>
                    <p>Sign in with your credentials to access operations, billing, and fleet workflows.</p>
                </div>

                {error && (
                    <div className="auth-alert" role="alert">
                        <span>{error}</span>
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="identifier">Username or Email</label>
                        <input
                            id="identifier"
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="leadadmin or user@company.com"
                            autoComplete="username"
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                        />
                    </div>

                    <button type="submit" className="auth-submit" disabled={disabled}>
                        {isLoading ? 'Authenticating…' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-help">
                    <p>Having trouble? Contact your Transport ERP administrator to reset access.</p>
                </div>
            </div>
        </div>
    );
}
