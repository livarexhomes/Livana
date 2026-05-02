import { Link } from 'wouter'

export default function Footer() {
  return (
    <footer className="bg-[#0a1020] text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#6b9e6e] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg">Livana</span>
            </div>
            <p className="text-sm leading-relaxed">
              Nigeria's trusted property platform connecting landlords and tenants with verified listings.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/listings" className="hover:text-white transition-colors">All Listings</Link></li>
              <li><Link href="/listings?type=rent" className="hover:text-white transition-colors">For Rent</Link></li>
              <li><Link href="/listings?type=sale" className="hover:text-white transition-colors">For Sale</Link></li>
              <li><Link href="/listings?type=commercial" className="hover:text-white transition-colors">Commercial</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">List a Property</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Contact</h4>
            <ul className="space-y-2.5 text-sm">
              <li>Lagos, Nigeria</li>
              <li>support@livana.ng</li>
              <li>+234 800 000 0000</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">© {new Date().getFullYear()} Livana. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
