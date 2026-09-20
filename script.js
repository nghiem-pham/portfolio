// Blur fade on scroll.
  (function () {
    var items = document.querySelectorAll(".fade");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (n) { n.classList.add("visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, idx) {
        if (!e.isIntersecting) return;
        setTimeout(function () { e.target.classList.add("visible"); }, idx * 70);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    items.forEach(function (n) { io.observe(n); });
  })();

  // Project cards animate only while they are on screen, and the speedup
  // figure counts up once so the number registers as a measurement.
  (function () {
    var cards = document.querySelectorAll(".pcard");
    if (!cards.length || !("IntersectionObserver" in window)) {
      cards.forEach(function (c) { c.classList.add("anim"); });
      return;
    }
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var counted = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle("anim", e.isIntersecting);
        var label = e.target.querySelector(".speedup");
        if (e.isIntersecting && label && !counted && !reduce) {
          counted = true;
          var t0 = performance.now();
          (function step(now) {
            var p = Math.min(1, (now - t0) / 1100);
            var v = Math.round(1 + (43 - 1) * (1 - Math.pow(1 - p, 3)));
            label.textContent = v + "x faster";
            if (p < 1) requestAnimationFrame(step);
          })(t0);
        }
      });
    }, { threshold: 0.25 });
    cards.forEach(function (c) { io.observe(c); });
  })();

  // Expandable cards.
  document.querySelectorAll(".rcard").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      document.getElementById(btn.getAttribute("aria-controls")).classList.toggle("open", !open);
    });
  });

  // Theme toggle.
  (function () {
    var btn = document.getElementById("theme");
    var root = document.documentElement;
    btn.addEventListener("click", function () {
      var dark = (root.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
      var next = dark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      btn.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
      window.dispatchEvent(new Event("themechange"));
    });
  })();

(function () {
  "use strict";
  var canvas = document.getElementById("labcanvas");
  if (!canvas || !window.THREE) return;

  var ROWS = 6, COLS = 8, UNITS = 10;
  var RW = 0.9, RH = 2.0, RD = 1.1, COL_GAP = 1.15, PAIR_GAP = 1.35, AISLE = 3.2;
  var LABELS = ["A", "B", "C", "D", "E", "F"];

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 24, 58);
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

  function token(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  var floorW = COLS * COL_GAP + 6, floorD = ROWS * 2 + AISLE * 3 + 4;
  var floorMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, floorD), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  var grid = new THREE.GridHelper(Math.max(floorW, floorD), Math.round(Math.max(floorW, floorD) / 0.6));
  grid.material.vertexColors = false;
  grid.material.needsUpdate = true;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.y = 0.002;
  scene.add(grid);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  var key = new THREE.DirectionalLight(0xffffff, 0.7); key.position.set(8, 14, 6); scene.add(key);
  var rim = new THREE.DirectionalLight(0xbfd8e6, 0.3); rim.position.set(-9, 6, -8); scene.add(rim);

  var rackMat = new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.15 });
  var rackGeo = new THREE.BoxGeometry(RW, RH, RD);

  var zs = [], z = -(AISLE + PAIR_GAP);
  for (var p = 0; p < 3; p++) { zs.push(z, z + PAIR_GAP); z += PAIR_GAP + AISLE; }
  var mid = (zs[0] + zs[zs.length - 1]) / 2;
  for (var i = 0; i < zs.length; i++) zs[i] -= mid;

  var racks = [], picks = [];
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      var x = (c - (COLS - 1) / 2) * COL_GAP;
      var mesh = new THREE.Mesh(rackGeo, rackMat);
      mesh.position.set(x, RH / 2, zs[r]);
      scene.add(mesh);
      var rk = { id: LABELS[r] + (c + 1), row: r, x: x, z: zs[r], util: 0.3 + Math.random() * 0.4,
                 target: 0.3 + Math.random() * 0.4, heat: 0, nodes: [] };
      for (var u = 0; u < UNITS; u++) rk.nodes.push({ up: Math.random() > 0.015, j: 0.85 + Math.random() * 0.3 });
      mesh.userData.rack = rk;
      rk.ord = ((c / (COLS - 1)) * 0.55) + ((r / (ROWS - 1)) * 0.45);
      racks.push(rk); picks.push(mesh);
    }
  }

  var leds = new THREE.InstancedMesh(
    new THREE.BoxGeometry(RW * 0.66, RH / UNITS * 0.52, 0.04),
    new THREE.MeshBasicMaterial(), racks.length * UNITS);
  var dummy = new THREE.Object3D(), tmp = new THREE.Color();
  for (var ri = 0; ri < racks.length; ri++) {
    var dir = (racks[ri].row % 2 === 0) ? -1 : 1;
    for (var ui = 0; ui < UNITS; ui++) {
      dummy.position.set(racks[ri].x, (ui + 0.5) * (RH / UNITS), racks[ri].z + dir * (RD / 2 + 0.021));
      dummy.updateMatrix();
      leds.setMatrixAt(ri * UNITS + ui, dummy.matrix);
      leds.setColorAt(ri * UNITS + ui, tmp.setRGB(0.2, 0.2, 0.2));
    }
  }
  scene.add(leds);

  // The name lives in the scene, so racks in front of it cut across the letters.
  var NAME = "Nghiem Pham";
  var nameCanvas = document.createElement("canvas");
  nameCanvas.width = 2048; nameCanvas.height = 512;
  var nctx = nameCanvas.getContext("2d");
  var nameTex = new THREE.CanvasTexture(nameCanvas);
  nameTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  var nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: nameTex, transparent: true, depthTest: false, depthWrite: false
  }));
  nameSprite.renderOrder = 999;
  nameSprite.scale.set(14, 3.5, 1);
  nameSprite.position.set(0, 3.5, 0);
  scene.add(nameSprite);

  var typedChars = 0, caretOn = true;
  var FONT_PX = 210, TRACK = -0.05 * FONT_PX; // matches letter-spacing: -0.05em

  function drawName() {
    nctx.clearRect(0, 0, 2048, 512);
    nctx.font = "700 " + FONT_PX + "px Inter, system-ui, sans-serif";
    nctx.textAlign = "left";
    nctx.textBaseline = "middle";
    nctx.fillStyle = token("--foreground") || "#000";

    var done = typedChars >= NAME.length;
    var text = NAME.slice(0, typedChars) + (done || !caretOn ? "" : "|");
    var chars = Array.from(text);
    if (!chars.length) { nameTex.needsUpdate = true; return; }

    var total = 0, widths = [];
    for (var i = 0; i < chars.length; i++) {
      widths[i] = nctx.measureText(chars[i]).width;
      total += widths[i];
    }
    total += TRACK * (chars.length - 1);

    var x = 1024 - total / 2;
    for (var j = 0; j < chars.length; j++) {
      nctx.fillText(chars[j], x, 266);
      x += widths[j] + TRACK;
    }
    nameTex.needsUpdate = true;
  }

  function typeName() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      typedChars = NAME.length; drawName(); return;
    }
    (function step() {
      typedChars++;
      drawName();
      if (typedChars < NAME.length) setTimeout(step, 70);
      else setInterval(function () { caretOn = !caretOn; drawName(); }, 600);
    })();
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(drawName);
  } else { drawName(); }

  function applyTheme() {
    var bg = new THREE.Color(token("--background"));
    scene.background = bg; scene.fog.color = bg;
    floorMat.color.set(token("--muted"));
    grid.material.color.set(token("--border"));
    rackMat.color.set(token("--muted-foreground"));
    drawName();
  }
  applyTheme();
  window.addEventListener("themechange", applyTheme);
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", applyTheme);
  }

  var STOPS = {
    util: [[0, "#2E6E86"], [0.45, "#3FA98F"], [0.72, "#D8B43C"], [1, "#D45B4A"]],
    temp: [[0, "#3C87B8"], [0.5, "#77C2A6"], [0.75, "#E0A03A"], [1, "#CF4136"]]
  };
  var cA = new THREE.Color(), cB = new THREE.Color();
  function ramp(mode, t, out) {
    t = Math.max(0, Math.min(1, t));
    var s = STOPS[mode];
    for (var i = 1; i < s.length; i++) {
      if (t <= s[i][0] || i === s.length - 1) {
        var k = (t - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
        cA.set(s[i - 1][1]); cB.set(s[i][1]);
        return out.copy(cA).lerp(cB, Math.max(0, Math.min(1, k)));
      }
    }
    return out.set(s[0][1]);
  }

  var mode = "util", selected = null, hovered = null, failedZone = null, failedUntil = 0;
  var read = document.getElementById("labread");

  function tempOf(rk) { return 21 + rk.util * 8 + rk.heat; }
  function powerOf(rk) {
    var on = 0;
    for (var i = 0; i < UNITS; i++) if (rk.nodes[i].up) on++;
    return 2.1 + rk.util * on * 0.72;
  }
  function metric(rk) { return mode === "util" ? rk.util : (tempOf(rk) - 19) / 16; }

  var boot = 0;
  function paint() {
    var col = new THREE.Color();
    for (var i = 0; i < racks.length; i++) {
      var rk = racks[i], m = metric(rk), off = rk.ord > boot;
      for (var u = 0; u < UNITS; u++) {
        if (off || !rk.nodes[u].up) col.setRGB(0.13, 0.14, 0.15);
        else {
          ramp(mode, m * rk.nodes[u].j, col);
          if (rk === selected || rk === hovered) col.offsetHSL(0, 0.05, 0.12);
        }
        leds.setColorAt(i * UNITS + u, col);
      }
    }
    if (leds.instanceColor) leds.instanceColor.needsUpdate = true;
  }

  function showRack(rk) {
    read.textContent = rk
      ? "Rack " + rk.id + "  |  " + Math.round(rk.util * 100) + "% load  |  " +
        tempOf(rk).toFixed(1) + " \u00B0C  |  " + powerOf(rk).toFixed(1) + " kW"
      : "";
  }

  function tick() {
    var now = performance.now();
    if (failedZone && now > failedUntil) failedZone = null;
    for (var i = 0; i < racks.length; i++) {
      var rk = racks[i];
      if (Math.random() < 0.08) rk.target = 0.15 + Math.random() * 0.8;
      rk.util += (rk.target - rk.util) * 0.18;
      var hot = failedZone && ((failedZone === "north") === (rk.z < 0));
      rk.heat += ((hot ? 7.5 : 0) - rk.heat) * 0.12;
      if (Math.random() < 0.002) {
        var n = rk.nodes[Math.floor(Math.random() * UNITS)];
        n.up = !n.up;
      }
    }
    paint();
    if (selected) showRack(selected);
  }

  var target = new THREE.Vector3(0, 1.6, 0);
  var sph = { radius: 25, theta: Math.PI * 0.26, phi: Math.PI * 0.42 };
  var dragging = false, lastX = 0, lastY = 0, moved = 0, pinch = 0;
  var idleSpin = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function place() {
    sph.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, sph.phi));
    sph.radius = Math.max(8, Math.min(38, sph.radius));
    camera.position.set(
      target.x + sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta),
      target.y + sph.radius * Math.cos(sph.phi),
      target.z + sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta));
    camera.lookAt(target);
  }

  canvas.addEventListener("pointerdown", function (e) {
    if (intro.on) {
      intro.on = false; boot = 1; typedChars = NAME.length;
      sph.radius = endRadius; sph.phi = endPhi; sph.theta = endTheta;
      drawName(); paint(); stage.classList.add("ready");
    }
    dragging = true; moved = 0; idleSpin = false; lastX = e.clientX; lastY = e.clientY;
    canvas.classList.add("dragging"); canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (dragging) {
      moved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
      sph.theta -= (e.clientX - lastX) * 0.006;
      sph.phi -= (e.clientY - lastY) * 0.005;
      lastX = e.clientX; lastY = e.clientY;
      place();
    } else {
      var rk = pick(e);
      if (rk !== hovered) { hovered = rk; canvas.style.cursor = rk ? "pointer" : "grab"; paint(); }
    }
  });
  function endDrag(e) {
    dragging = false; canvas.classList.remove("dragging");
    if (e && e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("touchmove", function (e) {
    if (e.touches.length === 2) {
      var dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (pinch) { sph.radius *= pinch / d; place(); }
      pinch = d;
    }
  }, { passive: true });
  canvas.addEventListener("touchend", function () { pinch = 0; });

  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    var rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(picks, false);
    return hits.length ? hits[0].object.userData.rack : null;
  }
  canvas.addEventListener("click", function (e) {
    if (moved > 6) return;
    var rk = pick(e);
    selected = rk; showRack(rk); paint();
  });

  // One page-load sequence: camera settles, racks come online, name types.
  var stage = document.getElementById("hero");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var intro = { on: !reduced, t0: 0, dur: 2200, typed: false };
  var endTheta = sph.theta, endPhi = sph.phi, endRadius = sph.radius;

  if (reduced) {
    boot = 1; typedChars = NAME.length; drawName(); stage.classList.add("ready");
  } else {
    sph.radius = 64; sph.phi = Math.PI * 0.20; sph.theta = endTheta - 0.85;
    read.textContent = "Bringing 48 racks online";
    place();
  }

  function runIntro(now) {
    if (!intro.t0) intro.t0 = now;
    var p = Math.min(1, (now - intro.t0) / intro.dur);
    var e = 1 - Math.pow(1 - p, 3);
    sph.radius = 64 + (endRadius - 64) * e;
    sph.phi = Math.PI * 0.20 + (endPhi - Math.PI * 0.20) * e;
    sph.theta = (endTheta - 0.85) + 0.85 * e;
    place();
    boot = Math.min(1, p * 1.45);
    paint();
    if (!intro.typed && p > 0.5) { intro.typed = true; typeName(); }
    if (p >= 1) {
      intro.on = false;
      boot = 1;
      stage.classList.add("ready");
      read.textContent = "";
    }
  }

  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize(); place(); tick();

  // Only render and simulate while the panel is on screen.
  var live = false, timer = null, raf = null;
  function start() {
    if (live) return;
    live = true;
    timer = setInterval(tick, 900);
    (function loop() {
      if (!live) return;
      raf = requestAnimationFrame(loop);
      var now = performance.now();
      if (intro.on) runIntro(now);
      else if (idleSpin && !dragging) { sph.theta += 0.0012; place(); }
      renderer.render(scene, camera);
    })();
  }
  function stop() {
    live = false;
    if (timer) { clearInterval(timer); timer = null; }
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? start() : stop();
    }, { rootMargin: "120px" }).observe(canvas);
  } else start();
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });
})();