import { Link } from 'wouter'

export default function LandlordRejected() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white rounded-3xl border border-gray-200 p-10 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Application Not Approved</h2>
        <p className="text-gray-500 leading-relaxed mb-6">
          Unfortunately, your landlord application was not approved at this time. This may be due to incomplete information. Please contact our support team to discuss your application.
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
