# FailureOps X — Figma Export & Design Assets Package

This package allows you to import and work with the complete **FailureOps X** platform (`https://failureops.shyxon.com/`) in **Figma** with full fidelity, layers, typography, colors, and Auto-Layout.

---

## 🚀 4 Ways to Get FailureOps X into Figma

### 1. ⚡ Method 1: Instant 1-Click Live Import (Highest Precision & Auto-Layout)
You can import the live site directly into Figma with real DOM hierarchy, text layers, and responsive auto-layout frames:

1. Open your Figma canvas.
2. Search and open the **[html.to.design](https://www.figma.com/community/plugin/1159123024924461424)** or **[Builder.io HTML to Figma](https://www.figma.com/community/plugin/747985167520967365)** plugin.
3. Paste the URL:
   ```text
   https://failureops.shyxon.com/
   ```
4. Choose **Desktop (1440px)** and/or **Mobile (375px)**.
5. Click **Import Page** — all frames, buttons, gradients, icons, and components will appear as native Figma layers!

> 💡 **Sub-page URLs you can also import directly**:
> - Overview & Briefing: `https://failureops.shyxon.com/projects/aurora/overview`
> - Evidence Feed: `https://failureops.shyxon.com/projects/aurora/evidence`
> - Failure DNA & Fingerprint: `https://failureops.shyxon.com/projects/aurora/dna`
> - Radar & Trajectories: `https://failureops.shyxon.com/projects/aurora/radar`
> - Causal Graph: `https://failureops.shyxon.com/projects/aurora/causal`
> - Organizational Memory: `https://failureops.shyxon.com/memory`
> - Dashboard: `https://failureops.shyxon.com/dashboard`

---

### 2. 🎨 Method 2: Drag & Drop Vector SVG Canvas (No Plugins Needed)
We have generated a standalone, high-fidelity vector design file:
- **File**: `failureops-figma-canvas.svg` (located in this project root)

**How to use:**
1. Drag `failureops-figma-canvas.svg` directly from your file manager onto any Figma canvas.
2. Figma instantly parses all layers into editable shapes, gradients, text blocks, and groups.
3. Includes:
   - Header with glowing FX badge & navigation
   - Hero headline with Cyber Amber gradient text
   - 11-step Continuous Organizational Reasoning Loop bar
   - 8 Core Intelligence Engine cards with icon badges & hover links
   - Project Aurora Walkthrough showcase banner
   - Obsidian Ember & Cyber Sol Color Swatches + Typography Specs
   - Enclave Encrypted Footer

---

### 3. 🧩 Method 3: Import Design Tokens & Variables (Figma Tokens / Tokens Studio)
- **File**: `figma-tokens.json` (located in this project root)

**How to use:**
1. Open the **Tokens Studio for Figma** plugin (or Figma native Variables JSON importer).
2. Click **Load Token Set** / **Import JSON**.
3. Select `figma-tokens.json`.
4. This loads the entire Obsidian Ember design system:
   - **Primary Brand**: Electric Amber (`#FF7A00`, `#FF9533`, `#CC5A00`)
   - **Surfaces**: Canvas Root (`#090B0E`), Cards (`#161B22`), Surface Feed (`#0F1319`)
   - **Semantic**: Critical/Destructive (`#FB7185`), Warning (`#F97316`), Success (`#10B981`), Info (`#38BDF8`), Magic (`#A855F7`)
   - **Typography**: Inter (Body/Headings) & JetBrains Mono (Badges/Metrics)
   - **Border Radius & Shadows**: Amber ambient glows & 1px micro-borders

---

### 4. 🛠️ Method 4: Programmatic Auto-Scaffolder Script (Figma Plugin / Scripter)
- **File**: `failureops-figma-scaffolder.js` (located in this project root)

**How to use:**
1. Open Figma and run the **Scripter** plugin (or Figma Plugin Developer Console).
2. Paste the contents of `failureops-figma-scaffolder.js`.
3. Click **Run** — it programmatically creates Auto-Layout frames, styles, typography hierarchy, and engine cards directly on your Figma page.

---

## 📦 Generated Files Summary in Repository

| File | Purpose | Usage in Figma |
|:---|:---|:---|
| `failureops-figma-canvas.svg` | Full Landing Page & Design System SVG | Drag & drop into Figma canvas |
| `figma-tokens.json` | Design Tokens (W3C / Tokens Studio) | Import via Tokens Studio / Figma Variables |
| `failureops-figma-scaffolder.js` | Programmatic UI Generator Script | Run via Scripter or Figma Plugin Console |
| `FIGMA_EXPORT.md` | Complete Export Guide & URL list | Reference & step-by-step instructions |

