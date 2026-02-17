---
config:
  MAIN_BRANCH: main
---
# Goal

Create a git commit with a conventional commit message based on current changes using Claude Code's built-in git tools.

# User Input

```text
${ARGUMENTS}
```

Optional: Commit message or specific files to stage.

# Steps

## 1. Check Git Status

Use the Task tool with subagent_type=general-purpose to:
- Analyze git status and determine what files have changed
- If no changes → notify user and exit

## 2. Generate Commit Message

**If user provided message:**
- Use ${ARGUMENTS} as commit message

**If no message provided:**
1. Use the Task tool to analyze changes and determine commit type:
   - `feat` → New feature
   - `fix` → Bug fix
   - `docs` → Documentation only
   - `refactor` → Code restructuring
   - `test` → Test changes
   - `chore` → Maintenance/toolingd

2. Create description:
   - Use present tense ("add" not "added")
   - Start with lowercase
   - Be specific but brief

3. Format: `${TYPE}: ${DESCRIPTION}`

**Examples:**
- `feat: add merge command with prerequisites check`
- `docs: update README with installation instructions`
- `fix: correct function name in validation`

## 3. Stage and Commit

Use Claude Code's built-in git commit functionality:
1. Stage changes (all or specific files as requested)
2. Create commit with conventional message format
3. The commit will automatically include Claude Code attribution

# Output

Summary of commit with message and files changed.

# Next Steps

1. Push changes: Use Bash tool with `git push`
2. Use `/merge` to merge to ${MAIN_BRANCH}

# Guidelines

**Important for Claude Code:**
- Use the built-in git commit functionality instead of raw bash commands
- The system will automatically add Claude Code attribution to commits
- Follow the git safety protocol (never force push, skip hooks, etc.)
- Use Task tools for complex analysis instead of direct bash commands

**Commit Types:**
- Use `feat` for new functionality, `fix` for bugs, `docs` for documentation
- Omit scope unless changes are focused in one directory
- Keep descriptions concise and action-oriented
