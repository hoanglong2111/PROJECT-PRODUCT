# GitHub Push Commands

Target account:

```text
https://github.com/hoanglong2111
```

Suggested repository name:

```text
PROJECT-PRODUCT
```

## 1. Create The GitHub Repository

Create an empty repository on GitHub:

```text
https://github.com/new
```

Use:

```text
Owner: hoanglong2111
Repository name: PROJECT-PRODUCT
Visibility: Private or Public
Initialize with README: No
Add .gitignore: No
Choose a license: No
```

## 2. Check Local Safety

```bash
git status --short
git check-ignore .env
git check-ignore .env.example || true
```

Expected:

- `.env` is ignored.
- `.env.example` is not ignored and can be committed.

## 3. Commit Current Project

```bash
git add .
git status --short
git commit -m "Initial KBFE logistics control tower app"
```

## 4. Connect Remote

Use HTTPS:

```bash
git remote add origin https://github.com/hoanglong2111/PROJECT-PRODUCT.git
git remote -v
```

If `origin` already exists:

```bash
git remote set-url origin https://github.com/hoanglong2111/PROJECT-PRODUCT.git
git remote -v
```

## 5. Push To GitHub

```bash
git branch -M main
git push -u origin main
```

## 6. After Push

Verify on GitHub:

```text
https://github.com/hoanglong2111/PROJECT-PRODUCT
```

## Optional: Tag Current Version

```bash
git tag -a v0.1.0 -m "Initial deploy-ready version"
git push origin v0.1.0
```
