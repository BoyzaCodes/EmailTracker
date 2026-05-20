const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://onrbrcsabbvgluxsnkdy.supabase.co';
const supabaseKey = 'sb_publishable_hWhhr1aU0n9gxqxdNlT3ew_xs9vzGRa';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
  try {
    const { data, error } = await supabase.from('leads').select('*').limit(20);
    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }
    console.log('--- LEADS IN DATABASE ---');
    data.forEach(lead => {
      console.log({
        id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        linkedin_link: lead.linkedin_link
      });
    });
  } catch (err) {
    console.error('Exception:', err);
  }
}

checkLeads();
