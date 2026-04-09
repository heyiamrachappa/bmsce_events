import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function AuthCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check hash for any Supabase errors from the email link
        const hash = window.location.hash;
        if (hash && hash.includes("error_description")) {
            const params = new URLSearchParams(hash.substring(1));
            const errorDesc = params.get("error_description");
            if (errorDesc) setError(decodeURIComponent(errorDesc).replace(/\+/g, ' '));
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
                navigate("/dashboard");
            }
        });

        supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
            if (sessionError) {
                setError("Verification failed. Please try again.");
                return;
            }
            if (session) {
                navigate("/dashboard");
            } else {
                // If it's a valid link, session should establish momentarily via URL hash.
                const timeout = setTimeout(() => {
                    const currentHash = window.location.hash;
                    if (!currentHash || (!currentHash.includes("access_token") && !currentHash.includes("error"))) {
                        // User visited /auth/callback directly with no link payload
                        navigate("/auth");
                    } else if (currentHash.includes("error")) {
                         setError("Verification failed. Please try again.");
                    }
                }, 3000);
                return () => clearTimeout(timeout);
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="text-center space-y-8 max-w-sm w-full">
                {error ? (
                    <div className="space-y-6">
                        <h2 className="text-4xl font-[900] uppercase tracking-tighter text-destructive">Oops!</h2>
                        <p className="text-sm font-[900] text-muted-foreground uppercase tracking-widest leading-loose">
                            {error || "Verification failed. Please try again."}
                        </p>
                        <Link to="/auth" className="block mt-8">
                            <Button className="w-full h-16 rounded-full bg-primary text-primary-foreground font-[900] uppercase tracking-widest text-sm hover:scale-[1.02] transition-all">
                                Go to Login
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
                        <p className="text-sm font-[900] uppercase tracking-widest text-muted-foreground">Verifying your account...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
