---
config:
  PLANS_DIR: .contextual/plans
---

# Goal

Implement tasks from spec (spec-driven) OR execute a single task (task mode) using Claude Code's tools and agents.

# Instructions

**Note**: Use Claude Code's Task tool with appropriate subagent types for complex operations. The Task tool will handle variable replacement and context management automatically.

# User Input

```text
${ARGUMENTS}
```

# Routing

1. Use Bash tool to get current branch → `${CURRENT_BRANCH}` (stop if `main`)
2. Set `${FEATURE_DIR}` = `${PLANS_DIR}/${CURRENT_BRANCH}`, `${FEATURE_CONTEXT}` = `${FEATURE_DIR}/context.md`
3. Use Task tool with subagent_type=general-purpose to validate context
4. If context doesn't exist → error, warn the user to run `/plan` first
5. Use Read tool to examine ${FEATURE_CONTEXT} for existing tasks
6. Route based on user input:
   - User input references existing phase/task/section → **SPEC-DRIVEN** mode
   - User input is a new instruction → **TASK** mode
   - User input is empty → **SPEC-DRIVEN** mode (next phase)

# Mode: TASK

**When:** User input is a new instruction (not referencing existing spec tasks)

1. Use TodoWrite tool to break down the task into subtasks
2. Use Task tool with subagent_type=general-purpose to:
   - Analyze and implement the requested task
   - Validate implementation and handle errors
3. Track progress with TodoWrite tool throughout execution
4. Update ${FEATURE_CONTEXT} using Edit tool:
   - Create "# Additional Tasks" section if needed
   - Add `- [x] ${ARGUMENTS}` to track completion

# Mode: SPEC-DRIVEN

**When:** User input references existing phase/task/section OR is empty

1. **Find linked files**: Use Task tool with subagent_type=Explore to:
   - Scan ${FEATURE_CONTEXT} for links and references
   - Follow links recursively (depth: 3)
   - Patterns: `[text](path)`, `@file`, `./path`, `[[link]]`, `$VAR`
   - Types: .md, .txt, .json, .yaml, .js, .ts, .py, .sh
   - Skip: External URLs, binaries

2. **Extract tasks** using Grep tool:
   - Search for uncompleted: `- [ ]`, `* [ ]`, `+ [ ]`
   - Identify markers: `[HIGH]`, `[MEDIUM]`, `[LOW]`, `[CRITICAL]`, `TODO:`, `FIXME:`
   - Ignore completed: `- [x]`, `* [x]`, `+ [x]`

3. **Filter tasks** (if user input provided):
   - Use Task tool to match phase/section names
   - Filter by task number or keywords
   - Default to next phase of uncompleted tasks

4. **Execute**:
   - Use TodoWrite tool to organize tasks by priority
   - Use appropriate Task subagents for implementation:
     - `general-purpose` for complex multi-step tasks
     - `Explore` for codebase exploration
     - `Plan` for architectural planning
   - Use Edit tool to mark tasks `- [x]` after completion
   - Continue on non-critical failures (document issues)

# Both Modes: Tracking

- Use TodoWrite tool throughout to track progress
- Use Edit tool to update files with `- [x]` markers
- Provide brief summary of changes implemented
- Suggest commit message: `"feat: implement ${FEATURE}"`

# Claude Code Specific Guidelines

**Use Tools Instead of Bash Commands:**
- Read tool for file reading (not cat/head/tail)
- Edit tool for file modifications (not sed/awk)
- Write tool for new files (not echo/heredoc)
- Grep tool for searching (not grep/rg commands)
- Task tool for complex operations

**Leverage Specialized Agents:**
- Use Task with subagent_type=Explore for codebase discovery
- Use Task with subagent_type=general-purpose for multi-step implementations
- Use parallel tool calls when tasks are independent

# Next Steps

1. Review implementation results
2. Review changes in ${FEATURE_CONTEXT}
3. Use `/plan` to continue updating the plan
4. Use `/commit` to commit changes
