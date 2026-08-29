import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect } from "react";
import ChatWidget from "@/components/ChatWidget";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { slugToLocationLabel } from "@/lib/locationSlug";

const HomePage = lazy(() => import("@/pages/HomePage"));
const ListingsPage = lazy(() => import("@/pages/ListingsPage"));
const PropertyDetailPage = lazy(() => import("@/pages/PropertyDetailPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const CookiePolicyPage = lazy(() => import("@/pages/CookiePolicyPage"));
const HowWeVerifyPage = lazy(() => import("@/pages/HowWeVerifyPage"));

const LandlordRegisterPage = lazy(() => import("@/pages/landlord/LandlordRegisterPage"));
const LandlordDashboard = lazy(() => import("@/pages/landlord/LandlordDashboard"));
const LandlordOnboarding = lazy(() => import("@/pages/landlord/LandlordOnboarding"));
const LandlordKYCPage = lazy(() => import("@/pages/landlord/LandlordKYCPage"));
const LandlordListings = lazy(() => import("@/pages/landlord/LandlordListings"));
const LandlordListingForm = lazy(() => import("@/pages/landlord/LandlordListingForm"));
const LandlordEnquiries = lazy(() => import("@/pages/landlord/LandlordEnquiries"));
const LandlordInbox = lazy(() => import("@/pages/landlord/LandlordInbox"));
const LandlordProfile = lazy(() => import("@/pages/landlord/LandlordProfile"));
const LandlordSettings = lazy(() => import("@/pages/landlord/LandlordSettings"));
const LandlordPending = lazy(() => import("@/pages/landlord/LandlordPending"));
const LandlordRejected = lazy(() => import("@/pages/landlord/LandlordRejected"));
const LandlordSuspended = lazy(() => import("@/pages/landlord/LandlordSuspended"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminLandlords = lazy(() => import("@/pages/admin/AdminLandlords"));
const AdminProperties = lazy(() => import("@/pages/admin/AdminProperties"));
const AdminProjects = lazy(() => import("@/pages/admin/AdminProjects"));
const AdminKYC = lazy(() => import("@/pages/admin/AdminKYC"));
const AdminVetting = lazy(() => import("@/pages/admin/AdminVetting"));
const AdminActivity = lazy(() => import("@/pages/admin/AdminActivity"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminHelp = lazy(() => import("@/pages/admin/AdminHelp"));

const UserDashboard = lazy(() => import("@/pages/user/UserDashboard"));
const UserProfile = lazy(() => import("@/pages/user/UserProfile"));
const UserSaved = lazy(() => import("@/pages/user/UserSaved"));
const UserEnquiries = lazy(() => import("@/pages/user/UserEnquiries"));

function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <p className="mt-2 text-gray-600">Page not found</p>
        <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">Go home</a>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  const { resolvedDark } = useTheme();

  // Enforce theme scoping: Admin routes respect the admin theme toggle.
  // All other routes (landlord, tenant, public) are always light.
  useEffect(() => {
    const root = document.documentElement;
    const isAdminRoute = location.startsWith('/admin');
    if (!isAdminRoute) {
      // Tenant/Landlord/public: force light mode regardless of admin preference
      root.classList.remove('dark');
    } else {
      // Admin: respect stored preference
      if (resolvedDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [location, resolvedDark]);

  return (
    <Suspense fallback={<Loading />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/home" component={HomePage} />
        <Route path="/listings" component={ListingsPage} />
        <Route path="/listings/:id" component={PropertyDetailPage} />
        <Route path="/properties/lagos"><Redirect to="/listings?city=Lagos" /></Route>
        <Route path="/properties/ogun"><Redirect to="/listings?city=Ogun" /></Route>
        <Route path="/properties-in/:slug">
          {(params: { slug?: string }) => {
            const city = slugToLocationLabel(params?.slug ?? '')
            return <Redirect to={`/listings?city=${encodeURIComponent(city)}`} />
          }}
        </Route>
        <Route path="/how-we-verify" component={HowWeVerifyPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/auth/callback" component={AuthCallbackPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy-policy" component={PrivacyPage} />
        <Route path="/cookie-policy" component={CookiePolicyPage} />

        <Route path="/landlord/register" component={LandlordRegisterPage} />
        <Route path="/landlord" component={LandlordDashboard} />
        <Route path="/landlord/onboarding" component={LandlordOnboarding} />
        <Route path="/landlord/kyc" component={LandlordKYCPage} />
        <Route path="/landlord/listings" component={LandlordListings} />
        <Route path="/landlord/listings/new" component={LandlordListingForm} />
        <Route path="/landlord/listings/:id/edit" component={LandlordListingForm} />
        <Route path="/landlord/enquiries" component={LandlordEnquiries} />
        <Route path="/landlord/inbox" component={LandlordInbox} />
        <Route path="/landlord/profile" component={LandlordProfile} />
        <Route path="/landlord/settings" component={LandlordSettings} />
        <Route path="/landlord/pending" component={LandlordPending} />
        <Route path="/landlord/rejected" component={LandlordRejected} />
        <Route path="/landlord/suspended" component={LandlordSuspended} />

        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/landlords" component={AdminLandlords} />
        <Route path="/admin/properties" component={AdminProperties} />
        <Route path="/admin/projects" component={AdminProjects} />
        <Route path="/admin/kyc" component={AdminKYC} />
        <Route path="/admin/vetting" component={AdminVetting} />
        <Route path="/admin/activity" component={AdminActivity} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/support" component={AdminSupport} />
        <Route path="/admin/help" component={AdminHelp} />

        <Route path="/user" component={UserDashboard} />
        <Route path="/user/profile" component={UserProfile} />
        <Route path="/user/saved" component={UserSaved} />
        <Route path="/user/enquiries" component={UserEnquiries} />

        {/* Blog is coming soon — redirect to homepage to avoid stale-cache fallback */}
        <Route path="/blog"><Redirect to="/" /></Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ThemeProvider>
            <Router />
          </ThemeProvider>
        </WouterRouter>
        <Toaster />
        <ChatWidget />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
