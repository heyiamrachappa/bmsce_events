import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
                navigate("/dashboard");
            }
        });

        // Also check current session immediately
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                navigate("/dashboard");
            } else {
                // If no session found after a delay, send to auth
                const timeout = setTimeout(() => {
                    navigate("/auth");
                }, 2000);
                return () => clearTimeout(timeout);
            }
        });
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Authenticating...</p>
            </div>
        </div>
    );
}
