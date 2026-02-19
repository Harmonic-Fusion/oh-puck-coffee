---
config:
  PLANS_DIR: .contextual/plans
  AGENTS_MD: AGENTS.md
---

# Goal

Route to CREATE, CLARIFY, or PLAN mode based on specification state. Creates/updates **DOCUMENTATION ONLY** - never source code. Uses Claude Code's tools and agents for intelligent planning.

# Instructions

**Note**: Claude Code's Task tool will handle variable replacement and context management. Use specialized agents for different aspects of planning.

# Routing

1. Use Bash tool to get current branch → `${CURRENT_BRANCH}` (stop if `main`)
2. Set `${FEATURE_DIR}` = `${PLANS_DIR}/${CURRENT_BRANCH}`, `${FEATURE_CONTEXT}` = `${FEATURE_DIR}/context.md`
3. Use Read tool to check if context exists
4. Route based on context state:
   - No `context.md` exists → **CREATE** mode
   - `context.md` exists with `[NEEDS CLARIFICATION]` markers → **CLARIFY** mode
   - `context.md` exists without `[NEEDS CLARIFICATION]` markers → **PLAN** mode

# Mode: CREATE

**When:** `${FEATURE_CONTEXT}` does not exist

1. Use Bash tool to create directory ${FEATURE_DIR} if needed
2. Use Write tool to create `${FEATURE_CONTEXT}` with template:

```markdown
# Problem Statement

[What problem does this solve and what is the proposed solution? (2-3 sentences. Keep it concise.)]

# Scope

[List requirements, boundaries, and dependencies. Be specific and measurable. Do not include implementation details. Keep it concise.]

# Solution

[Describe the solution. Include reasoning for why this approach was chosen over alternatives. Keep it concise.]

# Tasks

[Plan and list the implementation tasks by phase. Be specific and measurable. DRY. Reference the solution and scope sections.]

## Phase 1: Description

- [ ] task 1
```

3. Use Read tool to examine `${AGENTS_MD}` for project context
4. Use Task tool with subagent_type=Plan to:
   - Analyze user input from `${ARGUMENTS}`
   - Explore codebase for context
   - Generate specification content
   - Focus on **WHAT** needs to be specified, not **HOW**
5. Add `[NEEDS CLARIFICATION: question?]` markers for ambiguous areas
6. Validate: only `${PLANS_DIR}/${CURRENT_BRANCH}/` files modified

# Mode: CLARIFY

**When:** `${FEATURE_CONTEXT}` exists with `[NEEDS CLARIFICATION]` markers

1. Use Read tool to examine `${FEATURE_CONTEXT}` and related files
2. Use Grep tool to find all `[NEEDS CLARIFICATION]` markers
3. **If user input provided:**
   - Use Edit tool to update spec sections
   - Add new clarification markers as needed
   - Remove resolved markers
4. **If NO user input:**
   - Use Task tool with subagent_type=general-purpose to:
     - Present ONE question at a time with options
     - Format as table (A/B/Custom)
   - Wait for answer, update spec, continue (max 7 per session)
   - Track questions asked to avoid duplicates
5. Validate: only `${PLANS_DIR}/${CURRENT_BRANCH}/` files modified

# Mode: PLAN

**When:** `${FEATURE_CONTEXT}` exists without `[NEEDS CLARIFICATION]` markers

1. Use Read tool to extract requirements from `${FEATURE_CONTEXT}`
2. Check for `${FEATURE_DIR}/analyzed.md`:
   - If exists: Use Read tool to review
   - If not: Use Task tool with subagent_type=Explore to scan project
3. Use Task tool with subagent_type=Plan to generate implementation plan:
   - Maximum 10 tasks organized in phases
   - Use `- [ ]` checkbox syntax
   - Reference solution and scope sections
   - Keep tasks concrete and measurable
   - Prioritize by dependencies
4. Use Edit tool to update `${FEATURE_CONTEXT}` with plan
5. Use TodoWrite tool to track planning progress
6. Validate: only `${PLANS_DIR}/${CURRENT_BRANCH}/` files modified

# Claude Code Specific Features

**Leverage Specialized Agents:**
- `Plan` subagent for architectural planning and design decisions
- `Explore` subagent for thorough codebase analysis
- `general-purpose` subagent for complex reasoning tasks

**Use Tools Effectively:**
- Read/Write/Edit tools for all file operations
- Grep tool with regex for pattern matching
- Task tool for intelligent analysis and planning
- TodoWrite for tracking multi-step planning processes

**Parallel Processing:**
- Execute multiple Read operations in parallel when analyzing files
- Run multiple Task agents concurrently for different planning aspects

# ⚠️ FINAL CHECKPOINT

**Before finishing:**

- [ ] Verify modifications ONLY in `${PLANS_DIR}/${CURRENT_BRANCH}/`
- [ ] Confirm created documentation, NOT implementation
- [ ] Check all clarification markers are properly formatted
- [ ] Ensure plan tasks use checkbox syntax `- [ ]`

# Next Steps

- Review the `${FEATURE_CONTEXT}` file to see the plan
- Run `/plan [description]` again to refine the plan
- Run `/implement [phase]` to execute the plan
- Use `/commit` to save specification changes
