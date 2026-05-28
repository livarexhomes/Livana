import { Link } from 'wouter'

export default function LandlordPending() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white rounded-3xl border border-gray-200 p-10 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Application Under Review</h2>
        <p className="text-gray-500 leading-relaxed mb-6">
          Your landlord account is pending approval from our admin team. This usually takes within 24 hours. You'll be notified once your account is approved.
        </p>
        <div className="space-y-3">
          <Link href="/" className="block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
            Back to Home
          </Link>
          <Link href="/contact" className="block px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
