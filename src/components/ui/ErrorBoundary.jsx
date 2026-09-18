import { Component } from 'react';
import { logError } from '../../api/auditLog';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Dashboard crashed:', error, info);
    logError({ message: error?.message, stack: `${error?.stack || ''}\n${info?.componentStack || ''}`, source: 'error-boundary' });
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          color: '#F9F9F9',
          fontFamily: "'JetBrains Mono', monospace",
          padding: '2rem',
        }}>
          <div style={{
            background: '#333333',
            border: '1px solid #646464',
            borderRadius: '16px',
            padding: '2rem 2.5rem',
            maxWidth: 600,
            width: '100%',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#F16001' }}>Dashboard gagal ditampilkan</h2>
            <p style={{ fontSize: '0.8rem', color: '#A7A7A7', marginBottom: '1rem' }}>
              Ada komponen yang error saat digambar, jadi halaman dihentikan supaya angka yang salah tidak tampil. Klik "Muat Ulang Halaman" di bawah. Kalau terus berulang, kirim pesan teknis di kotak merah ini ke tim IT.
            </p>
            <pre style={{
              background: '#000000',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.7rem',
              color: '#F16001',
              overflow: 'auto',
              maxHeight: 200,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1rem',
                padding: '0.6rem 1.5rem',
                background: 'linear-gradient(135deg, #F16001, #E85002)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
