import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import AnimatedPage from "@/components/AnimatedPage";
import Index from "./pages/Index";
import Events from "./pages/Events";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import EventDetail from "./pages/EventDetail";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import ApplyAdmin from "./pages/ApplyAdmin";
import AdminRequests from "./pages/AdminRequests";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Payment from "./pages/Payment";
import CertificateVerification from "./pages/CertificateVerification";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage><Index /></AnimatedPage>} />
        <Route path="/events" element={<AnimatedPage><Events /></AnimatedPage>} />
        <Route path="/events/:id" element={<AnimatedPage><EventDetail /></AnimatedPage>} />
        <Route path="/auth" element={<AnimatedPage><Auth /></AnimatedPage>} />
        <Route path="/dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
        <Route path="/create-event" element={<AnimatedPage><CreateEvent /></AnimatedPage>} />
        <Route path="/edit-event/:id" element={<AnimatedPage><EditEvent /></AnimatedPage>} />
        <Route path="/apply-admin" element={<AnimatedPage><ApplyAdmin /></AnimatedPage>} />
        <Route path="/admin-requests" element={<AnimatedPage><AdminRequests /></AnimatedPage>} />
        <Route path="/forgot-password" element={<AnimatedPage><ForgotPassword /></AnimatedPage>} />
        <Route path="/reset-password" element={<AnimatedPage><ResetPassword /></AnimatedPage>} />
        <Route path="/profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
        <Route path="/payment/:id" element={<AnimatedPage><Payment /></AnimatedPage>} />
        <Route path="/verify-certificate" element={<AnimatedPage><CertificateVerification /></AnimatedPage>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
