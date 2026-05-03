import { Link } from 'wouter'

export default function LandlordSuspended() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white rounded-3xl border border-gray-200 p-10 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Account Suspended</h2>
        <p className="text-gray-500 leading-relaxed mb-6">
          Your landlord account has been temporarily suspended. Please contact our support team to understand why and how to resolve this.
        </p>
        <div className="space-y-3">
          <Link href="/contact" className="block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
            Contact Support
          </Link>
          <Link href="/" className="block px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
