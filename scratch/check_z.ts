import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
    const { data: s_data, error: s_error } = await supabase.from('organiser_chat_messages').select('*').limit(0);
    const { data: z_data, error: z_error } = await supabase.from('organizer_chat_messages').select('*').limit(0);
    
    console.log('S exists:', !s_error);
    console.log('Z exists:', !z_error);
}

check();
