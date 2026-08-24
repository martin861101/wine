# Frontend deployment and Apache 403 recovery

Wine & Chapters is a static Vite application hosted by xneelo. Apache must find these items directly inside the domain's `public_html` directory:

- `index.html`
- `.htaccess`
- `assets/`
- the static image and video directories produced by the build

Do not upload the `dist` directory itself, a TanStack server build, or source folders such as `client/` and `server/`. A `public_html` directory without a root `index.html` returns Apache `403 Forbidden` because directory listing is disabled.

## Guarded deployment

Set the FTP credentials in the shell without committing them, then deploy from the repository root:

```sh
export FTP_USER='your-xneelo-ftp-user'
export FTP_PASS='your-xneelo-ftp-password'
npm run deploy:frontend
```

The deployment command:

1. Resolves the UI directory independently of the current working directory.
2. Builds the Vite static site into `ui/dist`.
3. Refuses to upload unless `index.html`, `.htaccess`, and `assets/` are present.
4. Mirrors the contents of `ui/dist/` into `/public_html/`.
5. Confirms that the remote `index.html` and `.htaccess` exist.

The upload uses `--delete`, so remote files that are not in the current static build are removed. The preflight checks are therefore mandatory and must not be bypassed.

## Verification

After deployment, check the homepage and one client-side route:

```sh
curl -I https://wineandchapters.co.za/
curl -I https://wineandchapters.co.za/about
```

Both should return a successful response. The `/about` request also verifies that `.htaccess` is applying the single-page application rewrite.

## Recovering from 403 Forbidden

1. Inspect `/public_html/` using xneelo File Manager or FTP.
2. Remove or replace an incorrect server build only through the guarded deploy command.
3. Confirm `index.html` and `.htaccess` are directly under `/public_html/`.
4. Confirm directories are traversable by Apache and files are readable.
5. Run the HTTP verification commands above.

If a root `index.html` is present and Apache still returns 403, inspect the hosting control-panel error log for a permissions or `.htaccess` directive error before changing application code.
