# Docker Build Guidelines

General strategies for preventing and debugging Docker build issues.

## Debugging Workflow

When a build fails:

1. **Read the error message** - Look for the specific command that failed
2. **Identify the stage** - Check which Dockerfile stage failed (deps, builder, runner)
3. **Reproduce locally** - Run the failing command locally (e.g., `pnpm build`)
4. **Check dependencies** - Verify all required tools are available in the image
5. **Test incrementally** - Build up to the failing stage to isolate the issue

## Common Problem Patterns

### Missing System Dependencies
**Pattern**: Code uses a system command (git, curl, etc.) that's not in the base image  
**Prevention**: 
- List all system commands used in build scripts
- Add to Dockerfile: `RUN apk add --no-cache <package>`
- Or handle missing commands gracefully with try/catch

### Type Errors During Build
**Pattern**: TypeScript compilation fails in Docker but works locally  
**Prevention**:
- Always run `pnpm build` locally before committing
- Fix type mismatches (especially when converting between DB types and form types)
- Use type guards for enum values and union types

### Missing Environment Variables
**Pattern**: Build scripts expect env vars that aren't available  
**Prevention**:
- Make build scripts handle missing env vars gracefully
- Use fallbacks or skip operations when vars are missing
- Document which vars are required vs optional

### File System Differences
**Pattern**: Code assumes files/directories exist that aren't in Docker context  
**Prevention**:
- Don't assume `.git` exists (it's in `.dockerignore`)
- Don't assume local dev files exist
- Use environment variables or graceful fallbacks

### Build vs Runtime Dependencies
**Pattern**: Missing dependencies that are needed at build time but not runtime  
**Prevention**:
- Install build tools in the `builder` stage
- Only copy production artifacts to `runner` stage
- Use multi-stage builds to keep final image small

## Prevention Checklist

Before committing changes that affect builds:

- [ ] Run `pnpm build` locally - catches TypeScript errors early
- [ ] Test Docker build locally - `docker build -t test .`
- [ ] Verify all system commands are available in the image
- [ ] Ensure build scripts handle missing dependencies gracefully
- [ ] Check that environment variables have fallbacks
- [ ] Verify `.dockerignore` excludes unnecessary files

## Testing Locally

```bash
# Build the image
docker build -t coffee:test .

# Test specific stage (if needed)
docker build --target builder -t coffee:builder .
```

## General Principles

1. **Build should be reproducible** - Same inputs should produce same output
2. **Handle missing dependencies** - Build should work without git repo, database, etc.
3. **Fail fast with clear errors** - Better to fail during build than at runtime
4. **Test locally first** - Don't rely on CI/CD to catch build issues
5. **Keep Dockerfile minimal** - Only install what's needed
6. **Use multi-stage builds** - Separate build dependencies from runtime
