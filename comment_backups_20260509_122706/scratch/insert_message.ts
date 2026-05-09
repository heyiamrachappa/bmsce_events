import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
    // I need a valid user_id that exists in profiles.
    // I'll try to find one.
    const { data: profile } = await supabase.from('profiles').select('user_id').limit(1).single();
    if (!profile) {
        console.log('No profiles found');
        return;
    }

    const { data, error } = await supabase
        .from('organiser_chat_messages')
        .insert({ sender_id: profile.user_id, message: 'Test message' })
        .select();
    
    console.log('Insert Result:', data);
    console.log('Insert Error:', error);
}

check();
