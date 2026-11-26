import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMessage =
      'Terjadi kendala saat menyinkronkan data dengan Firebase.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string };
      if (parsed?.error) {
        displayMessage = parsed.error.includes('Missing or insufficient permissions')
          ? 'Akses ditolak oleh aturan keamanan Firestore. Pastikan Anda masuk dengan akun yang sesuai.'
          : parsed.error;
      }
    } catch {
      if (error.message) {
        displayMessage = error.message;
      }
    }
    return { hasError: true, message: displayMessage };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4] p-6">
          <div className="max-w-md w-full rounded-2xl border border-[#E5E2DC] bg-white p-6 space-y-4 text-center">
            <h1 className="font-display text-xl font-bold text-[#171615]">
              Koneksi Data Terganggu
            </h1>
            <p className="text-sm text-[#524E48] leading-relaxed">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="rounded-xl bg-[#C83E2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B23322]"
            >
              Muat Ulang Tampilan
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
