import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LogOut, Menu, X, PlusCircle, ShieldCheck, User, Calendar, MapPin, Users, IndianRupee, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { buttonPress, slideUp, cardHover } from "@/lib/motion-variants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

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
    { name: "Discover", path: "/events" },
    ...(user ? [{ name: "Dashboard", path: "/dashboard" }] : []),
  ];

  return (
    <motion.nav
      initial={shouldReduceMotion ? { y: 0, opacity: 1 } : { y: -100 }}
      animate={{ y: 0, opacity: 1 }}
      className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
        ? "h-14 bg-background/80 backdrop-blur-xl border-b border-primary/20 shadow-lg"
        : "h-20 bg-transparent"
        }`}
    >
      <div className="container h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 font-bold text-xl group">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="h-10 w-10 rounded-full bg-white p-1 shadow-[0_0_15px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all flex items-center justify-center overflow-hidden"
          >
            <img src="/bmsce-logo.png" alt="BMSCE Logo" className="h-full w-full object-contain" />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="tracking-tighter bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase"
          >
            BMSCE EVENTS
          </motion.span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="relative text-sm font-medium transition-colors hover:text-primary group py-2"
            >
              {link.name}
              {location.pathname === link.path && (
                <motion.div
                  layoutId="nav-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  initial={false}
                />
              )}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary origin-left"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.2 }}
              />
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link to="/create-event">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" size="sm" className="border-primary/50 hover:bg-primary/10 hover:neon-glow-purple h-9">
                      <PlusCircle className="h-4 w-4 mr-1" /> Post Event
                    </Button>
                  </motion.div>
                </Link>
              )}
              <Link to="/profile">
                <Button variant="ghost" size="icon" className="hover:bg-primary/10 rounded-full h-9 w-9">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="hover:bg-destructive/10 hover:text-destructive h-9"
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/auth" className="text-sm font-medium hover:text-primary transition-colors">Sign In</Link>
              <Link to="/auth?tab=signup">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" className="gradient-primary border-0 shadow-glow hover:opacity-90 h-9 px-6">
                    Get Started
                  </Button>
                </motion.div>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="md:hidden p-2 rounded-md hover:bg-white/5"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileOpen ? "close" : "open"}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block text-lg font-bold py-2 ${location.pathname === link.path ? "text-primary" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.name}
                </Link>
              ))}

              {user ? (
                <div className="pt-4 border-t border-border space-y-4">
                  {isAdmin && (
                    <Link to="/create-event" className="block text-lg font-bold py-2" onClick={() => setMobileOpen(false)}>
                      Post Event
                    </Link>
                  )}
                  <Link to="/profile" className="block text-lg font-bold py-2" onClick={() => setMobileOpen(false)}>
                    Profile Settings
                  </Link>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full justify-start text-destructive hover:bg-destructive/10"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-5 w-5 mr-3" /> Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex gap-4 pt-2">
                  <Link to="/auth" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="lg" className="w-full">Sign In</Button>
                  </Link>
                  <Link to="/auth?tab=signup" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button size="lg" className="w-full gradient-primary">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
