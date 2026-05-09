import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
    const { data, error } = await supabase
        .from('organiser_chat_messages')
        .select('*')
        .limit(0); // Just headers
    console.log('Columns:', data);
    console.log('Error:', error);
}

check();
