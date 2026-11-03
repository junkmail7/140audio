# 140 Audio — website

Static site, no database, no server. Hosting is free on Cloudflare Pages, and the admin panel is free via Pages CMS.

```
public/            ← the website (this is what gets deployed)
  content/*.json   ← ALL editable content (bands, tracks, socials, about…)
  media/           ← uploaded audio / images land here
  assets/          ← CSS, JS, favicon (code — dev-maintained)
.pages.yml         ← admin panel config (which fields are editable)
```

## Run locally
```
npx serve public -l 4140
```
Open http://localhost:4140

## Who edits what
- **Studio owner** logs into the admin at https://app.pagescms.org with GitHub. They can add, edit and delete bands, tracks, socials, services and the about text, and upload MP3s and photos. They only ever touch `public/content/` and `public/media/`.
- **Developer** owns everything else (HTML/CSS/JS/config). The JS is defensive: blank or missing fields just hide that piece instead of breaking the page.
- Every save in the CMS is a git commit, so any bad edit can be rolled back.

## Deploy (one-time, ~20 min)
1. **GitHub**: create a repo (private is fine) and push this folder. Add the studio owner as a collaborator with Write access.
2. **Cloudflare Pages**: go to dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → pick the repo.
   - Framework preset: *None*
   - Build command: *(leave empty)*
   - Build output directory: `public`
   Every push or CMS save auto-deploys in about 30 seconds.
3. **Domain**: in the Pages project, open Custom domains → add his domain. The easiest route is moving the domain's DNS to Cloudflare (free); otherwise add the CNAME it shows you at the current registrar.
4. **Contact form**: go to https://web3forms.com, enter the inbox that should get inquiries, and copy the access key into the admin under *Site settings → Web3Forms access key*. Until then the form shows as WIP/disabled.
5. **Admin**: both of you sign in at https://app.pagescms.org with GitHub and open the repo. It reads `.pages.yml` automatically.

## Adding work
- **YouTube / Spotify / SoundCloud**: paste the normal share link and it auto-embeds.
- **Bandcamp**: shows as a "Listen on Bandcamp" link (Bandcamp URLs can't be auto-embedded).
- **Own files**: upload an MP3 in the track's "Or upload audio/video" field. Keep files under 25MB (Cloudflare's per-file limit); MP3 320k is ideal. If he ever needs lots of big files, move them to Cloudflare R2 (10GB free) and paste the URLs instead.
- **WIP banners**: the "WIP note" field on Work and Bands shows a banner. Clear it when the page is done.

## TODO (need from him)
- [ ] Full band list + roles, genres, links
- [ ] SoundCloud / Spotify / studio tracks
- [ ] Instagram + other socials, public email, location
- [ ] Web3Forms key
- [ ] Real about text and photo (current text is a placeholder)
- [ ] Logo (currently a text wordmark)
