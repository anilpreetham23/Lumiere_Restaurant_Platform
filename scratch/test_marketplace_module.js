const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoPath = "C:\\Users\\Dell\\Desktop\\Personal Kulla Projects\\Lumiere_Restaurant_Platform";
const sqlPath = path.join(repoPath, 'scratch', 'test_marketplace_suite.sql');

function runTests() {
  console.log('===========================================================');
  console.log('LUMIÈRE MARKETPLACE ORDERS (SWIGGY/ZOMATO) TEST SUITE');
  console.log('===========================================================\n');

  try {
    const cmd = `npx supabase db query --linked -f "${sqlPath}"`;
    const stdout = execSync(cmd, { cwd: repoPath, encoding: 'utf8' });

    let resultsObj = {};
    try {
      const dbResponse = JSON.parse(stdout);
      if (dbResponse.rows && dbResponse.rows[0] && dbResponse.rows[0].test_results) {
        resultsObj = typeof dbResponse.rows[0].test_results === 'string'
          ? JSON.parse(dbResponse.rows[0].test_results)
          : dbResponse.rows[0].test_results;
      }
    } catch (parseErr) {
      console.error('Could not parse CLI JSON output:', stdout);
    }

    const testKeys = Object.keys(resultsObj);
    let passedCount = 0;

    for (const key of testKeys) {
      const passed = resultsObj[key] === true;
      if (passed) passedCount++;
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`[${key}] ${status}`);
    }

    console.log('\n===========================================================');
    console.log(`MARKETPLACE TEST SUMMARY: ${passedCount} / ${testKeys.length} PASSED`);
    console.log('===========================================================');

    if (passedCount === testKeys.length && testKeys.length > 0) {
      console.log('🎉 ALL MARKETPLACE WORKFLOW TESTS PASSED PERFECTLY!');
    } else {
      console.log('❌ SOME MARKETPLACE TESTS FAILED.');
      process.exit(1);
    }
  } catch (err) {
    console.error('FATAL TEST ERROR:', err.stdout || err.message);
    process.exit(1);
  }
}

runTests();
