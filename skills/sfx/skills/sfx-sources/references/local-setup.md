Scripts are stdlib-only (except Pixabay, below). Cache: `~/.cache/sfx-sources`.

Pixabay (pixabay.com) sits behind Cloudflare, which 403s plain urllib. `pixabay` / `get px:…` re-exec the script under a private venv (`~/.cache/sfx-sources/venv`, created on first use with `pip install curl_cffi`) that impersonates Chrome's TLS. Needs `python3 -m venv` + pip access once. 403s are sporadic and retried; persistent 403 means Cloudflare tightened.

Freesound (freesound.org):
- It caps every connection at ~80 KB/s; parallelise via one `get`.
- Originals need an API key + OAuth2 (not supported); previews (~190 kbps mp3) are what `get` downloads.
