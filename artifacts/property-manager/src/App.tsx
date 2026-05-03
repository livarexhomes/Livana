import { Switch, Route, Router as WouterRouter } from "wouter";

import HomePage from "./pages/HomePage";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import LandlordRegisterPage from "./pages/LandlordRegisterPage";

import LandlordDashboard from "./pages/landlord/LandlordDashboard";
import LandlordListings from "./pages/landlord/LandlordListings";
import LandlordListingForm from "./pages/landlord/LandlordListingForm";
import LandlordEnquiries from "./pages/landlord/LandlordEnquiries";
import LandlordProfile from "./pages/landlord/LandlordProfile";
import LandlordPending from "./pages/landlord/LandlordPending";
import LandlordRejected from "./pages/landlord/LandlordRejected";
import LandlordSettings from "./pages/landlord/LandlordSettings";

import UserDashboard from "./pages/user/UserDashboard";
import UserSaved from "./pages/user/UserSaved";
import UserEnquiries from "./pages/user/UserEnquiries";
import UserProfile from "./pages/user/UserProfile";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLandlords from "./pages/admin/AdminLandlords";
import AdminProperties from "./pages/admin/AdminProperties";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminHelp from "./pages/admin/AdminHelp";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
        <a href="/" className="px-5 py-2.5 bg-[#6b9e6e] hover:bg-[#4a7f4d] text-white font-semibold rounded-xl transition-colors inline-block">
          Back to Home
        </a>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/listings" component={ListingsPage} />
      <Route path="/listings/:id" component={PropertyDetailPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route path="/partners" component={LandlordRegisterPage} />

      <Route path="/landlord" component={LandlordDashboard} />
      <Route path="/landlord/listings" component={LandlordListings} />
      <Route path="/landlord/listings/new" component={LandlordListingForm} />
      <Route path="/landlord/listings/:id/edit" component={LandlordListingForm} />
      <Route path="/landlord/enquiries" component={LandlordEnquiries} />
      <Route path="/landlord/profile" component={LandlordProfile} />
      <Route path="/landlord/pending" component={LandlordPending} />
      <Route path="/landlord/rejected" component={LandlordRejected} />
      <Route path="/landlord/settings" component={LandlordSettings} />

      <Route path="/user" component={UserDashboard} />
      <Route path="/user/saved" component={UserSaved} />
      <Route path="/user/enquiries" component={UserEnquiries} />
      <Route path="/user/profile" component={UserProfile} />

      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/landlords" component={AdminLandlords} />
      <Route path="/admin/properties" component={AdminProperties} />
      <Route path="/admin/projects" component={AdminProjects} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/help" component={AdminHelp} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}
