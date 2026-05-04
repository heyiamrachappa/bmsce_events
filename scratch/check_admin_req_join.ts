import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function check() {
    const { data, error } = await supabase
        .from('admin_requests')
        .select('*, profiles(full_name)')
        .limit(1);
    console.log('Success:', !!data);
    console.log('Error:', error?.message);
}

check();
