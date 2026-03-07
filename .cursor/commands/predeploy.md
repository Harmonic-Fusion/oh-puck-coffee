# 1. Rerequists
Ensure docker-compose is running `docker-compose ps` otherwise `docker-compose up -d`

# 2. Verfiy Type Safety
`NODE_OPTIONS='' pnpm typecheck` and fix any errors before moving on.

# 3. Verfiy Linting
`NODE_OPTIONS='' pnpm lint` and fix any errors before moving on.

# 4. Verfiy Tests
`NODE_OPTIONS='' pnpm test` If all pass → done else fix the first failing test only and repeat. Do not batch fixes. If a fix creates new failures, treat them as next priority.

# 5. Verfiy Build
`NODE_OPTIONS='' pnpm build` and fix any errors before moving on.

# 6. React Compiler Compatibility Check
Your job is to check not fix. React Complier is enabled in the project and `eslint-disable-next-line react-hooks/incompatible-library` is used to ignore warnings for specific libraries. Check if these libraries have new stable versions that are compatible with React Compiler and stop if that's true. Do not make code changes. DO NOT FIX with "use no memo".
* "@tanstack/react-table"
* "react-hook-form

# 7. Report Results
If any changes were made, suggest a commit message: `fix: <description of changes>` otherwise list all the steps and report they passed.

