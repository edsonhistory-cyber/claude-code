# sfx-sources

A [Claude Code](https://claude.com/claude-code) / Agent Skill for finding and downloading free sound effects (音效 / 拟音 / SFX) from:

| Source | Good for | Format | License |
|---|---|---|---|
| [Mixkit](https://mixkit.co/free-sound-effects/) | general SFX | wav | Mixkit free license |
| [Kenney](https://kenney.nl/assets/category:Audio) | UI / game packs | ogg | CC0 |
| [Freesound](https://freesound.org) | rare foley | mp3 preview | CC0 / CC-BY / … (credit non-CC0) |
| [Pixabay](https://pixabay.com/sound-effects/) | huge catalog, ranked by likes | mp3 | Pixabay Content License (no credit needed) |

Python 3 stdlib only — no API keys. The one exception is Pixabay (behind Cloudflare): on first use the script builds a private venv with [`curl_cffi`](https://github.com/lexiforest/curl_cffi) in `~/.cache/sfx-sources/venv` and re-runs itself there.

## Install

**As a Claude Code plugin**

```
/plugin marketplace add sxhzju/sfx
/plugin install sfx-sources@sfx
```

**As a plain skill** (Claude Code, or any agent that reads `SKILL.md`)

```bash
git clone https://github.com/sxhzju/sfx /tmp/sfx
cp -R /tmp/sfx/skills/sfx-sources ~/.claude/skills/        # personal
# or: cp -R /tmp/sfx/skills/sfx-sources .claude/skills/   # per project
```

Or with [`skills`](https://github.com/vercel-labs/skills): `npx skills add sxhzju/sfx`

## Usage

Just ask, e.g. *"add a whoosh and a glass-break sound to ./sfx"*. Claude will search, let you audition previews, and download.

The CLI also works on its own:

```bash
S=skills/sfx-sources/scripts/sfx.py
python3 $S mixkit whoosh                  # search Mixkit by tag
python3 $S kenney                         # list Kenney audio packs
python3 $S kenney interface-sounds        # list files in a pack
python3 $S freesound "door creak" --license cc0 --urls
python3 $S pixabay "glass break"           # top results by ♥ likes (--pages 3 × 20 relevance pages)
python3 $S get ./sfx mk:1234 fs:56789 px:24680 kn:interface-sounds/Audio/click_001.ogg
```

Downloaded files are named `<source>_<id>_<title>.<ext>`; `get` prints `credit <author>` for Freesound sounds that require attribution.

## License

MIT for the code in this repo. Sounds you download are governed by each source's own license.
