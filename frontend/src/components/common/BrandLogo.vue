<script setup>
import brandLogoMark from "../../assets/brand-logo-mark.png";

const props = defineProps({
  variant: {
    type: String,
    default: "nav",
    validator: (value) => ["nav", "footer"].includes(value),
  },
  title: {
    type: String,
    default: "收智通",
  },
  subtitle: {
    type: String,
    default: "SZTong",
  },
});
</script>

<template>
  <span :class="['brand-logo', `brand-logo--${props.variant}`]">
    <span class="brand-logo__mark" aria-hidden="true">
      <img class="brand-logo__image" :src="brandLogoMark" alt="" />
    </span>

    <span class="brand-logo__copy">
      <strong class="brand-logo__title">{{ props.title }}</strong>
      <small class="brand-logo__subtitle">{{ props.subtitle }}</small>
    </span>
  </span>
</template>

<style scoped>
.brand-logo {
  --logo-mark-size: 2.35rem;
  --logo-gap: 0.72rem;
  --logo-title-size: 1.02rem;
  --logo-subtitle-size: 0.64rem;
  --logo-subtitle-spacing: 0.18em;
  --logo-copy-gap: 0.18rem;
  --logo-title-color: var(--ink-900, #183023);
  --logo-subtitle-color: rgba(72, 102, 90, 0.84);
  display: inline-flex;
  align-items: center;
  gap: var(--logo-gap);
  min-width: 0;
}

.brand-logo--footer {
  --logo-mark-size: 3.7rem;
  --logo-gap: 0.94rem;
  --logo-title-size: 1.62rem;
  --logo-subtitle-size: 0.76rem;
  --logo-subtitle-spacing: 0.26em;
  --logo-copy-gap: 0.32rem;
}

.brand-logo__mark {
  width: var(--logo-mark-size);
  height: var(--logo-mark-size);
  flex: 0 0 var(--logo-mark-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.brand-logo__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(23, 69, 47, 0.12));
}

.brand-logo__copy {
  min-width: 0;
  display: grid;
  gap: var(--logo-copy-gap);
}

.brand-logo__title {
  color: var(--logo-title-color);
  font-family: var(--font-display, "Plus Jakarta Sans", sans-serif);
  font-size: var(--logo-title-size);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.02;
  white-space: nowrap;
}

.brand-logo__subtitle {
  color: var(--logo-subtitle-color);
  font-family: var(--font-data, "IBM Plex Sans", sans-serif);
  font-size: var(--logo-subtitle-size);
  font-weight: 700;
  letter-spacing: var(--logo-subtitle-spacing);
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .brand-logo--nav {
    --logo-mark-size: 2.18rem;
    --logo-gap: 0.62rem;
    --logo-title-size: 0.96rem;
    --logo-subtitle-size: 0.58rem;
    --logo-subtitle-spacing: 0.14em;
  }
}

@media (max-width: 560px) {
  .brand-logo--nav {
    --logo-mark-size: 2rem;
    --logo-gap: 0.52rem;
    --logo-title-size: 0.9rem;
    --logo-subtitle-size: 0.54rem;
    --logo-subtitle-spacing: 0.12em;
  }

  .brand-logo--footer {
    --logo-mark-size: 3.2rem;
    --logo-title-size: 1.42rem;
  }
}

@media (prefers-color-scheme: dark) {
  .brand-logo {
    --logo-title-color: #e3efe5;
    --logo-subtitle-color: rgba(205, 224, 211, 0.78);
  }

  .brand-logo__image {
    filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.24));
  }
}
</style>
