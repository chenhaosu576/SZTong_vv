# Site Footer Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the client footer so it reflects the actual product, uses the approved product-introduction copy, and removes placeholder or misleading footer content.

**Architecture:** Keep the existing single-file footer component and update its content structure in place. Add one focused component test that locks the approved headings, body copy, and real route targets so future footer edits cannot silently regress back to placeholder content.

**Tech Stack:** Vue 3, Vue Test Utils, Vitest, Vite

---

### Task 1: Lock the approved footer content with a regression test

**Files:**
- Create: `src/components/common/__tests__/SiteFooter.spec.js`
- Modify: `src/components/common/SiteFooter.vue`

- [ ] **Step 1: Write the failing test**

Add a component test that mounts `SiteFooter` and asserts:
- the footer shows the headings `收智通`, `平台入口`, and `平台能做什么`
- the footer contains the approved product-introduction copy
- the footer renders real route targets for the platform entry links
- the old placeholder copy such as `生态科技认证` is absent

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SiteFooter`
Expected: FAIL because the current footer still renders old placeholder sections and copy.

- [ ] **Step 3: Write minimal implementation**

Update `src/components/common/SiteFooter.vue` to:
- replace placeholder navigation/resource blocks with the approved three-column structure
- replace fake or empty links with real `router-link` targets
- update the impact metric labels to product-appropriate wording
- remove decorative placeholder items that imply unsupported claims

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SiteFooter`
Expected: PASS

- [ ] **Step 5: Run broader verification**

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: PASS
