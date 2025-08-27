export async function handler() {
  const demo = [
    { runId: 'demo-1', totalTests: 2, totalPassed: 2, totalFailed: 0, timestamp: new Date().toISOString() }
  ];
  return { statusCode: 200, body: JSON.stringify(demo) };
}
