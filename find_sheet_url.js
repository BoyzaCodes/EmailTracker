const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\9767bd4b-418e-4705-9b01-2fae91141fcc\\.system_generated\\logs\\transcript.jsonl';

async function searchLogs() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('[Sheets API]') || line.includes('sync-sheet')) {
      console.log('Log line:', line.substring(0, 500));
    }
  }
}

searchLogs();
