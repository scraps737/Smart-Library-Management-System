# Taste

## Workflow

- Wants project setup/startup to work as one simple command (rather than several separate install/run steps). Confidence: 0.75
- Don't blindly run `npm audit fix --force` to clear vulnerabilities — verify the fix doesn't introduce bugs. Confidence: 0.6
- Prefers simple, minimal solutions over elaborate ones — explicitly pushes back when a setup/script feels "too complex", favoring a small number of files and no flag/option sprawl. Confidence: 0.75
- Runs multiple projects locally at once, so prefers projects to bind non-default ports (rather than the usual 4000/5173) and to fail with a clear message instead of a stack trace when a port is taken. Confidence: 0.7
