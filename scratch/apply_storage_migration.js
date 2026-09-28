const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '../supabase/migrations/20260925120000_b2b_phase_storage_bucket.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log("Applying Storage Bucket migration...");

const lines = sql.split(';').map(s => s.trim()).filter(Boolean);

for (const query of lines) {
  const singleLineSql = query.replace(/\s+/g, ' ').trim();
  const escapedSql = singleLineSql.replace(/"/g, '\\"');
  const cmd = `npx supabase db query --linked "${escapedSql}"`;
  try {
    const out = execSync(cmd, { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    console.log("Executed query successfully.");
  } catch (err) {
    console.error("Query failed:", err.message);
    process.exit(1);
  }
}

console.log("Storage Bucket migration applied successfully!");
