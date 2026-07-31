/* [Nextendo] Download page — fetches the latest public GitHub release and points each platform
   card at its asset. The repo is public so this works anonymously; on any failure (rate limit,
   offline) the cards keep their default href to the releases page, so a download is always one
   click away. Asset URLs are validated to the project's own github.com path before being used.
   The version label is the only language-dependent string, so it is re-applied on language change. */
(function () {
  "use strict";

  var REPO = "NextendoNetwork/Ryujinx-Nextendo";
  var RELEASES = "https://github.com/" + REPO + "/releases/latest";
  var API = "https://api.github.com/repos/" + REPO + "/releases/latest";

  var MATCH = {
    win: /win_x64\.zip$/i,
    linux: /linux_x64\.tar\.gz$/i,
    mac: /macos.*\.tar\.gz$/i
  };

  var cards = {};
  var list = document.querySelectorAll(".dl-card[data-platform]");
  for (var i = 0; i < list.length; i++) {
    cards[list[i].getAttribute("data-platform")] = list[i];
  }
  var versionEl = document.getElementById("dl-version");
  var fallbackEl = document.getElementById("dl-fallback");

  var state = { version: null, fallback: false }; // version string once known; fallback on failure

  function t(key, fb) {
    var v = window.NXI18N && typeof window.NXI18N.t === "function" ? window.NXI18N.t(key) : null;
    return v || fb;
  }

  function isSafe(url) {
    return typeof url === "string" &&
      url.indexOf("https://github.com/" + REPO + "/releases/download/") === 0;
  }

  function fmtSize(bytes) {
    return bytes ? Math.round(bytes / 1048576) + " MB" : "";
  }

  // Language-dependent; re-run on language change.
  function applyVersion() {
    if (!versionEl) { return; }
    if (state.fallback) {
      versionEl.textContent = t("download.fallbackVersion", "Latest version on GitHub");
    } else if (state.version) {
      versionEl.textContent = t("download.version", "Latest version") + " " + state.version;
    } else {
      versionEl.textContent = t("download.loading", "Looking for the latest version…");
    }
  }

  try {
    new MutationObserver(applyVersion).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  } catch (e) { /* MutationObserver unsupported */ }

  fetch(API, { headers: { "Accept": "application/vnd.github+json" }, cache: "no-store" })
    .then(function (r) { if (!r.ok) { throw new Error("http"); } return r.json(); })
    .then(function (rel) {
      var assets = (rel && rel.assets) || [];
      state.version = rel && typeof rel.tag_name === "string" ? rel.tag_name : "";

      var anyFound = false;
      Object.keys(cards).forEach(function (plat) {
        var card = cards[plat];
        var re = MATCH[plat];
        var asset = null;
        for (var j = 0; j < assets.length; j++) {
          if (re.test(String(assets[j].name || ""))) { asset = assets[j]; break; }
        }
        if (asset && isSafe(asset.browser_download_url)) {
          card.setAttribute("href", asset.browser_download_url);
          card.removeAttribute("target");
          card.setAttribute("download", "");
          var sizeEl = card.querySelector(".dl-card__size");
          if (sizeEl) { sizeEl.textContent = fmtSize(asset.size); }
          anyFound = true;
        }
      });

      if (!anyFound) { state.fallback = true; if (fallbackEl) { fallbackEl.hidden = false; } }
      applyVersion();
    })
    .catch(function () {
      state.fallback = true;
      if (fallbackEl) { fallbackEl.hidden = false; }
      applyVersion();
    });

  applyVersion();
})();
