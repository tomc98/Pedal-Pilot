# CLAUDE.md - Guidelines for Pedal-Pilot VSCode Extension

## Build Commands
- Setup: `npm install`
- Start dev mode: `npm run dev`
- Build extension: `npm run build`
- Package extension: `vsce package`
- Test: `npm test`
- Run single test: `npm test -- -t "test name"`
- Lint: `npm run lint`
- Format code: `npm run format`

## Code Style Guidelines
- TypeScript for all code with strict type checking
- Follow VSCode extension API patterns
- Use ESLint with Prettier for formatting
- Naming: camelCase for variables/functions, PascalCase for classes/interfaces
- Imports ordered: node modules, then project modules
- Error handling: use try/catch with informative error messages
- Prefer async/await over raw promises
- Comment complex logic and public API functions
- Use descriptive variable names that indicate purpose
- Log meaningful debug information for pedal interactions