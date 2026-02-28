/**
 * Integration Routes
 * POST /api/git/commit-push — Stage, commit, push changes
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const router = express.Router();

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

    const execOpts = { cwd: projectDir, encoding: 'utf-8' };

    // Stage data, config, lang, and styles directories
    await execFileAsync('git', ['add', 'data/', 'config/', 'lang/', 'styles/'], execOpts);

    // Check if there are staged changes
    try {
      await execFileAsync('git', ['diff', '--cached', '--quiet'], execOpts);
      // If no error, no changes to commit
      return res.json({ success: true, message: 'No changes to commit' });
    } catch {
      // Non-zero exit means there ARE staged changes — continue
    }

    // Commit and push — execFileAsync passes message as a literal argv
    // element, so shell metacharacters are never interpreted
    await execFileAsync('git', ['commit', '-m', message], execOpts);
    await execFileAsync('git', ['push'], execOpts);

    res.json({ success: true, message: 'Changes committed and pushed' });
  } catch (e) {
    const errorMsg = (e.stderr && e.stderr.trim()) || e.message;
    res.status(500).json({ success: false, error: `Git error: ${errorMsg}` });
  }
});

module.exports = router;
