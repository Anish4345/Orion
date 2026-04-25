/**
 * Orion — vanilla motion layer
 */

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const lerp = (a, b, t) => a + (b - a) * t;

/** ——— Page loader ——— */
const initPageLoader = () => {
  const loader = document.getElementById("page-loader");
  if (!loader) return;

  const letters = loader.querySelectorAll(".page-loader__letters span");
  if (prefersReducedMotion()) {
    letters.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    requestAnimationFrame(() => loader.classList.add("is-done"));
    return;
  }

  const run = () => {
    letters.forEach((el, i) => {
      el.animate(
        [
          { opacity: 0, transform: "translateY(40px) rotateX(-40deg)" },
          { opacity: 1, transform: "translateY(0) rotateX(0)" },
        ],
        {
          duration: 680,
          delay: i * 70,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          fill: "forwards",
        },
      );
    });
    const total = letters.length * 70 + 800;
    window.setTimeout(() => {
      loader.classList.add("is-done");
      window.setTimeout(() => loader.remove(), 1000);
    }, total);
  };

  if (document.readyState === "complete") {
    run();
  } else {
    window.addEventListener("load", run, { once: true });
  }
};

/** ——— Smooth scroll (wheel damped) + in-page anchors ——— */
const initSmoothScroll = () => {
  if (prefersReducedMotion()) return;

  const headerOffset = 76;
  let target = window.scrollY;
  let current = window.scrollY;
  let rafId = null;
  const ease = 0.11;
  const wheelFactor = 0.62;

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  const tick = () => {
    current += (target - current) * ease;
    if (Math.abs(target - current) < 0.45) {
      current = target;
    }
    window.scrollTo(0, current);
    if (Math.abs(target - current) > 0.35) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  };

  const schedule = () => {
    if (rafId == null) {
      rafId = requestAnimationFrame(tick);
    }
  };

  window.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      target += e.deltaY * wheelFactor;
      target = clamp(target, 0, maxScroll());
      schedule();
    },
    { passive: false },
  );

  window.addEventListener(
    "scroll",
    () => {
      if (rafId == null) {
        target = window.scrollY;
        current = window.scrollY;
      }
    },
    { passive: true },
  );

  const scrollToY = (y) => {
    target = clamp(y, 0, maxScroll());
    current = window.scrollY;
    schedule();
  };

  document.querySelectorAll(`a[href^="#"]`).forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const id = href.slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      scrollToY(y);
    });
  });

  window.addEventListener("resize", () => {
    target = clamp(target, 0, maxScroll());
    if (rafId == null) {
      current = window.scrollY;
    }
  });
};

/** ——— Custom cursor ——— */
const initCustomCursor = () => {
  if (prefersReducedMotion()) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;

  document.body.classList.add("has-custom-cursor");
  const cursor = document.getElementById("custom-cursor");
  if (!cursor) return;

  const dot = cursor.querySelector(".custom-cursor__dot");
  const labelEl = cursor.querySelector(".custom-cursor__label");
  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;
  let lx = cx;
  let ly = cy;

  const handlePointerMove = (e) => {
    cx = e.clientX;
    cy = e.clientY;
  };

  window.addEventListener("pointermove", handlePointerMove);

  const loop = () => {
    lx += (cx - lx) * 0.22;
    ly += (cy - ly) * 0.22;
    cursor.style.transform = `translate(${lx}px, ${ly}px)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const setHover = (target, active) => {
    const label = target.getAttribute("data-cursor-label") || "";
    cursor.classList.toggle("is-expanded", active && label.length > 0);
    if (labelEl) labelEl.textContent = active ? label : "";
  };

  document.querySelectorAll("[data-cursor-label]").forEach((el) => {
    el.addEventListener("pointerenter", () => setHover(el, true));
    el.addEventListener("pointerleave", () => setHover(el, false));
  });
};

/** ——— Magnetic elements ——— */
const initMagnetic = () => {
  if (prefersReducedMotion()) return;

  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const strength = 0.35;
    const rect = () => el.getBoundingClientRect();

    el.addEventListener("pointermove", (e) => {
      const r = rect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    el.addEventListener("pointerleave", () => {
      el.style.transform = "translate(0, 0)";
      el.style.transition = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
      window.setTimeout(() => {
        el.style.transition = "";
      }, 500);
    });
  });
};

/** ——— Split text + reveal ——— */
const splitElement = (root) => {
  const text = root.textContent;
  root.textContent = "";
  const frag = document.createDocumentFragment();
  [...text].forEach((ch) => {
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = ch === " " ? "\u00a0" : ch;
    frag.appendChild(span);
  });
  root.appendChild(frag);
  return [...root.querySelectorAll(".char")];
};

const initSplitText = () => {
  document.querySelectorAll("[data-split]").forEach((block) => {
    const chars = splitElement(block);
    chars.forEach((c) => {
      c.style.opacity = "0";
      c.style.transform = "translateY(110%) rotateX(-55deg)";
      c.style.filter = "blur(6px)";
    });

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          if (prefersReducedMotion()) {
            chars.forEach((c) => {
              c.style.opacity = "1";
              c.style.transform = "none";
              c.style.filter = "none";
            });
            return;
          }
          chars.forEach((c, i) => {
            c.animate(
              [
                { opacity: 0, transform: "translateY(110%) rotateX(-55deg)", filter: "blur(6px)" },
                { opacity: 1, transform: "translateY(0) rotateX(0)", filter: "blur(0)" },
              ],
              {
                duration: 720,
                delay: i * 28,
                easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                fill: "forwards",
              },
            );
          });
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(block);
  });
};

/** ——— Scramble hero word ——— */
const initScramble = () => {
  const el = document.getElementById("hero-scramble");
  if (!el) return;

  const finalText = "future";
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
  let frame = 0;
  const totalFrames = 42;

  const tick = () => {
    if (prefersReducedMotion()) {
      el.textContent = finalText;
      return;
    }
    frame += 1;
    const progress = frame / totalFrames;
    let out = "";
    for (let i = 0; i < finalText.length; i += 1) {
      if (progress * finalText.length > i + 0.5) {
        out += finalText[i];
      } else {
        out += charset[Math.floor(Math.random() * charset.length)];
      }
    }
    el.textContent = out;
    if (frame < totalFrames) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = finalText;
    }
  };

  const io = new IntersectionObserver(
    (entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) {
        obs.disconnect();
        frame = 0;
        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.4 },
  );
  io.observe(el);
};

/** ——— Section reveals ——— */
const initSectionReveals = () => {
  const sections = document.querySelectorAll(".section--reveal");
  if (prefersReducedMotion()) {
    sections.forEach((s) => s.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
  );
  sections.forEach((s) => io.observe(s));
};

/** ——— Tilt (project inner faces + service depth layers) ——— */
const initTilt = () => {
  if (prefersReducedMotion()) return;

  document.querySelectorAll("[data-tilt]").forEach((el) => {
    const isService = el.classList.contains("service-card");
    const rotateEl = isService ? el.querySelector(".service-card__layers") : el;
    if (!rotateEl) return;

    const handleMove = (e) => {
      const r = rotateEl.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const rx = py * -14;
      const ry = px * 16;
      rotateEl.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (isService) {
        const depth = clamp(Math.hypot(px, py) * 2.2, 0, 1);
        el.style.setProperty("--depth", depth.toFixed(3));
      }
    };

    const reset = () => {
      rotateEl.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
      if (isService) {
        el.style.setProperty("--depth", "0");
      }
    };

    el.addEventListener("pointermove", handleMove);
    el.addEventListener("pointerleave", reset);
  });
};

/** ——— Hero 3D pointer parallax (CSS vars on .hero3d) ——— */
const initHero3D = () => {
  const root = document.querySelector(".hero3d");
  if (!root) return;
  if (prefersReducedMotion()) return;

  const handleMove = (e) => {
    const mx = (e.clientX / window.innerWidth - 0.5) * 2;
    const my = (e.clientY / window.innerHeight - 0.5) * 2;
    root.style.setProperty("--mx", mx.toFixed(4));
    root.style.setProperty("--my", my.toFixed(4));
  };

  window.addEventListener("pointermove", handleMove, { passive: true });
};

/** ——— Scroll-driven subtle scene tilt ——— */
const initSceneCamera = () => {
  if (prefersReducedMotion()) {
    document.documentElement.style.setProperty("--scene-tilt", "0deg");
    return;
  }

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    const tilt = (p - 0.5) * -6.5;
    document.documentElement.style.setProperty("--scene-tilt", `${tilt}deg`);
  };

  window.addEventListener("scroll", update, { passive: true });
  update();
};

/** ——— Horizontal work scroller + coverflow ——— */
const initWorkScroll = () => {
  const pin = document.getElementById("work-pin");
  const track = document.getElementById("work-track");
  if (!pin || !track) return;

  const GUTTER = 72;
  let travel = 0;

  const recalc = () => {
    travel = Math.max(0, track.scrollWidth - window.innerWidth + GUTTER);
    if (prefersReducedMotion()) {
      pin.style.minHeight = "";
      pin.style.height = "";
      return;
    }
    pin.style.height = `${window.innerHeight + travel + 180}px`;
  };

  const update = () => {
    const pinRect = pin.getBoundingClientRect();
    const pinTopDoc = pinRect.top + window.scrollY;
    const scrollRange = Math.max(1, pin.offsetHeight - window.innerHeight);
    let progress = (window.scrollY - pinTopDoc) / scrollRange;
    progress = clamp(progress, 0, 1);

    const x = prefersReducedMotion() ? 0 : -progress * travel;
    track.style.transform = `translate3d(${x}px, 0, 0)`;

    const vw = window.innerWidth;
    track.querySelectorAll(".project-card").forEach((card) => {
      const r = card.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const off = clamp((cx - vw * 0.5) / (vw * 0.45), -1, 1);
      card.style.setProperty("--off", off.toFixed(4));
      card.style.setProperty("--offAbs", Math.abs(off).toFixed(4));
    });

    track.querySelectorAll(".project-card__visual").forEach((vis, i) => {
      const offset = (progress - i * 0.12) * 28;
      vis.style.transform = `translate3d(${offset}px, 0, 0) scale(1.02)`;
    });
  };

  const onResize = () => {
    recalc();
    update();
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", onResize);
  recalc();
  requestAnimationFrame(() => {
    recalc();
    update();
  });
  window.setTimeout(() => {
    recalc();
    update();
  }, 400);
};

/** ——— Process SVG line ——— */
const initProcessLine = () => {
  const path = document.getElementById("process-path");
  const section = document.querySelector(".process");
  if (!path || !section) return;

  const len = path.getTotalLength?.() ?? 400;
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;

  const steps = [...document.querySelectorAll(".process-step")];

  const update = () => {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = section.offsetTop - vh * 0.5;
    const end = section.offsetTop + section.offsetHeight - vh * 0.5;
    let p = (window.scrollY - start) / (end - start);
    p = clamp(p, 0, 1);
    path.style.strokeDashoffset = `${len * (1 - p)}`;

    steps.forEach((step, i) => {
      const stepStart = i / steps.length;
      step.classList.toggle("is-active", p > stepStart + 0.05);
    });
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
};

/** ——— Count up ——— */
const animateCount = (el, target, suffix, duration = 1400) => {
  const start = performance.now();
  const from = 0;

  const tick = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - (1 - t) ** 3;
    const val = Math.round(lerp(from, target, eased));
    el.textContent = `${val}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = `${target}${suffix}`;
  };
  requestAnimationFrame(tick);
};

const initCountUps = () => {
  const els = document.querySelectorAll("[data-count]");
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        obs.unobserve(el);
        const target = Number(el.getAttribute("data-count"));
        const suffix = el.getAttribute("data-suffix") || "";
        if (prefersReducedMotion()) {
          el.textContent = `${target}${suffix}`;
          return;
        }
        animateCount(el, target, suffix);
      });
    },
    { threshold: 0.35 },
  );
  els.forEach((el) => io.observe(el));
};

/** ——— Confetti ——— */
const burstConfetti = () => {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  };
  resize();

  const colors = ["#00d4ff", "#a855f7", "#ff2d78", "#7c3aed", "#e2e8f0", "#050510"];
  const count = prefersReducedMotion() ? 28 : 88;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 3;
  const parts = Array.from({ length: count }, () => ({
    x: cx,
    y: cy,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 1.2) * 12 - 4,
    g: 0.22 + Math.random() * 0.15,
    life: 1,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.35,
    w: 6 + Math.random() * 8,
    h: 8 + Math.random() * 10,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  let alive = true;
  const step = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    alive = false;
    parts.forEach((p) => {
      if (p.life <= 0) return;
      alive = true;
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.012;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (alive) {
      requestAnimationFrame(step);
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  requestAnimationFrame(step);
  window.addEventListener("resize", resize);
};

/** ——— Contact form ——— */
const initForm = () => {
  const form = document.getElementById("contact-form");
  const btn = document.getElementById("submit-btn");
  const fieldsWrap = document.getElementById("form-fields");
  const success = document.getElementById("form-success");
  if (!form || !btn || !fieldsWrap || !success) return;

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = /** @type {HTMLInputElement} */ (document.getElementById("name"));
    const email = /** @type {HTMLInputElement} */ (document.getElementById("email"));
    const budget = /** @type {HTMLSelectElement} */ (document.getElementById("budget"));
    const message = /** @type {HTMLTextAreaElement} */ (document.getElementById("message"));

    if (!name || !email || !budget || !message) return;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    if (!name.value.trim() || !emailOk || !budget.value || !message.value.trim()) {
      btn.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 320 });
      return;
    }

    btn.classList.add("is-sending");
    window.setTimeout(() => {
      btn.classList.remove("is-sending");
      fieldsWrap.hidden = true;
      success.hidden = false;
      burstConfetti();
      success.focus({ preventScroll: true });
    }, 650);
  };

  form.addEventListener("submit", handleSubmit);
};

/** ——— Boot ——— */
const init = () => {
  initPageLoader();
  initSceneCamera();
  initSmoothScroll();
  initCustomCursor();
  initMagnetic();
  initHero3D();
  initSplitText();
  initScramble();
  initSectionReveals();
  initTilt();
  initWorkScroll();
  initProcessLine();
  initCountUps();
  initForm();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
