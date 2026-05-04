import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
    const { error } = await supabase
        .from('organiser_chat_messages')
        .select('non_existent_column');
    console.log('Error Message:', error?.message);
}

check();
