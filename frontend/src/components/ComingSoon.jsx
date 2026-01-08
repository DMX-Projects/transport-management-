export default function ComingSoon({ title, description }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: '32px'
        }}>
            <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.3)'
            }}>
                <svg
                    style={{ width: '60px', height: '60px', color: 'white' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                </svg>
            </div>

            <h1 style={{
                fontSize: '32px',
                fontWeight: 700,
                marginBottom: '16px',
                color: '#111827'
            }}>
                {title}
            </h1>

            <p style={{
                fontSize: '16px',
                color: '#6b7280',
                maxWidth: '500px',
                lineHeight: 1.6
            }}>
                {description || 'This module is currently under development and will be available soon.'}
            </p>

            <div style={{
                marginTop: '32px',
                padding: '16px 24px',
                background: '#f3f4f6',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#4b5563'
            }}>
                ✨ Stay tuned for updates!
            </div>
        </div>
    );
}
