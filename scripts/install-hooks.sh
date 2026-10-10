#!/bin/bash
# Install local git hooks for renault-r5-lovelace.
# Run once after cloning: ./scripts/install-hooks.sh
set -e

ROOT=$(git rev-parse --show-toplevel)
HOOK="$ROOT/.git/hooks/pre-commit"

cat > "$HOOK" <<'HOOK_EOF'
#!/bin/bash
set -e

ROOT=$(git rev-parse --show-toplevel)
STAGED=$(git diff --cached --name-only --diff-filter=ACMR)

if echo "$STAGED" | grep -qE "^src/|\.(ts|js|json)$"; then
  echo "⚡ Card: lint + typecheck + tests..."
  cd "$ROOT"
  if [ -d node_modules ]; then
    npm run lint --silent
    npm run typecheck --silent
    npm test --silent
  else
    echo "  (skipping — node_modules missing; run \`npm install\` to enable.)"
  fi
fi

echo "✅ All checks passed."
HOOK_EOF

chmod +x "$HOOK"
echo "Installed pre-commit hook → $HOOK"
