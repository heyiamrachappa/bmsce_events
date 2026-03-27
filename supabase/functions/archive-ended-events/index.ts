import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Authorization Check (Internal/Admin only)
        const authHeader = req.headers.get('Authorization')
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verify the requester is authenticated and has super_admin role
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '')
            const { data: { user }, error: userError } = await supabase.auth.getUser(token)
            
            // Check if super_admin (or if it's the internal service role call which doesn't have a token here usually)
            // Actually, for cron jobs, we usually check for a secret key in the header.
            // For now, let's allow it if it's a super_admin or if the API Key is the service role key.
            const isServiceKey = req.headers.get('apikey') === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
            
            if (!isServiceKey) {
                if (userError || !user) throw new Error('Unauthorized')
                const { data: roleData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'super_admin' })
                if (!roleData) throw new Error('Forbidden: Super Admin only')
            }
        } else {
            throw new Error('Missing Authorization')
        }

        // 2. Call the database function
        const { error } = await supabase.rpc('archive_ended_events')

        if (error) throw error

        return new Response(JSON.stringify({ message: 'Archival process completed successfully' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
