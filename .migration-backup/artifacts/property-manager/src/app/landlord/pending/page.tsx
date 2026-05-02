export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md text-center space-y-4 px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 mb-2">
          <svg className="w-7 h-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Account pending review</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Your account has been created and is awaiting admin approval. You&apos;ll be able to
          manage listings once approved. This usually takes less than 24 hours.
        </p>
        <Link href="/login"
          className="inline-block text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
