#!/bin/bash
# Deploy dist/ to gh-pages from an ISOLATED worktree.
# Never manipulate the gh-pages branch inside the main checkout: its files live
# at the repo root, so any "clean the root" step there deletes the real tree.
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
WT="$(mktemp -d)/erna-pages"
ORIGIN="${PREVIEW_ORIGIN:-https://sindrimar02.github.io/erna-preview}"

PREVIEW_ORIGIN="$ORIGIN" node "$REPO/src/build.mjs"

git -C "$REPO" worktree add --detach -q "$WT"
cd "$WT"
# the local gh-pages ref may still exist from a previous run
git branch -D gh-pages >/dev/null 2>&1 || true
git checkout -q --orphan gh-pages
git rm -rq --cached . >/dev/null 2>&1 || true
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$REPO/dist/." .
touch .nojekyll
git add -A
git -c user.email=sindri@klubbr.is -c user.name="Sindri Már" commit -q -m "Deploy $(git -C "$REPO" rev-parse --short HEAD) (noindex)"
git push -q -f origin gh-pages
cd "$REPO"
git worktree remove --force "$WT"
echo "deployed $(ls "$REPO/dist" | wc -l | tr -d ' ') top-level entries to gh-pages"
