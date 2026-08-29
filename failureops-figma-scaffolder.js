// =======================================================================
// FailureOps X — Figma Auto-Scaffolder & Design System Generator
// Compatible with: Figma Scripter Plugin / Figma Plugin API / Console
// =======================================================================

async function runFailureOpsScaffolder() {
  console.log("⚡ Starting FailureOps X Figma Scaffolder...");

  // 1. Load Fonts
  await figma.loadFontAsync({ family: "Inter", style: "Regular" }).catch(() => {});
  await figma.loadFontAsync({ family: "Inter", style: "Medium" }).catch(() => {});
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }).catch(() => {});
  await figma.loadFontAsync({ family: "Inter", style: "Bold" }).catch(() => {});
  await figma.loadFontAsync({ family: "Inter", style: "Extra Bold" }).catch(() => {});

  // 2. Color Palette Definitions (Obsidian Ember & Cyber Sol)
  const COLORS = {
    bg: { r: 0.035, g: 0.043, b: 0.055 }, // #090B0E
    surfaceFeed: { r: 0.059, g: 0.075, b: 0.098 }, // #0F1319
    card: { r: 0.086, g: 0.106, b: 0.133 }, // #161B22
    cardHover: { r: 0.110, g: 0.137, b: 0.176 }, // #1C232D
    border: { r: 0.180, g: 0.220, b: 0.275 }, // #2E3846
    primary: { r: 1.0, g: 0.478, b: 0.0 }, // #FF7A00
    primaryHover: { r: 1.0, g: 0.584, b: 0.2 }, // #FF9533
    textPrimary: { r: 0.973, g: 0.980, b: 0.988 }, // #F8FAFC
    textMuted: { r: 0.580, g: 0.639, b: 0.722 }, // #94A3B8
    destructive: { r: 0.984, g: 0.443, b: 0.522 }, // #FB7185
    success: { r: 0.063, g: 0.725, b: 0.506 }, // #10B981
    info: { r: 0.220, g: 0.741, b: 0.973 }, // #38BDF8
    magic: { r: 0.659, g: 0.333, b: 0.969 }, // #A855F7
    white: { r: 1, g: 1, b: 1 },
  };

  // Helper for text creation
  function createText(text, size = 14, weight = "Regular", color = COLORS.textPrimary, letterSpacing = 0) {
    const node = figma.createText();
    node.fontName = { family: "Inter", style: weight };
    node.characters = text;
    node.fontSize = size;
    node.fills = [{ type: "SOLID", color: color }];
    if (letterSpacing !== 0) {
      node.letterSpacing = { value: letterSpacing, unit: "PIXELS" };
    }
    return node;
  }

  // 3. Create Main Canvas Frame (1440 x 2400)
  const mainFrame = figma.createFrame();
  mainFrame.name = "FailureOps X — Web Landing & Intelligence Overview";
  mainFrame.resize(1440, 2400);
  mainFrame.fills = [{ type: "SOLID", color: COLORS.bg }];
  mainFrame.layoutMode = "VERTICAL";
  mainFrame.primaryAxisSizingMode = "AUTO";
  mainFrame.counterAxisSizingMode = "FIXED";
  mainFrame.itemSpacing = 48;
  mainFrame.paddingTop = 0;
  mainFrame.paddingBottom = 64;
  mainFrame.paddingLeft = 0;
  mainFrame.paddingRight = 0;

  // --- HEADER / NAVBAR ---
  const header = figma.createFrame();
  header.name = "Header / Navbar";
  header.resize(1440, 68);
  header.layoutMode = "HORIZONTAL";
  header.primaryAxisAlignItems = "SPACE_BETWEEN";
  header.counterAxisAlignItems = "CENTER";
  header.paddingLeft = 64;
  header.paddingRight = 64;
  header.paddingTop = 14;
  header.paddingBottom = 14;
  header.fills = [{ type: "SOLID", color: { ...COLORS.bg, a: 0.85 } }];
  header.strokes = [{ type: "SOLID", color: COLORS.border }];
  header.strokeWeight = 1;

  // Logo Group
  const logoGroup = figma.createFrame();
  logoGroup.name = "Brand / Logo";
  logoGroup.layoutMode = "HORIZONTAL";
  logoGroup.counterAxisAlignItems = "CENTER";
  logoGroup.itemSpacing = 12;
  logoGroup.fills = [];

  const logoBadge = figma.createFrame();
  logoBadge.resize(36, 36);
  logoBadge.cornerRadius = 10;
  logoBadge.fills = [{
    type: "GRADIENT_LINEAR",
    gradientStops: [
      { position: 0, color: { r: 1.0, g: 0.478, b: 0.0, a: 1 } },
      { position: 1, color: { r: 0.882, g: 0.114, b: 0.282, a: 1 } }
    ],
    gradientTransform: [[1, 0, 0], [0, 1, 0]]
  }];
  logoBadge.layoutMode = "HORIZONTAL";
  logoBadge.primaryAxisAlignItems = "CENTER";
  logoBadge.counterAxisAlignItems = "CENTER";
  const logoText = createText("FX", 14, "Extra Bold", COLORS.white);
  logoBadge.appendChild(logoText);
  logoGroup.appendChild(logoBadge);

  const titleGroup = figma.createFrame();
  titleGroup.layoutMode = "VERTICAL";
  titleGroup.itemSpacing = 2;
  titleGroup.fills = [];
  const brandTitle = createText("FAILUREOPS X", 15, "Extra Bold", COLORS.textPrimary, 1);
  const brandSubtitle = createText("ORGANIZATIONAL EARLY-WARNING", 9, "Semi Bold", COLORS.textMuted, 1.5);
  titleGroup.appendChild(brandTitle);
  titleGroup.appendChild(brandSubtitle);
  logoGroup.appendChild(titleGroup);
  header.appendChild(logoGroup);

  // Header Nav Items & CTA
  const navActions = figma.createFrame();
  navActions.layoutMode = "HORIZONTAL";
  navActions.counterAxisAlignItems = "CENTER";
  navActions.itemSpacing = 16;
  navActions.fills = [];

  const dashboardLink = createText("Dashboard", 13, "Semi Bold", COLORS.textMuted);
  navActions.appendChild(dashboardLink);

  const liveDemoBtn = figma.createFrame();
  liveDemoBtn.name = "CTA: Live Aurora Demo";
  liveDemoBtn.layoutMode = "HORIZONTAL";
  liveDemoBtn.counterAxisAlignItems = "CENTER";
  liveDemoBtn.paddingLeft = 16;
  liveDemoBtn.paddingRight = 16;
  liveDemoBtn.paddingTop = 8;
  liveDemoBtn.paddingBottom = 8;
  liveDemoBtn.cornerRadius = 8;
  liveDemoBtn.fills = [{ type: "SOLID", color: COLORS.primary }];
  const demoText = createText("Live Aurora Demo →", 12, "Bold", COLORS.white);
  liveDemoBtn.appendChild(demoText);
  navActions.appendChild(liveDemoBtn);

  header.appendChild(navActions);
  mainFrame.appendChild(header);

  // --- HERO SECTION ---
  const heroSection = figma.createFrame();
  heroSection.name = "Hero Section";
  heroSection.layoutMode = "VERTICAL";
  heroSection.primaryAxisAlignItems = "CENTER";
  heroSection.counterAxisAlignItems = "CENTER";
  heroSection.itemSpacing = 20;
  heroSection.paddingLeft = 64;
  heroSection.paddingRight = 64;
  heroSection.paddingTop = 32;
  heroSection.paddingBottom = 20;
  heroSection.fills = [];

  // Pill badge
  const heroPill = figma.createFrame();
  heroPill.layoutMode = "HORIZONTAL";
  heroPill.counterAxisAlignItems = "CENTER";
  heroPill.paddingLeft = 14;
  heroPill.paddingRight = 14;
  heroPill.paddingTop = 6;
  heroPill.paddingBottom = 6;
  heroPill.cornerRadius = 999;
  heroPill.fills = [{ type: "SOLID", color: { r: 1.0, g: 0.478, b: 0.0, a: 0.12 } }];
  heroPill.strokes = [{ type: "SOLID", color: { r: 1.0, g: 0.478, b: 0.0, a: 0.35 } }];
  const pillText = createText("✨ Autonomous Failure Prediction & Organizational Memory", 12, "Semi Bold", COLORS.primary);
  heroPill.appendChild(pillText);
  heroSection.appendChild(heroPill);

  // Headline
  const headline = createText("See the failure signals\nbefore they become failure.", 52, "Extra Bold", COLORS.textPrimary, -1.2);
  headline.textAlignHorizontal = "CENTER";
  heroSection.appendChild(headline);

  // Subtitle
  const subtitle = createText("Connect fragmented organizational evidence, detect hidden failure patterns, predict what could go wrong next, and learn from interventions that actually worked.", 16, "Regular", COLORS.textMuted);
  subtitle.textAlignHorizontal = "CENTER";
  subtitle.resize(780, subtitle.height);
  heroSection.appendChild(subtitle);

  // CTA Button Row
  const heroBtnRow = figma.createFrame();
  heroBtnRow.layoutMode = "HORIZONTAL";
  heroBtnRow.itemSpacing = 16;
  heroBtnRow.fills = [];

  const ctaBtn1 = figma.createFrame();
  ctaBtn1.layoutMode = "HORIZONTAL";
  ctaBtn1.counterAxisAlignItems = "CENTER";
  ctaBtn1.paddingLeft = 24;
  ctaBtn1.paddingRight = 24;
  ctaBtn1.paddingTop = 14;
  ctaBtn1.paddingBottom = 14;
  ctaBtn1.cornerRadius = 12;
  ctaBtn1.fills = [{ type: "SOLID", color: COLORS.primary }];
  const cta1Text = createText("Analyze a Product →", 14, "Bold", COLORS.white);
  ctaBtn1.appendChild(cta1Text);
  heroBtnRow.appendChild(ctaBtn1);

  const ctaBtn2 = figma.createFrame();
  ctaBtn2.layoutMode = "HORIZONTAL";
  ctaBtn2.counterAxisAlignItems = "CENTER";
  ctaBtn2.paddingLeft = 24;
  ctaBtn2.paddingRight = 24;
  ctaBtn2.paddingTop = 14;
  ctaBtn2.paddingBottom = 14;
  ctaBtn2.cornerRadius = 12;
  ctaBtn2.fills = [{ type: "SOLID", color: COLORS.card }];
  ctaBtn2.strokes = [{ type: "SOLID", color: COLORS.border }];
  const cta2Text = createText("Explore Organizational Memory", 14, "Semi Bold", COLORS.textPrimary);
  ctaBtn2.appendChild(cta2Text);
  heroBtnRow.appendChild(ctaBtn2);

  heroSection.appendChild(heroBtnRow);
  mainFrame.appendChild(heroSection);

  // --- CONTINUOUS REASONING LOOP BAR ---
  const loopContainer = figma.createFrame();
  loopContainer.name = "Continuous Reasoning Loop (11 Steps)";
  loopContainer.resize(1312, 140);
  loopContainer.layoutMode = "VERTICAL";
  loopContainer.paddingLeft = 24;
  loopContainer.paddingRight = 24;
  loopContainer.paddingTop = 16;
  loopContainer.paddingBottom = 16;
  loopContainer.cornerRadius = 16;
  loopContainer.fills = [{ type: "SOLID", color: COLORS.surfaceFeed }];
  loopContainer.strokes = [{ type: "SOLID", color: COLORS.border }];

  const loopHeader = figma.createFrame();
  loopHeader.layoutMode = "HORIZONTAL";
  loopHeader.primaryAxisAlignItems = "SPACE_BETWEEN";
  loopHeader.fills = [];
  loopHeader.resize(1264, 24);
  const loopTitle = createText("● CONTINUOUS ORGANIZATIONAL REASONING LOOP", 11, "Bold", COLORS.primary, 1);
  const loopBadge = createText("Autonomous Reasoning Graph Active", 11, "Regular", COLORS.textMuted);
  loopHeader.appendChild(loopTitle);
  loopHeader.appendChild(loopBadge);
  loopContainer.appendChild(loopHeader);

  const loopStepsRow = figma.createFrame();
  loopStepsRow.layoutMode = "HORIZONTAL";
  loopStepsRow.counterAxisAlignItems = "CENTER";
  loopStepsRow.itemSpacing = 8;
  loopStepsRow.fills = [];

  const steps = [
    { title: "Evidence", step: "Step 1", active: true },
    { title: "Signals", step: "Step 2" },
    { title: "Patterns", step: "Step 3" },
    { title: "Failure DNA", step: "Step 4" },
    { title: "Historical", step: "Step 5" },
    { title: "Failure Radar", step: "Step 6" },
    { title: "Prediction", step: "Step 7" },
    { title: "Intervention", step: "Step 8" },
    { title: "Experiment", step: "Step 9" },
    { title: "Verification", step: "Step 10" },
    { title: "Org Memory", step: "Step 11" }
  ];

  steps.forEach((s) => {
    const stepCard = figma.createFrame();
    stepCard.resize(102, 68);
    stepCard.layoutMode = "VERTICAL";
    stepCard.primaryAxisAlignItems = "CENTER";
    stepCard.counterAxisAlignItems = "CENTER";
    stepCard.cornerRadius = 10;
    stepCard.itemSpacing = 3;
    if (s.active) {
      stepCard.fills = [{ type: "SOLID", color: { r: 1.0, g: 0.478, b: 0.0, a: 0.18 } }];
      stepCard.strokes = [{ type: "SOLID", color: COLORS.primary }];
    } else {
      stepCard.fills = [{ type: "SOLID", color: COLORS.card }];
      stepCard.strokes = [{ type: "SOLID", color: COLORS.border }];
    }
    const t = createText(s.title, 11, "Semi Bold", s.active ? COLORS.primary : COLORS.textPrimary);
    const sub = createText(s.step, 9, "Regular", COLORS.textMuted);
    stepCard.appendChild(t);
    stepCard.appendChild(sub);
    loopStepsRow.appendChild(stepCard);
  });
  loopContainer.appendChild(loopStepsRow);
  mainFrame.appendChild(loopContainer);

  // --- 8 CORE INTELLIGENCE ENGINES GRID ---
  const enginesSection = figma.createFrame();
  enginesSection.name = "Core Intelligence Engines Grid";
  enginesSection.layoutMode = "VERTICAL";
  enginesSection.itemSpacing = 24;
  enginesSection.paddingLeft = 64;
  enginesSection.paddingRight = 64;
  enginesSection.fills = [];

  const engineTitle = createText("CORE INTELLIGENCE ENGINES", 12, "Bold", COLORS.primary, 1.5);
  const engineSubtitle = createText("From Weak Telemetry to Validated Institutional Memory", 24, "Bold", COLORS.textPrimary);
  enginesSection.appendChild(engineTitle);
  enginesSection.appendChild(engineSubtitle);

  const engineGrid = figma.createFrame();
  engineGrid.layoutMode = "HORIZONTAL";
  engineGrid.layoutWrap = "WRAP";
  engineGrid.itemSpacing = 20;
  engineGrid.counterAxisSpacing = 20;
  engineGrid.fills = [];
  engineGrid.resize(1312, 500);

  const engineData = [
    { title: "Evidence Intelligence", desc: "Ingests fragmented PRDs, customer feedback, CI/CD telemetry, and Jira metrics into an encrypted reasoning enclave." },
    { title: "Failure DNA", desc: "Generates a multidimensional vector fingerprint (Technical, Operational, Adoption, Execution, Customer) describing the failure archetype." },
    { title: "Truth Engine", desc: "Empirically challenges team dogma and assumptions against cross-source reality (e.g. pricing vs onboarding friction)." },
    { title: "Historical Memory", desc: "Cross-references current failure trajectories against verified past cases to uncover identical failure precedents." },
    { title: "Failure Radar", desc: "Continuously monitors weak signal escalation and forecasts the most probable future failure milestones." },
    { title: "Causal Reasoning", desc: "Constructs causal failure cascade graphs linking team overload and flaky CI directly to missed delivery horizons." },
    { title: "Evidence-Backed Interventions", desc: "Synthesizes targeted operational recovery playbooks backed by empirical success rates in similar historical products." },
    { title: "Outcome Verification", desc: "Tracks A/B cohort experiments to measure real metric lift and stores validated learnings into institutional memory." }
  ];

  engineData.forEach((e) => {
    const card = figma.createFrame();
    card.resize(308, 220);
    card.layoutMode = "VERTICAL";
    card.primaryAxisAlignItems = "SPACE_BETWEEN";
    card.paddingLeft = 20;
    card.paddingRight = 20;
    card.paddingTop = 20;
    card.paddingBottom = 20;
    card.cornerRadius = 14;
    card.fills = [{ type: "SOLID", color: COLORS.card }];
    card.strokes = [{ type: "SOLID", color: COLORS.border }];

    const topBlock = figma.createFrame();
    topBlock.layoutMode = "VERTICAL";
    topBlock.itemSpacing = 10;
    topBlock.fills = [];

    const cardTitle = createText(e.title, 15, "Bold", COLORS.textPrimary);
    const cardDesc = createText(e.desc, 12, "Regular", COLORS.textMuted);
    cardDesc.resize(268, cardDesc.height);

    topBlock.appendChild(cardTitle);
    topBlock.appendChild(cardDesc);
    card.appendChild(topBlock);

    const inspectLink = createText("Inspect Engine →", 12, "Semi Bold", COLORS.primary);
    card.appendChild(inspectLink);

    engineGrid.appendChild(card);
  });
  enginesSection.appendChild(engineGrid);
  mainFrame.appendChild(enginesSection);

  // Position frame on viewport
  figma.currentPage.appendChild(mainFrame);
  figma.viewport.scrollAndZoomIntoView([mainFrame]);

  console.log("✅ FailureOps X Figma Scaffolding complete!");
}

runFailureOpsScaffolder();
