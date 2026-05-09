import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
    const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name: 'organiser_chat_messages' });
    console.log('Columns:', cols);
    console.log('Col Error:', colErr);

    const { data: fks, error: fkErr } = await supabase.rpc('get_table_fks', { table_name: 'organiser_chat_messages' });
    console.log('FKs:', fks);
    console.log('FK Error:', fkErr);
}

check();
