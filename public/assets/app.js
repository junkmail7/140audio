/* 140 Audio — content is loaded from /content/*.json (edited via Pages CMS). */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  // Site root, derived from where app.js lives, so the site works at / or /some-subfolder/.
  const BASE = new URL("../", document.currentScript?.src || location.href);
  const rel = (path) => new URL(String(path).replace(/^\/+/, ""), BASE).href;

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // Only allow http(s) links or site-relative media paths.
  const safeUrl = (v) => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    if (s.startsWith("/") && !s.startsWith("//")) return rel(s);
    try {
      const u = new URL(s);
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
    } catch {
      return "";
    }
  };

  const load = async (name) => {
    try {
      const res = await fetch(rel(`content/${name}.json`), { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (e) {
      console.warn(`[140] could not load ${name}.json`, e);
      return {};
    }
  };

  const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

  /* ---------- Media parsing ---------- */
  const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus)(\?.*)?$/i;
  const VIDEO_EXT = /\.(mp4|webm|mov)(\?.*)?$/i;

  function parseMedia(raw) {
    const url = safeUrl(raw);
    if (!url) return null;
    if (AUDIO_EXT.test(url)) return { type: "audio", src: url };
    if (VIDEO_EXT.test(url)) return { type: "video", src: url };
    let u;
    try { u = new URL(url, location.origin); } catch { return null; }
    const host = u.hostname.replace(/^(www|m|music)\./, "");
    const parts = u.pathname.split("/").filter(Boolean);

    if (host === "youtu.be" && parts[0]) return { type: "youtube", id: parts[0] };
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const pl = u.searchParams.get("list");
      const v = u.searchParams.get("v");
      if (v) return { type: "youtube", id: v };
      if (["shorts", "embed", "live"].includes(parts[0]) && parts[1] && parts[1] !== "videoseries")
        return { type: "youtube", id: parts[1] };
      if (pl) return { type: "youtube-list", list: pl };
      return { type: "link", src: url, label: "Watch on YouTube" };
    }
    if (host === "open.spotify.com") {
      const p = parts[0]?.startsWith("intl-") ? parts.slice(1) : parts;
      const kind = p[0] === "embed" ? p[1] : p[0];
      const id = p[0] === "embed" ? p[2] : p[1];
      if (["track", "album", "playlist", "episode", "show", "artist"].includes(kind) && id)
        return { type: "spotify", src: `https://open.spotify.com/embed/${kind}/${id}?theme=0`, height: kind === "track" || kind === "episode" ? 152 : 352 };
    }
    if (host === "soundcloud.com" || host === "on.soundcloud.com") {
      const isSet = parts.includes("sets");
      const q = new URLSearchParams({ url, color: "#c8412f", auto_play: "false", hide_related: "true", show_comments: "false", show_user: "true", show_reposts: "false", visual: "false" });
      return { type: "soundcloud", src: `https://w.soundcloud.com/player/?${q}`, height: isSet ? 360 : 166 };
    }
    if (host.endsWith("bandcamp.com")) return { type: "link", src: url, label: "Listen on Bandcamp" };
    return { type: "link", src: url, label: "Listen" };
  }

  const bars = (n = 64) => {
    let out = "";
    for (let i = 0; i < n; i++) {
      const h = 18 + Math.abs(Math.sin(i * 0.53) * 50 + Math.sin(i * 1.7) * 28);
      out += `<i style="height:${Math.min(100, h).toFixed(0)}%"></i>`;
    }
    return out;
  };

  const PLAY = '<span class="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l15 8-15 8z"/></svg></span>';

  function renderEmbed(raw, title = "") {
    const m = parseMedia(raw);
    if (!m) return "";
    const t = esc(title);
    switch (m.type) {
      case "youtube": {
        const id = esc(m.id.replace(/[^\w-]/g, ""));
        return `<div class="embed embed-16x9"><button class="yt-lite" data-yt="${id}" aria-label="Play ${t}" style="background-image:url('https://i.ytimg.com/vi/${id}/hqdefault.jpg')">${PLAY}</button></div>`;
      }
      case "youtube-list":
        return `<div class="embed embed-16x9"><iframe loading="lazy" title="${t}" src="https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(m.list)}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
      case "spotify":
      case "soundcloud":
        return `<div class="embed"><iframe loading="lazy" title="${t}" src="${esc(m.src)}" height="${m.height}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>`;
      case "audio":
        return `<div class="audio-embed"><div class="bars" aria-hidden="true">${bars()}</div><audio controls preload="none" src="${esc(m.src)}"></audio></div>`;
      case "video":
        return `<div class="embed embed-16x9"><video controls preload="metadata" src="${esc(m.src)}" style="width:100%;height:100%"></video></div>`;
      default:
        return `<div class="link-embed"><a href="${esc(m.src)}" target="_blank" rel="noopener">${esc(m.label)} ↗</a></div>`;
    }
  }

  // Click-to-load YouTube (keeps pages fast; no YouTube JS until play).
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".yt-lite");
    if (!btn) return;
    const id = btn.dataset.yt;
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    f.title = btn.getAttribute("aria-label") || "YouTube video";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    btn.replaceWith(f);
  });

  /* ---------- Hand-drawn service icons ---------- */
  const ICON_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <pattern id="ht" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.25" fill="currentColor" opacity=".5"/></pattern>
    <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
  </defs></svg>`;
  const wavePath = (() => {
    let d = "";
    for (let x = 34; x <= 126; x += 4.6) {
      const env = Math.sin(((x - 34) / 92) * Math.PI);
      const a = 4 + env * (14 + 20 * Math.abs(Math.sin(x * 0.37)));
      d += `M${x.toFixed(1)} ${(80 - a).toFixed(1)}V${(80 + a).toFixed(1)}`;
    }
    return d;
  })();
  const GLYPHS = {
    mic: `<rect class="pf" x="64" y="32" width="32" height="58" rx="16"/><path d="M64 52h32M64 62h32M64 72h32" stroke-width="3"/><path d="M50 72v6a30 30 0 0 0 60 0v-6M80 108v16M62 126h36" fill="none"/>`,
    faders: `<path d="M50 38v84M70 38v84M90 38v84M110 38v84" stroke-width="3.5"/><rect class="pf" x="42" y="86" width="16" height="12"/><rect class="pf" x="62" y="54" width="16" height="12"/><rect class="pf" x="82" y="96" width="16" height="12"/><rect class="pf" x="102" y="46" width="16" height="12"/>`,
    wave: `<path d="M30 80h100" stroke-width="2.5"/><path d="${wavePath}" stroke-width="3.4" stroke-linecap="round"/>`,
    camera: `<circle class="pf" cx="54" cy="46" r="12"/><circle class="pf" cx="84" cy="46" r="12"/><rect class="pf" x="36" y="60" width="66" height="44" rx="3"/><circle class="pf" cx="69" cy="82" r="13"/><circle cx="69" cy="82" r="4" fill="currentColor"/><path d="M102 74l22-12v40l-22-12z" fill="currentColor"/>`,
    amp: `<rect class="pf" x="34" y="50" width="92" height="60" rx="4"/><path d="M34 66h92" /><path d="M44 58h4M54 58h4M64 58h4" stroke-width="3"/><rect x="44" y="74" width="72" height="28" fill="url(#ht)" stroke-width="3"/>`,
  };
  const ICON_ALIASES = { record: "mic", recording: "mic", mix: "faders", mixing: "faders", master: "wave", mastering: "wave", live: "camera", video: "camera" };
  function icon(key) {
    const k = String(key || "").toLowerCase().trim();
    const name = GLYPHS[k] ? k : ICON_ALIASES[k] || ICON_ALIASES[k.split(/\s+/)[0]] || "amp";
    return `<svg viewBox="0 0 160 160" aria-hidden="true"><g filter="url(#rough)" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round">
      <circle cx="80" cy="80" r="70" fill="url(#ht)"/>${GLYPHS[name]}</g></svg>`;
  }

  /* ---------- Shared pieces ---------- */
  const SOCIAL_LABELS = {
    youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", x: "X",
    twitter: "X", bandcamp: "Bandcamp", soundcloud: "SoundCloud", spotify: "Spotify",
    threads: "Threads", bluesky: "Bluesky", website: "Website",
  };

  const tags = (...items) =>
    items.filter((t) => t && t.v).map((t) => `<span class="tag${t.strong ? " strong" : ""}">${esc(t.v)}</span>`).join("");

  const wip = (note) => (note ? `<div class="wip"><b>WIP</b><span>${esc(note)}</span></div>` : "");

  const empty = (title, msg) => `<div class="empty"><strong>${esc(title)}</strong>${esc(msg)}</div>`;

  function trackCard(t) {
    const src = t.file || t.url;
    return `<article class="card">
      ${renderEmbed(src, `${t.artist || ""} — ${t.title || ""}`)}
      <div class="card-body">
        ${t.artist ? `<div class="card-artist">${esc(t.artist)}</div>` : ""}
        ${t.title ? `<p class="card-title">${esc(t.title)}</p>` : ""}
        <div class="tags">${tags({ v: t.role, strong: true }, { v: t.genre }, { v: t.year })}</div>
      </div>
    </article>`;
  }

  function renderChrome(site) {
    const page = document.body.dataset.page;
    document.querySelectorAll(".nav a").forEach((a) => {
      if (a.dataset.page === page) a.setAttribute("aria-current", "page");
    });
    const socials = list(site.socials)
      .map((s) => ({ ...s, href: safeUrl(s.url) }))
      .filter((s) => s.href)
      .map((s) => `<a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(SOCIAL_LABELS[s.platform] || s.platform || "Link")}</a>`)
      .join("");
    const footer = $(".site-footer .wrap");
    if (footer) {
      footer.innerHTML = `
        <div class="foot-left"><a class="stamp" href="${rel("")}" aria-label="140 Audio home"><b>140</b><i>Audio</i></a>
          <p class="meta" style="margin:0">© ${new Date().getFullYear()} ${esc(site.studio_name || "140 Audio")}${site.location ? " · " + esc(site.location) : ""}</p></div>
        <div class="socials">${socials}${site.email ? `<a href="mailto:${esc(site.email)}">Email</a>` : ""}</div>`;
    }
  }

  /* ---------- Pages ---------- */
  const pages = {
    async home(site) {
      const [{ tracks }, { bands }] = await Promise.all([load("tracks"), load("bands")]);
      const heroImg = safeUrl(site.hero_image);
      if (heroImg) $("#hero-bg").style.backgroundImage = `url("${heroImg.replace(/"/g, "%22")}")`;
      $("#hero-line").textContent = site.hero_line || "";
      $("#hero-loc").textContent = site.location || "";

      const svc = list(site.services);
      $("#services").innerHTML = svc.length
        ? ICON_DEFS + svc.map((s) => `<div class="service">${icon(s.icon || s.name)}<h3>${esc(s.name)}</h3><p>${esc(s.description)}</p></div>`).join("")
        : "";
      if (!svc.length) $("#services-section").remove();

      const all = list(tracks);
      const featured = (all.filter((t) => t.featured).length ? all.filter((t) => t.featured) : all).slice(0, 3);
      $("#featured").innerHTML = featured.length ? featured.map(trackCard).join("") : empty("Coming soon", "Portfolio is being put together.");

      const names = list(bands).map((b) => b.name).filter(Boolean);
      $("#band-roll").innerHTML = names.length
        ? names.map((n, i) => `<li><span>${String(i + 1).padStart(2, "0")}</span>${esc(n)}</li>`).join("")
        : `<li style="color:var(--text-faint)">List coming soon</li>`;

      if (site.youtube_channel_id && /^UC[\w-]{22}$/.test(site.youtube_channel_id)) {
        const uploads = "UU" + site.youtube_channel_id.slice(2);
        $("#channel").innerHTML = `<iframe loading="lazy" title="Latest uploads" src="https://www.youtube-nocookie.com/embed/videoseries?list=${uploads}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
      } else {
        $("#channel-section").remove();
      }
      const yt = list(site.socials).find((s) => s.platform === "youtube");
      if (yt && safeUrl(yt.url)) $("#channel-link").href = safeUrl(yt.url);
    },

    async work() {
      const { tracks, note } = await load("tracks");
      const all = list(tracks);
      $("#wip").innerHTML = wip(note);
      $("#tracks").innerHTML = all.length ? all.map(trackCard).join("") : empty("WIP", "Tracks and videos coming soon.");
    },

    async bands() {
      const { bands, note } = await load("bands");
      const all = list(bands);
      $("#wip").innerHTML = wip(note);
      $("#bands").innerHTML = all.length
        ? all.map((b, i) => {
            const work = b.show_work && b.embed_url ? renderEmbed(b.embed_url, b.name) : "";
            const link = safeUrl(b.url);
            return `<article class="band-row${work ? " has-work" : ""}">
              <div>
                <span class="num">${String(i + 1).padStart(2, "0")}</span>
                <h3>${esc(b.name)}</h3>
                <div class="tags">${tags({ v: b.role, strong: true }, { v: b.genre }, { v: b.year })}</div>
                ${link ? `<div class="links"><a href="${esc(link)}" target="_blank" rel="noopener">Band link ↗</a></div>` : ""}
              </div>
              ${work}
            </article>`;
          }).join("")
        : empty("WIP", "Band list coming soon.");
    },

    async about() {
      const about = await load("about");
      if (about.heading) $("#about-heading").textContent = about.heading;
      const paras = String(about.body || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      const photo = safeUrl(about.photo);
      $("#about").classList.toggle("has-photo", !!photo);
      $("#about").innerHTML = `
        ${photo ? `<div class="about-photo"><img src="${esc(photo)}" alt=""></div>` : ""}
        <div class="about-body">${paras.length ? paras.map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("") : wip("About section coming soon.")}</div>`;
    },

    async contact(site) {
      const form = $("#inquiry");
      const status = $("#form-status");
      const aside = $("#contact-details");
      const rows = [];
      if (site.email) rows.push(`<div><dt class="meta">Email</dt><dd><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></dd></div>`);
      if (site.location) rows.push(`<div><dt class="meta">Location</dt><dd>${esc(site.location)}</dd></div>`);
      const socials = list(site.socials).filter((s) => safeUrl(s.url));
      if (socials.length)
        rows.push(`<div><dt class="meta">Elsewhere</dt><dd>${socials.map((s) => `<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(SOCIAL_LABELS[s.platform] || s.platform)}</a>`).join(" · ")}</dd></div>`);
      aside.innerHTML = rows.join("") || wip("Contact details coming soon.");

      if (!site.contact_form_key) {
        form.querySelectorAll("input, select, textarea, button").forEach((el) => (el.disabled = true));
        status.innerHTML = site.email
          ? `The form isn’t switched on yet — email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a> instead.`
          : "WIP — the inquiry form isn’t switched on yet.";
        return;
      }
      form.access_key.value = site.contact_form_key;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        status.className = "form-status";
        status.textContent = "Sending…";
        const data = Object.fromEntries(new FormData(form));
        data.subject = `New inquiry from ${data.name || "the website"}${data.project ? " — " + data.project : ""}`;
        data.from_name = "140 Audio website";
        try {
          const res = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(data),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || json.success === false) throw new Error(json.message || res.status);
          form.reset();
          status.className = "form-status ok";
          status.textContent = "Got it — you’ll hear back soon.";
        } catch (err) {
          console.warn("[140] form error", err);
          status.className = "form-status err";
          status.innerHTML = `Something broke sending that.${site.email ? ` Email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a> directly.` : " Try again in a minute."}`;
        } finally {
          btn.disabled = false;
        }
      });
    },
  };

  (async () => {
    const site = await load("site");
    renderChrome(site);
    const fn = pages[document.body.dataset.page];
    if (fn) await fn(site);
  })();
})();
