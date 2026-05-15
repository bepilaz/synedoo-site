/* ============================================================
   SYNDEOO — Shared JavaScript Engine v2.0
   Absolute Clarity Unit
   ============================================================ */

(function (S) {
  "use strict";

  /* ── COOKIE BANNER ────────────────────────────────────────── */
  S.initCookie = function () {
    var KEY = "syndeoo-cookie-ok";
    var banner = document.getElementById("s-cookie");
    if (!banner) return;
    if (!localStorage.getItem(KEY)) banner.style.display = "flex";
    var btn = banner.querySelector(".s-cookie__btn");
    if (btn) btn.addEventListener("click", function () {
      localStorage.setItem(KEY, "1");
      banner.style.display = "none";
    });
  };

  /* ── TOOLTIP ──────────────────────────────────────────────── */
  var _tip = null;
  S.initTooltip = function () {
    _tip = document.getElementById("s-tip");
  };
  S.showTip = function (x, y, txt) {
    if (!_tip) return;
    _tip.textContent = txt;
    _tip.style.left    = (x + 14) + "px";
    _tip.style.top     = (y - 40) + "px";
    _tip.style.display = "block";
  };
  S.hideTip = function () {
    if (_tip) _tip.style.display = "none";
  };

  /* ── TABS ─────────────────────────────────────────────────── */
  S.initTabs = function () {
    var tabEls    = document.querySelectorAll(".s-tab");
    var panelEls  = document.querySelectorAll(".s-panel");
    tabEls.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabEls.forEach(function (t)   { t.classList.remove("is-on"); });
        panelEls.forEach(function (p) { p.classList.remove("is-on"); });
        tab.classList.add("is-on");
        var target = document.getElementById("panel-" + tab.dataset.p);
        if (target) target.classList.add("is-on");
      });
    });
  };

  /* ── SORT BUTTONS ─────────────────────────────────────────── */
  S.initSort = function (metrics, renderFn) {
    metrics.forEach(function (metric) {
      var row  = document.getElementById("sort-" + metric);
      if (!row) return;
      var btns = row.querySelectorAll(".s-sort__btn");
      btns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          btns.forEach(function (b) { b.classList.remove("is-on"); });
          btn.classList.add("is-on");
          renderFn(metric, btn.dataset.o);
        });
      });
    });
  };

  /* ── FORMAT ───────────────────────────────────────────────── */
  S.fmt = function (v) { return Math.round(v) + "\u202Fm"; }; /* narrow no-break space */

  /* ── BAR CHART ENGINE ─────────────────────────────────────── */
  /*
     config = {
       teams:    Array of { name, pos, [metric]: Number, ... },
       palette:  { "Club Name": "#hexcol", ... },
       averages: { metric: Number, ... }
     }
  */
  S.renderBar = function (metric, order, config) {
    var chartEl = document.getElementById("chart-" + metric);
    var avgEl   = document.getElementById("avg-"   + metric);
    if (!chartEl) return;

    var rows = config.teams.slice();
    if (order === "desc")  rows.sort(function (a, b) { return b[metric] - a[metric]; });
    if (order === "asc")   rows.sort(function (a, b) { return a[metric] - b[metric]; });
    if (order === "pos")   rows.sort(function (a, b) { return a.pos - b.pos; });
    if (order === "alpha") rows.sort(function (a, b) { return a.name < b.name ? -1 : 1; });

    var vals = rows.map(function (r) { return r[metric]; });
    var hi   = Math.max.apply(null, vals);
    var lo   = Math.min.apply(null, vals);
    var span = hi - lo || 1;

    chartEl.innerHTML = "";

    rows.forEach(function (team, i) {
      var pct = 14 + ((team[metric] - lo) / span) * 86;
      var col = (config.palette && config.palette[team.name]) || "#4397A2";

      var row  = el("div", "s-bar-row");
      var name = el("div", "s-bar-name"); name.textContent = team.name;
      var trk  = el("div", "s-bar-track");
      var fill = el("div", "s-bar-fill");
      fill.style.background = col;
      fill.style.width      = "0";
      trk.appendChild(fill);
      var val = el("div", "s-bar-val"); val.textContent = S.fmt(team[metric]);

      row.appendChild(name); row.appendChild(trk); row.appendChild(val);
      chartEl.appendChild(row);

      /* staggered animation */
      (function (f, p, d) {
        setTimeout(function () { f.style.width = p + "%"; }, d);
      }(fill, pct, i * 20 + 30));

      /* tooltip */
      row.addEventListener("mousemove", function (e) {
        S.showTip(e.clientX, e.clientY,
          team.name + "  ·  " + S.fmt(team[metric]) + " / player / match  ·  P" + team.pos);
      });
      row.addEventListener("mouseleave", S.hideTip);
    });

    /* avg line */
    if (avgEl) {
      var av  = config.averages[metric];
      var ap  = 14 + ((av - lo) / span) * 86;
      avgEl.innerHTML = "";
      var lbl = el("div", "s-avg-label"); lbl.textContent = "avg " + S.fmt(av); lbl.style.left = ap + "%";
      var ln  = el("div", "s-avg-line");  ln.style.left   = ap + "%";
      avgEl.appendChild(lbl); avgEl.appendChild(ln);
    }
  };

  /* ── STAT CARDS ───────────────────────────────────────────── */
  S.fillCards = function (teams, metrics) {
    /* metrics = [{ key, cardValId, cardTeamId }, ...] */
    metrics.forEach(function (m) {
      var best = teams.reduce(function (a, b) { return a[m.key] > b[m.key] ? a : b; });
      setText(m.cardValId,  S.fmt(best[m.key]));
      setText(m.cardTeamId, best.name);
    });
  };

  /* ── NORMALISE DATA ───────────────────────────────────────── */
  /*
     raw   = [{ name, pos, dist, hsr, sprint }, ...]
     div   = divisor (players × matches)
     Returns teams array with metres values + averages object.
  */
  S.normalise = function (raw, div) {
    var teams = raw.map(function (r) {
      return {
        name:     r.name,
        pos:      r.pos,
        distance: Math.round(r.dist   / div * 1000),
        hsr:      Math.round(r.hsr    / div * 1000),
        sprint:   Math.round(r.sprint / div * 1000)
      };
    });
    var averages = {};
    ["distance", "hsr", "sprint"].forEach(function (k) {
      var s = 0;
      teams.forEach(function (t) { s += t[k]; });
      averages[k] = s / teams.length;
    });
    return { teams: teams, averages: averages };
  };

  /* ── HELPERS ──────────────────────────────────────────────── */
  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }
  function setText(id, v) {
    var e = document.getElementById(id);
    if (e) e.textContent = v;
  }

}(window.SYNDEOO = window.SYNDEOO || {}));
