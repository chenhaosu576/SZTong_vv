<script setup>
import { onMounted, onUnmounted, ref } from "vue";

const canvasRef = ref(null);
let animationId = null;

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  // Aurora particles configuration
  const particles = [];
  const particleCount = 6;

  // Colors: white and green tones
  const colors = [
    { r: 255, g: 255, b: 255 }, // white
    { r: 144, g: 238, b: 144 }, // light green
    { r: 107, g: 180, b: 134 }, // sage green
    { r: 76, g: 175, b: 80 }, // green
    { r: 200, g: 230, b: 201 }, // mint
  ];

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = height * 0.3 + Math.random() * height * 0.4;
      this.radius = 150 + Math.random() * 250;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = 0.15 + Math.random() * 0.25;
      this.blur = 80 + Math.random() * 100;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      // Bounce off edges
      if (this.x < -this.radius) this.x = width + this.radius;
      if (this.x > width + this.radius) this.x = -this.radius;
      if (this.y < height * 0.2) this.y = height * 0.2;
      if (this.y > height * 0.8) this.y = height * 0.8;
    }

    draw(ctx) {
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.radius
      );
      gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`);
      gradient.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity * 0.5})`);
      gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  // Initialize particles
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Draw each particle
    particles.forEach(particle => {
      particle.update();
      particle.draw(ctx);
    });

    animationId = requestAnimationFrame(animate);
  }

  animate();

  // Handle resize
  const handleResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };

  window.addEventListener("resize", handleResize);

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
});
</script>

<template>
  <canvas ref="canvasRef" class="aurora-background"></canvas>
</template>

<style scoped>
.aurora-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
