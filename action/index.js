const core = require('@actions/core');
const github = require('@actions/github');

const fs = require('fs');
const path = require('path');

async function run () {
    
    try {

        const token = core.getInput('github_token');
        const octo = github.getOctokit(token);

        const allEvents = await octo.paginate(
            octo.rest.activity.listPublicEventsForUser,
            {
                username: github.context.repo.owner,
                per_page: 100
            }
        );

        const interesting = new Set([
            'PushEvent',
            'PullRequestEvent',
            'IssuesEvent'
        ]);

        const filtered = allEvents
            .filter(event => interesting.has(event.type));

        let content = [];
        let i = 0;

        while (i < filtered.length) {

            const event = filtered[i];

            let icon = '';
            let description = '';

            if (event.type === 'PushEvent') {
                
                let commits = event.payload.commits.length;
                const repo = event.repo.name;
                i++;

                while (i < filtered.length && filtered[i].type === 'PushEvent' && filtered[i].repo.name === repo) {

                    commits += filtered[i].payload.commits.length;
                    i++;
                }

                icon = 'assets/badges/pushed.svg';
                description = `Pushed ${commits} commit${commits > 1 ? 's' : ''} to [${event.repo.name}](https://github.com/${event.repo.name})`;
            } else {

                i++;

                if (event.type === 'PullRequestEvent') {

                    if (event.payload.pull_request.merged) {

                        icon = 'assets/badges/pr_merged.svg';
                    } else if (event.payload.action === 'opened') {

                        icon = 'assets/badges/pr_opened.svg';
                    } else if (event.payload.action === 'closed') {

                        icon = 'assets/badges/pr_closed.svg';
                    }

                    description = `${event.payload.action.charAt(0).toUpperCase() + event.payload.action.slice(1)} [Pull Request #${event.payload.pull_request.number}](${event.payload.pull_request.html_url}) in [${event.repo.name}](https://github.com/${event.repo.name})`;
                } else if (event.type === 'IssuesEvent') {

                    if (event.payload.action === 'opened') {

                        icon = 'assets/badges/issue_opened.svg';
                    } else if (event.payload.action === 'closed') {

                        icon = 'assets/badges/issue_closed.svg';
                    } else if (event.payload.action === 'reopened') {

                        icon = 'assets/badges/issue_reopened.svg';
                    }

                    description = `${event.payload.action.charAt(0).toUpperCase() + event.payload.action.slice(1)} [Issue #${event.payload.issue.number}](${event.payload.issue.html_url}) in [${event.repo.name}](https://github.com/${event.repo.name})`;
                }
            }

            if (!icon || !description) continue;
            content.push(`<img src="https://raw.githubusercontent.com/StarbuckBarista/profile-activity/refs/heads/master/${icon}" width="24" height="24" valign="bottom"/>&nbsp; ${description}`);
        }

        const readmePath = path.join(process.cwd(), 'README.md');
        let readme = fs.readFileSync(readmePath, 'utf8');

        const startMarker = '<!-- ACTIVITY_START -->';
        const endMarker   = '<!-- ACTIVITY_END -->';

        const before = readme.split(startMarker)[0];
        const after  = readme.split(endMarker)[1];

        const previousBlock = readme.split(startMarker)[1].split(endMarker)[0].trim();
        const previousLines = previousBlock.split('\n\n');

        const seen = new Set();
        let merged = [];

        for (const line of content) {

            if (!seen.has(line)) {

                seen.add(line);
                merged.push(line);
            }
        }

        for (const line of previousLines) {

            if (!seen.has(line)) {

                seen.add(line);
                merged.push(line);
            }
        }

        merged = merged.slice(0, 8);
        readme = `${before}${startMarker}\n${merged.join('\n\n')}\n${endMarker}${after}`;
        fs.writeFileSync(readmePath, readme);
    } catch (error) {

        core.setFailed(error.message);
    }
}

run();
