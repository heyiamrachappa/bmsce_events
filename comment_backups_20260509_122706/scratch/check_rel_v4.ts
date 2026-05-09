import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
    const { data, error } = await supabase
        .from('organiser_chat_messages')
        .select('*, sender:profiles!organiser_chat_messages_sender_id_fkey(full_name)')
        .limit(1);
    console.log('Success:', !!data);
    console.log('Error:', error?.message);
}

check();
