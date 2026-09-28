const { execSync } = require('child_process');
const path = require('path');

const repoPath = "C:\\Users\\Dell\\Desktop\\Personal Kulla Projects\\Lumiere_Restaurant_Platform";

try {
  console.log('--- RUNNING PREFLIGHT ---');
  const preflightPath = path.join(repoPath, 'supabase', 'preflight', '20260924020000_b2b_phase_swiggy_zomato_marketplace_precheck.sql');
  const preflightCmd = `npx supabase db query --linked -f "${preflightPath}"`;
  const preflightOut = execSync(preflightCmd, { cwd: repoPath, encoding: 'utf8' });
  console.log('Preflight Output:', preflightOut);

  console.log('--- EXECUTING MIGRATION ---');
  const migrationPath = path.join(repoPath, 'supabase', 'migrations', '20260924020000_b2b_phase_swiggy_zomato_marketplace.sql');
  const migrationCmd = `npx supabase db query --linked -f "${migrationPath}"`;
  const migrationOut = execSync(migrationCmd, { cwd: repoPath, encoding: 'utf8' });
  console.log('Migration Output:', migrationOut);

  console.log('SUCCESS: Preflight & Migration applied perfectly!');
} catch (err) {
  console.error('Migration failed:', err.stdout || err.message);
  process.exit(1);
}
