/**
 * Integration Routes
 * POST /api/github/sync — Fetch GitHub repos → projects.json
 * POST /api/git/commit-push — Stage, commit, push changes
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const { config } = require('../lib/config-loader');

const router = express.Router();

// ─── POST /api/github/sync ─────────────────────────────────

router.post('/github/sync', async (req, res) => {
  try {
    const ghConfig = config.getGithubConfig();
    const username = ghConfig.username;

    if (!username) {
      return res.status(400).json({ success: false, error: 'No GitHub username configured in app.json' });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (githubToken) headers.Authorization = `token ${githubToken}`;

    // Fetch repos — authenticated endpoint includes private repos
    const apiUrl = githubToken
      ? 'https://api.github.com/user/repos?per_page=100&type=owner'
      : `https://api.github.com/users/${username}/repos?per_page=100`;

    const resp = await fetch(apiUrl, { headers });
    if (!resp.ok) {
      return res.status(502).json({ success: false, error: `GitHub API error: ${resp.statusText}` });
    }

    let repos = await resp.json();

    // Filter out forks and archived repos
    repos = repos.filter(r => !r.fork && !r.archived);

    // Map to portfolio items
    const langCodes = config.getLanguageCodes();
    const items = repos.map(repo => {
      const name = repo.name || '';
      const desc = repo.description || name;

      const title = {};
      const description = {};
      for (const code of langCodes) {
        title[code] = name;
        description[code] = desc;
      }

      return {
        id: `github_${name}`,
        title,
        url: repo.html_url || '',
        description,
        date: (repo.pushed_at || repo.created_at || '').slice(0, 10),
        created: (repo.created_at || '').slice(0, 10),
        topics: repo.topics || [],
        language: repo.language,
        stars: repo.stargazers_count || 0,
        isPrivate: repo.private || false,
      };
    });

    // Save to projects.json
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const projectsFile = path.join(dataDir, 'projects.json');
    await fs.writeFile(projectsFile, JSON.stringify(items, null, 2), 'utf-8');

    res.json({ success: true, count: items.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── POST /api/git/commit-push ──────────────────────────────

router.post('/git/commit-push', async (req, res) => {
  try {
    const message = (req.body && req.body.message) || 'Update from admin panel';
    const projectDir = process.env.PROJECT_DIR || process.cwd();

    // Check if git repo
    const gitDir = path.join(projectDir, '.git');
    if (!(await fs.pathExists(gitDir))) {
      return res.status(400).json({ success: false, error: 'Project directory is not a git repository' });
    }

    const execOpts = { cwd: projectDir, encoding: 'utf-8', stdio: 'pipe' };

    // Stage data, config, lang, and styles directories
    execSync('git add data/ config/ lang/ styles/', execOpts);

    // Check if there are staged changes
    try {
      execSync('git diff --cached --quiet', execOpts);
      // If no error, no changes to commit
      return res.json({ success: true, message: 'No changes to commit' });
    } catch {
      // Non-zero exit means there ARE staged changes — continue
    }

    // Commit and push
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, execOpts);
    execSync('git push', execOpts);

    res.json({ success: true, message: 'Changes committed and pushed' });
  } catch (e) {
    const errorMsg = e.stderr ? e.stderr.trim() : e.message;
    res.status(500).json({ success: false, error: `Git error: ${errorMsg}` });
  }
});

module.exports = router;
