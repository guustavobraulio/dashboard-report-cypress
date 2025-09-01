const GITHUB_OWNER = 'guustavobraulio';
const GITHUB_REPO = 'dashboard-report-cypress';
const WORKFLOW_FILE_NAME = 'pipeline.yml'; // Coloque o nome do seu arquivo de workflow
const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN; 

exports.handler = async function(event) {
  try {
    // Optionally, use env do frontend, ex: environment: JSON.parse(event.body).environment
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE_NAME}/dispatches`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { environment: 'staging' }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error })
      };
    }
    return {
      statusCode: 204,
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
