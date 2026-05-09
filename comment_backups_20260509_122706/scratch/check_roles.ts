
import { supabase } from "./src/integrations/supabase/client";

async function check() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("No user logged in");
    return;
  }
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
    
  const { data: roles } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", user.id);
    
  const { data: requests } = await supabase
    .from("admin_requests")
    .select("*")
    .eq("user_id", user.id);

  console.log("Profile:", profile);
  console.log("Roles:", roles);
  console.log("Requests:", requests);
}

check();
