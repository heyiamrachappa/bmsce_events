import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
    const { data, error } = await supabase
        .from('profiles')
        .select('full_name, clubs(name)')
        .limit(1);
    console.log('Profiles Join Success:', !!data);
    console.log('Error:', error?.message);
}

check();
