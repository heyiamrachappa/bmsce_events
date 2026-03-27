import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Menu, X, PlusCircle, User, Sparkles, LayoutDashboard, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, colleges(id, name, slug), clubs(id, name)")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: adminRequest } = useQuery({
    queryKey: ["my_admin_request", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_requests")
        .select("*, clubs(name, category)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isAdmin = (profile as any)?.role === "admin" || (profile as any)?.account_type === "admin" || adminRequest?.status === "approved";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navLinks = [
    { name: "Discover", path: "/events", icon: Globe },
    ...(user ? [{ name: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] : []),
  ];

  const springConfig = { type: "spring", stiffness: 400, damping: 30 } as const;

  return (
    <motion.nav
      initial={shouldReduceMotion ? { y: 0, opacity: 1 } : { y: -100 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-8 left-0 right-0 z-50 flex justify-center px-6"
    >
      <div className={`flex items-center gap-4 sm:gap-6 px-6 sm:px-10 py-4 rounded-full border-2 transition-all duration-500 bg-black shadow-2xl ${
        isScrolled ? "border-primary/40 scale-95" : "border-white/10"
      }`}>
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 mr-6">
          <span className="text-2xl font-[900] uppercase tracking-[-0.05em] text-white">
            BMSCE<span className="text-primary">.</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.3em] font-[900] text-white/20">PORTAL</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-6 py-2 rounded-full text-[10px] font-[900] uppercase tracking-widest transition-all ${
                  isActive ? "bg-primary text-black" : "text-white/40 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-2" />

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/profile">
                <button className="h-10 w-10 rounded-full border-2 border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white/60 hover:text-white">
                  <User className="h-4 w-4" />
                </button>
              </Link>
              <button
                onClick={handleSignOut}
                className="h-10 px-6 rounded-full text-[9px] font-[900] uppercase tracking-widest text-white/20 hover:text-red-500 transition-colors"
              >
                EXIT
              </button>
            </div>
          ) : (
            <>
              <Link to="/auth" className="hidden sm:block">
                <span className="text-[9px] font-[900] uppercase tracking-widest px-4 py-2 text-white/40 hover:text-primary transition-colors cursor-pointer">AUTH</span>
              </Link>
              <Link to="/auth?tab=signup">
                <button className="h-10 px-6 rounded-full bg-white text-black text-[9px] font-[900] uppercase tracking-widest hover:bg-primary transition-all">
                  JOIN
                </button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden px-4 pb-10 pointer-events-none"
      >
        <div className="flex bg-black border-2 border-white/10 rounded-full p-2 pointer-events-auto shadow-2xl max-w-sm mx-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 transition-all duration-300 ${
                  isActive ? "text-primary scale-110" : "text-white/20"
                }`}
              >
                <link.icon className="h-5 w-5" />
              </Link>
            );
          })}
          
          {user && isAdmin && (
            <Link
              to="/create-event"
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 transition-all duration-300 ${
                location.pathname === "/create-event" ? "text-primary scale-110" : "text-white/20"
              }`}
            >
              <PlusCircle className="h-5 w-5" />
            </Link>
          )}

          <Link
            to={user ? "/profile" : "/auth"}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 transition-all duration-300 ${
              (user && location.pathname === "/profile") || (!user && location.pathname === "/auth") ? "text-primary scale-110" : "text-white/20"
            }`}
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </motion.div>
    </motion.nav>
  );
}
