import { nextTick, onBeforeUnmount, onMounted } from "vue";

export function useRevealOnScroll(rootRef, options = {}) {
  const selector = options.selector || "[data-reveal]";
  const threshold = options.threshold ?? 0.12;
  let observer = null;

  function markVisible(node) {
    node.classList.add("is-visible");
  }

  function setup() {
    const rootEl = rootRef.value;
    if (!rootEl) return;

    const nodes = Array.from(rootEl.querySelectorAll(selector));
    if (!nodes.length) return;

    nodes.forEach((node) => {
      node.classList.add("reveal-ready");
    });

    if (!("IntersectionObserver" in window)) {
      nodes.forEach(markVisible);
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          markVisible(entry.target);
          observer?.unobserve(entry.target);
        });
      },
      {
        root: null,
        threshold,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    nodes.forEach((node) => {
      observer?.observe(node);
    });
  }

  onMounted(async () => {
    await nextTick();
    setup();
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });
}
