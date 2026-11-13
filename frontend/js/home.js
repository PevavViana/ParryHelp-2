(() => {
  "use strict";

  // Levitação das formas do hero.
  // Cada forma viaja entre pontos aleatórios próximos da sua posição original
  // usando smootherstep (sem trancos na saída/chegada). A posição desenhada
  // segue esse alvo com lerp dependente do tempo, o que também suaviza o
  // parallax do mouse e qualquer variação de frame rate.

  const texture = document.querySelector(".landing-texture");
  if (!texture) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (min, max) => min + Math.random() * (max - min);

  const shapes = [...texture.querySelectorAll(".texture-drift > *")].map(
    (node) => {
      const isFill = node.classList.contains("shape-fill");
      const isLine = node.matches(".shape-line, .shape-spark");
      // Formas grandes/preenchidas ficam "mais longe": movem mais devagar e
      // reagem menos ao mouse; traços finos ficam "mais perto".
      const depth = isFill ? rand(0.35, 0.55) : rand(0.7, 1);
      const amp = isFill ? rand(16, 24) : rand(10, 18);
      const spin = isLine ? rand(6, 12) : isFill ? 0 : rand(2, 5);
      const point = () => ({
        x: rand(-amp, amp),
        y: rand(-amp, amp),
        r: rand(-spin, spin),
      });
      return {
        node,
        depth,
        point,
        from: { x: 0, y: 0, r: 0 },
        to: point(),
        start: performance.now() - rand(0, 3000),
        duration: rand(3800, 6400) / (0.6 + depth * 0.4),
        current: { x: 0, y: 0, r: 0 },
      };
    },
  );

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      pointer.tx = (event.clientX / innerWidth) * 2 - 1;
      pointer.ty = (event.clientY / innerHeight) * 2 - 1;
    },
    { passive: true },
  );
  document.documentElement.addEventListener("mouseleave", () => {
    pointer.tx = 0;
    pointer.ty = 0;
  });

  let visible = true;
  let frame = 0;
  let last = performance.now();

  function tick(now) {
    // Limita o dt para não "pular" depois de a aba ficar em segundo plano.
    const dt = Math.min(now - last, 50) / 1000;
    last = now;
    // Lerp independente de frame rate: k = 1 - e^(-λ·dt)
    const follow = 1 - Math.exp(-dt * 4.5);
    const parallax = 1 - Math.exp(-dt * 2.5);
    pointer.x = lerp(pointer.x, pointer.tx, parallax);
    pointer.y = lerp(pointer.y, pointer.ty, parallax);

    for (const shape of shapes) {
      let progress = (now - shape.start) / shape.duration;
      if (progress >= 1) {
        shape.from = shape.to;
        shape.to = shape.point();
        shape.start = now;
        progress = 0;
      }
      const eased = smootherstep(Math.max(0, progress));
      const targetX =
        lerp(shape.from.x, shape.to.x, eased) - pointer.x * 14 * shape.depth;
      const targetY =
        lerp(shape.from.y, shape.to.y, eased) - pointer.y * 10 * shape.depth;
      const targetR = lerp(shape.from.r, shape.to.r, eased);

      const c = shape.current;
      c.x = lerp(c.x, targetX, follow);
      c.y = lerp(c.y, targetY, follow);
      c.r = lerp(c.r, targetR, follow);
      shape.node.style.transform = `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px) rotate(${c.r.toFixed(2)}deg)`;
    }

    frame = visible ? requestAnimationFrame(tick) : 0;
  }

  function start() {
    if (frame || !visible) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  start();
  // Pausa quando o hero sai da tela e retoma quando volta (ou quando a aba
  // volta a ficar visível).
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    start();
  }).observe(texture);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) start();
  });
})();
