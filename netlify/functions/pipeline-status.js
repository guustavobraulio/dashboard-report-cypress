const GITHUB_OWNER = 'guustavobraulio';
const GITHUB_REPO = 'dashboard-report-cypress';
const WORKFLOW_FILE_NAME = 'pipeline.yml';
const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

exports.handler = async function(event) {
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE_NAME}/runs?branch=main&per_page=1`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error })
      };
    }
    const data = await response.json();
    if (!data.workflow_runs || data.workflow_runs.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'not_found' })
      };
    }
    const run = data.workflow_runs[0];
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: run.status,        // Exemplo: "queued", "in_progress", "completed"
        conclusion: run.conclusion // Exemplo: "success", "failure"
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
