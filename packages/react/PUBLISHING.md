# Publier @msyx-dev/react

Ce package est publié automatiquement sur **GitHub Packages** (registry privé org `msyx-dev`) via le workflow `.github/workflows/publish-react.yml` quand un tag semver est poussé.

## Procédure

1. Bump version dans `packages/react/package.json` (suivre semver) :
   - Alpha : `3.0.0-alpha.0` → `3.0.0-alpha.1`
   - Release : `3.0.0-alpha.X` → `3.0.0`
   - Patch : `3.0.0` → `3.0.1`

2. Commit le bump :
   ```bash
   git add packages/react/package.json
   git commit -m "chore(react): bump v3.0.0-alpha.1"
   git push origin main
   ```

3. Tagger et pousser :
   ```bash
   git tag -a v3.0.0-alpha.1 -m "Release @msyx-dev/react v3.0.0-alpha.1"
   git push origin v3.0.0-alpha.1
   ```

4. Le workflow `Publish @msyx-dev/react` se déclenche, lance install + build + tests + vérif tag/version + publish.

## Garde-fou tag ↔ version

Le workflow refuse de publier si le tag (`vX.Y.Z`) ne correspond pas à `package.json.version`. Bump → commit → tag toujours dans cet ordre.

## Installer dans un consumer

```bash
# .npmrc (racine du consumer) :
@msyx-dev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}

# install
npm install @msyx-dev/react
# ou
pnpm add @msyx-dev/react
```

Le `GITHUB_TOKEN` doit avoir le scope `read:packages` et appartenir à un user membre de l'org `msyx-dev`.

## Vérifier la publication

```bash
gh api /orgs/msyx-dev/packages/npm/react/versions --jq '.[].name'
```
