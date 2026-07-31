/* ==========================================================================
   Nextendo Network — couche UI partagée (chargée sur TOUTES les pages).
   1) i18n : détecte la langue, traduit tout [data-i18n], sélecteur de langue,
      support RTL (arabe). Aucune donnée envoyée à un tiers : la langue vient
      de localStorage puis de la locale du navigateur (navigator.language).
   2) Header : si connecté (NX.token), remplace « Connexion / Créer un compte »
      par la photo de profil Nextendo + un menu (Mon compte, Déconnexion).
   Dépend de app.js (objet NX) chargé AVANT ce fichier.
   ========================================================================== */
(function () {
  "use strict";

  /* ---- langues proposées (les plus parlées au monde + communauté) ---- */
  const LANGS = [
    { code: "en", name: "English",   flag: "🇬🇧" },
    { code: "es", name: "Español",   flag: "🇪🇸" },
    { code: "fr", name: "Français",  flag: "🇫🇷" },
    { code: "pt", name: "Português", flag: "🇧🇷" },
    { code: "de", name: "Deutsch",   flag: "🇩🇪" },
    { code: "it", name: "Italiano",  flag: "🇮🇹" },
    { code: "ru", name: "Русский",   flag: "🇷🇺" },
    { code: "zh", name: "中文",       flag: "🇨🇳" },
    { code: "ja", name: "日本語",      flag: "🇯🇵" },
    { code: "ar", name: "العربية",    flag: "🇸🇦" },
  ];
  const RTL = new Set(["ar"]);
  const SUPPORTED = new Set(LANGS.map((l) => l.code));
  const FALLBACK = "en";

  /* ---- table des traductions (remplie par les blocs T.add plus bas) ---- */
  const T = {}; // T[lang][key] = "texte"
  LANGS.forEach((l) => (T[l.code] = {}));
  // Fusionne un dictionnaire {key:{lang:txt}} OU {lang:{key:txt}} — on utilise
  // la forme par-clé (plus lisible pour traduire), regroupée par langue ici.
  function addByKey(dict) {
    for (const key in dict) {
      const per = dict[key];
      for (const lang in per) {
        if (T[lang]) T[lang][key] = per[lang];
      }
    }
  }
  function addByLang(lang, dict) {
    if (!T[lang]) return;
    Object.assign(T[lang], dict);
  }
  // Exposé pour que d'autres fichiers (ou blocs) enrichissent la table.
  window.NXI18N = { addByKey, addByLang, T, LANGS };

  /* ---- détection de la langue ---- */
  function detectLang() {
    const saved = localStorage.getItem("nx_lang");
    if (saved && SUPPORTED.has(saved)) return saved;
    const navs = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language || ""];
    for (const l of navs) {
      const two = String(l).slice(0, 2).toLowerCase();
      if (SUPPORTED.has(two)) return two;
    }
    return FALLBACK;
  }

  let CUR = detectLang();

  function tr(key, lang) {
    lang = lang || CUR;
    return (T[lang] && T[lang][key]) || (T[FALLBACK] && T[FALLBACK][key]) || null;
  }

  /* ---- application des traductions au DOM ---- */
  function applyTo(root) {
    root = root || document;
    // texte
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = tr(el.getAttribute("data-i18n"));
      if (v != null) el.textContent = v;
    });
    // innerHTML (chaînes avec balises légères)
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const v = tr(el.getAttribute("data-i18n-html"));
      if (v != null) el.innerHTML = v;
    });
    // attributs : data-i18n-attr="placeholder:key;aria-label:key2;title:key3"
    root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s && s.trim());
        if (!attr || !key) return;
        const v = tr(key);
        if (v != null) el.setAttribute(attr, v);
      });
    });
  }

  function setLang(lang) {
    if (!SUPPORTED.has(lang)) lang = FALLBACK;
    CUR = lang;
    localStorage.setItem("nx_lang", lang);
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", RTL.has(lang) ? "rtl" : "ltr");
    applyTo(document);
    buildSwitcher(); // rafraîchit l'étiquette du sélecteur
    document.dispatchEvent(new CustomEvent("nx:lang", { detail: { lang } }));
  }
  window.NXI18N.setLang = setLang;
  window.NXI18N.t = (key) => tr(key);
  window.NXI18N.lang = () => CUR;

  /* ---- sélecteur de langue (injecté dans le header) ---- */
  function buildSwitcher() {
    const ends = document.querySelectorAll(".nav__end");
    ends.forEach((end) => {
      let sw = end.querySelector(".lang-switch");
      const cur = LANGS.find((l) => l.code === CUR) || LANGS[0];
      if (!sw) {
        sw = document.createElement("div");
        sw.className = "lang-switch";
        end.insertBefore(sw, end.firstChild);
      }
      sw.innerHTML =
        '<button class="lang-switch__btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Language">' +
        '<i class="ph ph-translate" aria-hidden="true"></i>' +
        '<span class="lang-switch__code">' + cur.code.toUpperCase() + "</span>" +
        '<i class="ph ph-caret-down" aria-hidden="true"></i></button>' +
        '<div class="lang-switch__menu" role="menu">' +
        LANGS.map((l) =>
          '<button class="lang-switch__item' + (l.code === CUR ? " is-active" : "") +
          '" role="menuitemradio" aria-checked="' + (l.code === CUR) + '" data-lang="' + l.code + '">' +
          '<span class="lang-switch__code">' + l.code.toUpperCase() + "</span><span>" + l.name + "</span></button>"
        ).join("") +
        "</div>";
      const btn = sw.querySelector(".lang-switch__btn");
      const menu = sw.querySelector(".lang-switch__menu");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = sw.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      menu.querySelectorAll("[data-lang]").forEach((it) =>
        it.addEventListener("click", () => { sw.classList.remove("open"); setLang(it.getAttribute("data-lang")); })
      );
    });
  }
  document.addEventListener("click", () =>
    document.querySelectorAll(".lang-switch.open").forEach((s) => {
      s.classList.remove("open"); const b = s.querySelector(".lang-switch__btn"); if (b) b.setAttribute("aria-expanded", "false");
    })
  );

  /* ==========================================================================
     Header : photo de profil quand connecté (remplace Connexion/Créer un compte)
     ========================================================================== */
  function initial(name) { return (name || "?").trim().charAt(0).toUpperCase() || "?"; }

  // L'image composée est stockée en base64 BRUT (sans en-tête) : on ajoute le préfixe data:
  // comme le fait /compte, sinon le <img> a une src invalide (avatar cassé).
  function imgSrc(b64) { return b64 ? (String(b64).indexOf("data:") === 0 ? b64 : "data:image/jpeg;base64," + b64) : ""; }

  // Construit l'avatar de l'utilisateur : image composée > avatar galerie > initiale.
  function avatarHtml(u) {
    if (u.image) return '<img src="' + escAttr(imgSrc(u.image)) + '" alt="" />';
    if (u.avatar && u.avatar.indexOf("img:") === 0) return '<img src="' + escAttr(u.avatar.slice(4)) + '" alt="" />';
    if (u.avatar && u.avatar.indexOf("img:") !== 0 && /^ph-/.test(u.avatar)) return '<i class="ph ' + escAttr(u.avatar) + '"></i>';
    return '<span class="nx-chip__ini">' + escHtml(initial(u.name || u.username)) + "</span>";
  }
  function escHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function escAttr(s) { return escHtml(s); }

  function mountProfileChip(u) {
    const ends = document.querySelectorAll(".nav__end");
    ends.forEach((end) => {
      // On ne pose le chip que là où il y avait « Se connecter / Créer un compte »
      // (pages publiques). Les pages connectées (compte/sessions/admin) ont déjà un
      // header contextuel (Mon compte / Déconnexion) : pas de chip, pas de doublon.
      const authLinks = end.querySelectorAll('a[href="/login"], a[href="/register"], a[href="/login/"], a[href="/register/"]');
      if (!authLinks.length) return;
      authLinks.forEach((a) => a.remove());
      if (end.querySelector(".nx-chip")) return;
      const name = u.name || u.username || "";
      const color = (u.color && /^#[0-9a-fA-F]{6}$/.test(u.color)) ? u.color : "#1ca9e0";
      const chip = document.createElement("div");
      chip.className = "nx-chip";
      const useBg = !u.image && u.avatar && u.avatar.indexOf("img:") !== 0 && !/^ph-/.test(u.avatar) === false && u.color;
      chip.innerHTML =
        '<button class="nx-chip__btn" type="button" aria-haspopup="true" aria-expanded="false">' +
        '<span class="nx-chip__av"' + (useBg ? ' style="background:' + escAttr(color) + '"' : "") + ">" + avatarHtml(u) + "</span>" +
        '<span class="nx-chip__meta"><span class="nx-chip__name">' + escHtml(name) + "</span>" +
        '<span class="nx-chip__fc">' + escHtml(u.friend_code || "") + "</span></span>" +
        '<i class="ph ph-caret-down" aria-hidden="true"></i></button>' +
        '<div class="nx-chip__menu" role="menu">' +
        '<div class="nx-chip__head"><span class="nx-chip__av nx-chip__av--lg"' + (useBg ? ' style="background:' + escAttr(color) + '"' : "") + ">" + avatarHtml(u) + "</span>" +
        '<div><div class="nx-chip__name">' + escHtml(name) + '</div><div class="nx-chip__live"><span class="status__dot"></span><span data-i18n="profile.online">Connecté</span></div></div></div>' +
        '<a class="nx-chip__item" href="/compte" role="menuitem"><i class="ph ph-user-circle"></i><span data-i18n="profile.account">Mon compte</span></a>' +
        '<a class="nx-chip__item" href="/sessions" role="menuitem"><i class="ph ph-devices"></i><span data-i18n="profile.sessions">Appareils</span></a>' +
        '<button class="nx-chip__item nx-chip__item--danger" type="button" id="nx-logout" role="menuitem"><i class="ph ph-sign-out"></i><span data-i18n="profile.logout">Déconnexion</span></button>' +
        "</div>";
      end.appendChild(chip);
      const btn = chip.querySelector(".nx-chip__btn");
      btn.addEventListener("click", (e) => { e.stopPropagation(); const o = chip.classList.toggle("open"); btn.setAttribute("aria-expanded", o ? "true" : "false"); });
      const lo = chip.querySelector("#nx-logout");
      if (lo) lo.addEventListener("click", () => (typeof NX !== "undefined" && NX ? NX.logout() : (localStorage.clear(), (location.href = "/"))));
      applyTo(chip);
    });
  }
  document.addEventListener("click", () =>
    document.querySelectorAll(".nx-chip.open").forEach((c) => { c.classList.remove("open"); const b = c.querySelector(".nx-chip__btn"); if (b) b.setAttribute("aria-expanded", "false"); })
  );

  async function initHeaderProfile() {
    // app.js déclare `const NX` en portée lexicale globale — ce N'EST PAS window.NX (const/let
    // ne se posent pas sur window). On lit donc NX directement (typeof pour ne pas throw si absent).
    if (typeof NX === "undefined" || !NX || !NX.token) return; // pas connecté -> on laisse Connexion/Créer un compte
    try {
      // profile() = identité en jeu (pseudo/avatar/couleur) ; me() = compte (friend code).
      // ⚠ Les réponses sont ENVELOPPÉES : /api/me = {account:{…}}, /api/profile = {profile:{…}}.
      // Il faut déballer, sinon tous les champs sont undefined et le chip retombe sur l'initiale.
      const [me, prof] = await Promise.allSettled([NX.me(), NX.profile()]);
      const acc = (me.status === "fulfilled" && me.value && me.value.account) ? me.value.account : {};
      const p = (prof.status === "fulfilled" && prof.value && prof.value.profile) ? prof.value.profile : {};
      const u = {
        name: p.name || p.nickname || acc.username || acc.name,
        username: acc.username,
        friend_code: acc.friend_code || p.friend_code || "",
        image: p.image || acc.image,
        avatar: p.avatar || acc.avatar,
        color: p.color || acc.color,
      };
      mountProfileChip(u);
    } catch (_) { /* token invalide/expiré : on ne casse pas le header public */ }
  }

  /* ---- démarrage ---- */
  function boot() {
    document.documentElement.setAttribute("lang", CUR);
    document.documentElement.setAttribute("dir", RTL.has(CUR) ? "rtl" : "ltr");
    buildSwitcher();
    applyTo(document);
    initHeaderProfile();
  }
  // Les dictionnaires (nx-i18n*.js) sont chargés APRÈS ce fichier. En <script defer>,
  // readyState vaut « interactive » pendant l'exécution — PAS « loading » — donc booter
  // tout de suite traduirait le DOM avant que les dictionnaires existent (→ page en langue
  // par défaut, bug des visiteurs espagnols qui voyaient le français). DOMContentLoaded ne
  // se déclenche qu'APRÈS tous les scripts defer : on attend donc lui, sauf si la page est
  // déjà « complete » (script injecté après coup — l'évènement ne se redéclenchera pas).
  if (document.readyState === "complete") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
