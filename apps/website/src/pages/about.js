const { constants } = require('../../../../packages/shared');

function renderAboutPage({ basePath = '.', baselineVersion = '1.5.0' }) {
  return `
  <section class="page-hero about-hero">
    <div class="container">
      <div class="page-hero-header reveal-up">
        <span class="section-eyebrow">About ${constants.productName}</span>
        <h1 class="page-headline">PC gaming deserves a <span class="text-gradient">better home.</span></h1>
      </div>

      <!-- Core Manifesto Block -->
      <div class="manifesto-card glass-optical reveal-up" data-delay="80">
        <img src="${basePath}/assets/nukron-logo.svg" alt="NUKRON emblem" width="64" height="64" class="manifesto-logo">
        <blockquote class="manifesto-quote">
          “NUKRON was created around a simple idea: PC gaming deserves a better home. A place that feels personal, stays out of your way, and makes the experience of managing your games a little better.”
        </blockquote>
        <p class="manifesto-body">
          Modern PC gaming is richer than ever, yet the software surrounding it has grown increasingly noisy. Launching a single game often means navigating mandatory account logins, pop-up store promotions, background cloud syncs, and fragmented libraries.
        </p>
        <p class="manifesto-body">
          <strong>${constants.productFullName}</strong> takes a quieter path. It is a dedicated Windows desktop application built to organize the games you already own—across storefronts, standalone installers, and emulators—while keeping every byte of your library and playtime history on your own computer.
        </p>
      </div>

      <!-- Brand Principles Grid -->
      <div class="principles-section section-spacer">
        <div class="section-title-block reveal-up">
          <span class="section-eyebrow">Core Principles</span>
          <h2 class="section-headline">What NUKRON stands for—and what we leave out.</h2>
        </div>

        <div class="principles-grid reveal-up">
          <article class="principle-item glass-frosted">
            <span class="pi-tag">Principle 01</span>
            <h3>Local by Design</h3>
            <p>
              Your game library, custom cover art, session timestamps, and preferences are stored locally in <code>%APPDATA%\ember-launcher\launcher.db</code> using Electron's built-in SQLite engine. Nothing is uploaded to external servers.
            </p>
          </article>

          <article class="principle-item glass-frosted">
            <span class="pi-tag">Principle 02</span>
            <h3>No Mandatory Accounts</h3>
            <p>
              You never have to create an account, verify an email address, or sign in to access your own games. Install NUKRON, add or scan your games, and play.
            </p>
          </article>

          <article class="principle-item glass-frosted">
            <span class="pi-tag">Principle 03</span>
            <h3>No Subscriptions or Upsells</h3>
            <p>
              NUKRON is free software. There are no subscription tiers, no advertisements, and no promotional storefronts competing for screen space.
            </p>
          </article>

          <article class="principle-item glass-frosted">
            <span class="pi-tag">Principle 04</span>
            <h3>Snell's Law Optical Glass Identity</h3>
            <p>
              Built with NUKRON's custom <em>Optical Glass</em> design system—combining Deep Midnight surfaces, Electric Blue and Crimson Red refractive accents inspired by Snell's Law (<code>n₁ sin(θ₁) = n₂ sin(θ₂)</code>), and responsive typography in Unbounded and Inter.
            </p>
          </article>
        </div>
      </div>

      <!-- NUKRON Optical Glass & Visual Identity System Specimen -->
      <div class="identity-specimen-section section-spacer">
        <div class="section-title-block reveal-up">
          <span class="section-eyebrow">Design System &amp; Physics Reference</span>
          <h2 class="section-headline">Snell's Law Optical Glass Architecture</h2>
          <p class="section-subcopy">
            Both the NUKRON desktop application and this official website share a unified optical material system modeled on light refraction through layered glass substrates: <code>n₁ sin(θ₁) = n₂ sin(θ₂)</code>.
          </p>
        </div>

        <!-- 3 Optical Glass Material Tiers -->
        <div class="glass-specimen-grid reveal-up">
          <article class="glass-tier-card glass-clear">
            <div class="gtc-head">
              <span class="gtc-badge">Tier 01 · n = 1.46</span>
              <code>.glass-clear</code>
            </div>
            <h3>Clear Glass</h3>
            <p>72% translucent substrate with <code>blur(14px) saturate(140%)</code> and a 1px upper-left specular Fresnel highlight. Used for navigation headers, status pills, and secondary HUD floating layers.</p>
          </article>

          <article class="glass-tier-card glass-frosted">
            <div class="gtc-head">
              <span class="gtc-badge">Tier 02 · n = 1.52</span>
              <code>.glass-frosted</code>
            </div>
            <h3>Frosted Glass</h3>
            <p>82% layered midnight surface with <code>blur(20px) saturate(150%)</code>, internal light falloff, and reflective borders. Used for library panels, documentation cards, and interactive studios.</p>
          </article>

          <article class="glass-tier-card glass-optical">
            <div class="gtc-head">
              <span class="gtc-badge">Tier 03 · n = 1.62</span>
              <code>.glass-optical</code>
            </div>
            <h3>Optical Accent Glass</h3>
            <p>88% deep refractive glass with <code>blur(24px) saturate(165%)</code> and dual-wavelength chromatic edge dispersion pairing Electric Blue (<code>#2563EB</code>) with Crimson Red (<code>#E63946</code>).</p>
          </article>
        </div>

        <!-- Official Palette Swatches -->
        <div class="palette-specimen-grid reveal-up" data-delay="60">
          <div class="swatch-card glass-frosted">
            <div class="swatch-color" style="background: #2563EB; box-shadow: 0 0 20px rgba(37,99,235,0.45);"></div>
            <div class="swatch-meta">
              <strong>Electric Blue</strong>
              <code>#2563EB</code>
              <span>Primary Interactive</span>
            </div>
          </div>
          <div class="swatch-card glass-frosted">
            <div class="swatch-color" style="background: #E63946; box-shadow: 0 0 20px rgba(230,57,70,0.4);"></div>
            <div class="swatch-meta">
              <strong>Crimson Red</strong>
              <code>#E63946</code>
              <span>Controlled Accent</span>
            </div>
          </div>
          <div class="swatch-card glass-frosted">
            <div class="swatch-color" style="background: #090D19; border: 1px solid rgba(255,255,255,0.14);"></div>
            <div class="swatch-meta">
              <strong>Deep Midnight</strong>
              <code>#090D19</code>
              <span>Primary Canvas</span>
            </div>
          </div>
          <div class="swatch-card glass-frosted">
            <div class="swatch-color" style="background: #111827; border: 1px solid rgba(255,255,255,0.14);"></div>
            <div class="swatch-meta">
              <strong>Secondary Navy</strong>
              <code>#111827</code>
              <span>Elevated Panel</span>
            </div>
          </div>
          <div class="swatch-card glass-frosted">
            <div class="swatch-color" style="background: #172033; border: 1px solid rgba(255,255,255,0.14);"></div>
            <div class="swatch-meta">
              <strong>Surface Slate</strong>
              <code>#172033</code>
              <span>Glass Substrate</span>
            </div>
          </div>
          <div class="swatch-card glass-frosted">
            <div class="swatch-color" style="background: #F8FAFC;"></div>
            <div class="swatch-meta">
              <strong>Primary Text</strong>
              <code>#F8FAFC</code>
              <span>Crisp Alabaster</span>
            </div>
          </div>
          <div class="swatch-card glass-frosted">
            <div class="swatch-color" style="background: #AAB6CC;"></div>
            <div class="swatch-meta">
              <strong>Secondary Text</strong>
              <code>#AAB6CC</code>
              <span>Muted Cool Slate</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Technical Architecture Summary -->
      <div class="architecture-summary-card glass-optical reveal-up">
        <div class="asc-copy">
          <span class="section-eyebrow">Under the Hood</span>
          <h2>Thoughtful Windows Engineering</h2>
          <p>
            NUKRON is built specifically for Windows 10 and Windows 11 using Electron, built-in <code>node:sqlite</code>, and a lightweight native C# telemetry &amp; process helper daemon. This architecture lets NUKRON detect running game processes, read Windows Start Menu / Store AppUserModelIDs, and render an in-game hardware overlay without third-party bloat.
          </p>
          <div class="asc-actions">
            <button type="button" class="btn btn-primary" data-nukron-download>
              <span>Download NUKRON (<span data-nukron-version>v${baselineVersion}</span>)</span>
            </button>
            <a href="${constants.github.repoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-glass">
              Explore Repository on GitHub ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
  `;
}

module.exports = { renderAboutPage };
