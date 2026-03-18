# AISI Altmetric Dashboard

Tracks Altmetric scores for all AISI research papers, auto-discovered from
aisi.gov.uk/research.

## Prerequisites

- Node.js 18+

## First-time setup

1. Discover papers:
   ```
   node scrape.js
   ```
   (Takes ~3 minutes — fetches each research page at 500ms intervals)

2. Start local server:
   ```
   npx serve .
   ```

3. Open http://localhost:3000 in browser

## Keeping the paper list fresh

`papers.json` is committed to the repo. Update it manually or set up the
weekly scheduler below.

### Manual update
```
node scrape.js
```
Takes ~3 min. Commit the updated `papers.json` if working in a shared repo.

### Automated weekly update (recommended)

#### macOS — launchd (recommended over cron — handles sleep/wake correctly)

Create `~/Library/LaunchAgents/com.aisi.altmetric-scraper.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.aisi.altmetric-scraper</string>
  <key>ProgramArguments</key>
  <array>
    <string>/REPLACE/WITH/node/PATH</string>
    <string>/REPLACE/WITH/ABSOLUTE/PATH/TO/altmetric-dashboard/scrape.js</string>
    <string>--check</string>
    <string>--silent</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key><integer>1</integer>
    <key>Hour</key><integer>9</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/REPLACE/WITH/ABSOLUTE/PATH/TO/altmetric-dashboard/.scrape-log</string>
  <key>StandardErrorPath</key>
  <string>/REPLACE/WITH/ABSOLUTE/PATH/TO/altmetric-dashboard/.scrape-log</string>
</dict>
</plist>
```

Before loading:
1. Run `which node` and replace `/REPLACE/WITH/node/PATH` with the result
2. Run `pwd` in this folder and replace the `/REPLACE/WITH/ABSOLUTE/PATH/TO/` placeholders
3. Load it:
   ```
   launchctl load ~/Library/LaunchAgents/com.aisi.altmetric-scraper.plist
   ```
4. To stop:
   ```
   launchctl unload ~/Library/LaunchAgents/com.aisi.altmetric-scraper.plist
   ```

#### macOS / Linux — cron (alternative)

```
crontab -e
```

Add (runs every Monday 9am — replace node path with output of `which node`):

```
0 9 * * 1 cd /ABSOLUTE/PATH/TO/altmetric-dashboard && /usr/local/bin/node scrape.js --check --silent
```

Note: cron may not fire if the machine is asleep at 9am — launchd handles this
more gracefully on macOS.

### If the dashboard shows a staleness warning
Run `node scrape.js` to clear it.

## Refreshing Altmetric scores

Click "Refresh all" in the dashboard. Scores cached longer than 24h are
automatically re-fetched in the background when you open the dashboard.

## CLI flags (scrape.js)

| Flag | Effect |
|------|--------|
| *(none)* | Full scrape, full output |
| `--dry-run` | Fetch listing only, print entry URLs, don't fetch pages |
| `--check` | Skip if `papers.json` < 7 days old |
| `--check --days 3` | Skip if `papers.json` < 3 days old |
| `--silent` | Suppress progress lines; still prints errors and final summary |
| `--check --silent` | Safe for cron/launchd |

## Non-arXiv papers

Some AISI outputs don't have arXiv links (e.g. the Frontier AI Trends Report).
These appear in the dashboard with a "no arXiv link" indicator — Altmetric
scores are not available for them via the free API.

## Notes

- `papers.json` contains only scraped public data — safe to commit
- `.scrape-log` is gitignored (local only)
- No API keys required — Altmetric free API is used throughout
- The Altmetric free API allows ~1 request/second; the dashboard queues
  fetches accordingly
