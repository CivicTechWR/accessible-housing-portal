// Fails a pull request whose description doesn't link an issue.
// Reads the description from the PR_BODY environment variable (set by
// .github/workflows/pr-issue-link.yml), so it can be run locally too:
//   PR_BODY="Closes #123" node scripts/check-pr-issue-link.js

const issueRef = String.raw`(?:#\d+|https://github\.com/[\w.-]+/[\w.-]+/issues/\d+)`;

// GitHub's closing keywords: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue
const closingKeyword = String.raw`(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)`;

const closingPattern = new RegExp(String.raw`\b${closingKeyword}:?\s+${issueRef}`, "i");
const partOfPattern = new RegExp(String.raw`\bpart\s+of\s+${issueRef}`, "i");

const failureMessage = [
  "This pull request's description doesn't link an issue.",
  "Add one of these lines to the description:",
  "  Closes #N       (this PR finishes issue N)",
  "  Part of #N      (this PR is partial work on issue N)",
  "Editing the description re-runs this check.",
].join("\n");

/**
 * @param {string | null | undefined} body
 * @returns {boolean}
 */
function hasIssueLink(body) {
  if (!body) return false;
  return closingPattern.test(body) || partOfPattern.test(body);
}

module.exports = { hasIssueLink, failureMessage };

if (require.main === module) {
  if (hasIssueLink(process.env.PR_BODY)) {
    console.log("The description links an issue.");
  } else {
    console.error(failureMessage);
    console.error(
      "::error title=Link an issue::Add `Closes #N` to the description, or `Part of #N` for partial work.",
    );
    process.exitCode = 1;
  }
}
