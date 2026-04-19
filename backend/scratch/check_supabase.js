const supabase = require('../supabase');

async function checkHours() {
  const { data, error } = await supabase.from('gyms').select('name, openingHours').eq('id', '1').single();
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Gym:', data.name);
    console.log('Sunday Hours:', data.openingHours.sunday);
  }
  process.exit(0);
}

checkHours();
