// netlify/functions/get-results.js
export async function handler() {
  const demo = [{
    runId: 'demo-1',
    timestamp: new Date().toISOString(),
    totalTests: 2,
    totalPassed: 2,
    totalFailed: 0
  }];
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(demo)
  };
}
