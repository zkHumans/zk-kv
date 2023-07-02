#!/usr/bin/env node

// A simple (no additional dependency) node.js script to fetch a JSON response
// from a URL given as the first paramater. May be used as service healthcheck.

if (process.argv.length !== 3) {
  console.log('INVALID');
  process.exit(1);
}

(async () => {
  try {
    const response = await fetch(process.argv[2]);
    if (response.statusText !== 'OK') {
      console.log('!OK');
      process.exit(1);
    }
    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (e) {
    console.log('ERROR');
    process.exit(1);
  }
})();
