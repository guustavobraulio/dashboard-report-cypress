export async function handler() {
  const demo = [{
    runId: 'Test-12345',
    timestamp: new Date().toISOString(),
    totalTests: 2,
    totalPassed: 2,
    totalFailed: 0,
    totalDuration: 11890, // ms
    branch: 'main',
    environment: 'staging',
    author: 'cypress-bot',
    commit: 'abc1234',
    githubRunUrl: 'https://github.com/org/repo/actions/runs/12345',
    tests: [
      { title: 'Spec A > cenario 1', state: 'passed', duration: 5400, error: '' },
      { title: 'Spec A > cenario 2', state: 'passed', duration: 6490, error: '' }
    ],
    logs: [],
    artifacts: []
  }];
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(demo),
  };
}
