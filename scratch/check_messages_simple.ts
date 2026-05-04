import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
    const { data, error } = await supabase
        .from('organiser_chat_messages')
        .select('*, profiles(full_name, avatar_url)')
        .limit(5);
    console.log('Messages:', JSON.stringify(data, null, 2));
    console.log('Error:', error);
}

check();
