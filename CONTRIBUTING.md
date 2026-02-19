# Contributing to Running Dashboard

Thank you for considering contributing! This document outlines the process for contributing.

---

## Code of Conduct

Be respectful, constructive, and collaborative. harassment or abuse will not be tolerated.

---

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report:
- Check if the bug is already reported in Issues
- Ensure you're using the latest version
- Collect relevant logs and error messages

Bug reports should include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (Docker version, OS)
- Relevant logs from `logs/app.log`

### Suggesting Enhancements

Enhancement suggestions should include:
- Clear problem statement
- Proposed solution
- Alternatives considered
- Potential impact

### Pull Requests

1. **Fork the repo**
2. **Create a branch:**
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b fix/bug-name
   ```
3. **Make changes** following coding conventions
4. **Add tests** if applicable
5. **Ensure docs are updated** (README, API docs, etc.)
6. **Commit with clear message:**
   ```bash
   git commit -m "feat: add 5K pace prediction algorithm"
   git commit -m "fix: handle null heart rate in stats"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/)
7. **Push:**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open Pull Request** with description of changes

### PR Requirements

- [ ] Code compiles without errors (`npm run build`)
- [ ] TypeScript passes (`npx tsc --noEmit`)
- [ ] Linting passes (`npm run lint`)
- [ ] No new console.log statements
- [ ] Includes tests (if applicable)
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] All changes documented in PR description

---

## Development Setup

Follow [setup.md](./setup.md) for local development.

### Useful Commands

```bash
# Backend
cd backend
npm run dev       # Development server
npm run build     # Production build
npm run lint      # Lint code
npm run test      # Run tests

# Frontend
cd frontend
npm run dev       # Development server (port 5173)
npm run build     # Production build
npm run lint      # Lint code
```

---

## Project Structure

```
running-dashboard/
├── backend/          # Express + TypeScript API
│   ├── src/
│   │   ├── api/     # Route definitions
│   │   ├── services/# Business logic
│   │   ├── models/  # Database models
│   │   └── config/  # Configuration
├── frontend/         # React + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
├── docs/             # Documentation
├── scripts/          # Utility scripts
├── docker-compose.yml
└── README.md
```

---

## Coding Standards

### TypeScript

- Use strict mode (`strict: true` in tsconfig)
- Define explicit return types for functions
- Use interfaces over types for objects
- Avoid `any` unless absolutely necessary

### Backend (Express)

- Use async/await, not callbacks
- Centralized error handling middleware
- Validate all inputs (Joi or similar)
- Parameterize SQL queries (prevent SQL injection)
- Structured logging (Winston)

### Frontend (React)

- Functional components with hooks
- TypeScript interfaces for props
- shadcn/ui components when possible
- Recharts for visualizations
- React Query for API state

### Git

- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- One logical change per commit
- Write descriptive commit messages
- Don't commit secrets or .env files

---

## Testing

### Backend Tests

```bash
cd backend
npm test
```

Use Jest. Test files: `*.test.ts` or `*.spec.ts`.

Focus on:
- API endpoints (integration)
- Service logic (unit)
- Database operations (integration)

### Frontend Tests

```bash
cd frontend
npm test
```

Use Vitest + Testing Library. Test files: `*.test.tsx`.

Focus on:
- Component rendering
- User interactions
- API integration (mock with MSW)

---

## Review Process

- All PRs require at least one review
- CI/CD checks must pass (build, lint, test)
- Reviews focus on: correctness, performance, security, maintainability
- Be responsive to feedback

---

## Adding Dependencies

### Backend

```bash
cd backend
npm install package-name
npm install -D @types/package-name  # if needed
```

Add to `package.json` if manual edit required.

**Important:** Before adding a package:
- Check if already in dependencies
- Consider weight (avoid heavy deps for small features)
- Ensure active maintenance and good license

### Frontend

```bash
cd frontend
npm install package-name
```

---

## Documentation

- Update README.md for user-facing changes
- Update API docs in `docs/api.md` for endpoint changes
- Add new docs in `docs/` for major features
- Document configuration changes in `docs/configuration.md`
- Keep docstrings/comments in code up to date

---

## Security

- Never commit secrets (tokens, API keys)
- Use `.env` for local dev, Docker secrets for prod
- Sanitize logs (no PII, no tokens)
- Validate all inputs
- Use parameterized queries
- Report security issues privately (GitHub Security Advisory)

---

## Release Process

Releases are automated via GitHub Actions on tag push.

To create a release:
```bash
git tag -a v1.0.0 -m "First stable release"
git push origin v1.0.0
```

GitHub Actions will:
- Build Docker image
- Run tests
- Push to Docker Hub (if configured)
- Create GitHub Release with changelog

---

## Questions?

- Open an issue for discussion
- Check existing issues for similar questions
- See documentation in `docs/`

---

Thank you for contributing!
