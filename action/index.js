const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const token = core.getInput('github_token');
    const octo = github.getOctokit(token);
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
