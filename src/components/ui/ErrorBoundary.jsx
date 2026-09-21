import { Component } from 'react';
import StateScreen from './StateScreen';
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
      return <StateScreen code="!" title="Workspace perlu dimuat ulang." description="Terjadi kendala saat menampilkan halaman. Muat ulang untuk melanjutkan; jika berulang, kirim detail teknis ke tim pengelola." details={this.state.error?.message || String(this.state.error)} onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
