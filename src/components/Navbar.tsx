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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        isScrolled
          ? "h-20 bg-background/40 backdrop-blur-2xl border-b border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          : "h-24 bg-transparent"
      }`}
    >
      {/* Animated progress line */}
      {isScrolled && (
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent origin-left"
        />
      )}

      <div className="container h-full flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="group relative flex items-center gap-4">
          <motion.div
            whileHover={{ rotate: 12, scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="relative h-12 w-12 rounded-2xl bg-white p-2 shadow-2xl transition-all duration-500 overflow-hidden"
          >
            <img src="/bmsce-logo.png" alt="BMSCE" className="h-full w-full object-contain relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
          
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter leading-none text-white font-display">
              BMSCE<span className="text-premium-gradient">.</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-muted-foreground/60 leading-tight">Events</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-md">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 group ${
                  isActive ? "text-white" : "text-muted-foreground hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-xl"
                    transition={springConfig}
                  />
                )}
                <link.icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="relative z-10">{link.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link to="/create-event">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button className="btn-vivid h-11 px-6 text-sm font-bold rounded-xl gap-2">
                      <PlusCircle className="h-4 w-4" /> POST EVENT
                    </Button>
                  </motion.div>
                </Link>
              )}
              
              <div className="h-8 w-[1px] bg-white/10 mx-1" />
              
              <Link to="/profile">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="h-11 w-11 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center hover:bg-white/[0.1] transition-all"
                >
                  <User className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              </Link>

              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="h-11 px-4 rounded-xl text-muted-foreground hover:text-red-400 font-bold transition-colors gap-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" className="h-12 px-6 rounded-2xl font-bold text-muted-foreground hover:text-white transition-all">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button className="btn-vivid h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest gap-2">
                  Get Started <Sparkles className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden h-12 w-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center relative overflow-hidden group"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileOpen ? "close" : "open"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.div>
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="absolute top-24 left-6 right-6 p-6 rounded-3xl glass-panel border border-white/10 shadow-3xl lg:hidden z-40"
          >
            <div className="space-y-2">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      location.pathname === link.path 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "text-muted-foreground hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <link.icon className="h-5 w-5" />
                    <span className="text-lg font-bold">{link.name}</span>
                  </Link>
                </motion.div>
              ))}

              <div className="pt-4 mt-4 border-t border-white/5 space-y-4">
                {user ? (
                  <>
                    {isAdmin && (
                      <Link to="/create-event" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full btn-vivid h-14 rounded-2xl font-bold">
                          POST NEW EVENT
                        </Button>
                      </Link>
                    )}
                    <Link to="/profile" onClick={() => setMobileOpen(false)} className="block p-4 rounded-2xl hover:bg-white/[0.05] text-muted-foreground font-bold">
                      Profile Settings
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="w-full justify-start h-14 rounded-2xl text-red-400 font-bold hover:bg-red-500/10"
                    >
                      <LogOut className="h-5 w-5 mr-3" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    <Link to="/auth" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 font-bold">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth?tab=signup" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full btn-vivid h-14 rounded-2xl font-black">
                        GET STARTED
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
