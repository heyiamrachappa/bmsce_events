import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
    
    const syntaxes = [
        '*, profiles!organiser_chat_messages_sender_id_fkey(full_name)',
        '*, sender:profiles(full_name)',
        '*, sender:sender_id(full_name)',
        '*, profiles(full_name)'
    ];

    for (const s of syntaxes) {
        const { data, error } = await supabase.from('organiser_chat_messages').select(s).limit(1);
        console.log(`Syntax: ${s}`);
        if (error) console.log('Error:', error.message);
        else console.log('Success:', data);
    }
}

check();
