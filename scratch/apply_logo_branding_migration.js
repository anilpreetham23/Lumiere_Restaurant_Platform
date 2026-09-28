const { execSync } = require('child_process');
const path = require('path');

function runSqlFile(filepath) {
  console.log(`Executing ${filepath}...`);
  const cmd = `npx supabase db query --linked --file "${filepath}"`;
  const stdout = execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' });
  console.log(stdout);
}

try {
  const migPath = path.join(process.cwd(), 'supabase', 'migrations', '20260925110000_b2b_phase_restaurant_logo_branding.sql');
  const precheckPath = path.join(process.cwd(), 'supabase', 'preflight', '20260925110000_b2b_phase_restaurant_logo_branding_precheck.sql');

  runSqlFile(migPath);
  runSqlFile(precheckPath);

  console.log('Logo branding migration and preflight verified successfully!');
} catch (e) {
  console.error('Error applying migration:', e.message);
  process.exit(1);
}
