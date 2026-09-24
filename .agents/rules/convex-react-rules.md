---
trigger: always_on
description: Mandatory rules for Convex mutations, React inline styling, and CLI deployment workflows in Katarly.
---

# Convex & React Coding Rules for Katarly

## 1. Convex Storage URL Generation
- Always declare storage upload URL generators using zero-argument mutation signatures:
  ```ts
  export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  });
  ```
- Do NOT wrap storage upload URL mutations with `{ args: {}, handler: ... }` or throw custom authentication errors inside the upload URL generator.

## 2. React Inline Style Objects
- Inside TSX/JSX components, all inline style keys in `style={{ ... }}` MUST be written in **camelCase**:
  - `justifyContent` (not `justify-content`)
  - `lineHeight` (not `line-height`)
  - `marginTop` (not `margin-top`)

## 3. CLI Deployment Commands
- Commands requiring interactive browser login (e.g., `npx convex deploy` without a deploy key) must be clearly explained to the user for local terminal execution if background execution pauses.
