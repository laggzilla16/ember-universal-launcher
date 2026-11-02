const { constants } = require('../../../../packages/shared');

function renderAboutPage({ basePath = '.', baselineVersion = '1.4.2' }) {
  return `
  <section class="page-hero about-hero">
    <div class="container">
      <div class="page-hero-header reveal-up">
        <span class="section-eyebrow">About ${constants.productName}</span>
        <h1 class="page-headline">PC gaming deserves a <span class="text-gradient">better home.</span></h1>
      </div>

      <!-- Core Manifesto Block -->
      <div class="manifesto-card reveal-up" data-delay="80">
        <img src="${basePath}/assets/ember-logo.png" alt="Ember logo" width="60" height="60" class="manifesto-logo">
        <blockquote class="manifesto-quote">
          “Ember was created around a simple idea: PC gaming deserves a better home. A place that feels personal, stays out of your way, and makes the experience of managing your games a little better.”
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
          <h2 class="section-headline">What Ember stands for—and what we leave out.</h2>
        </div>

        <div class="principles-grid reveal-up">
          <article class="principle-item">
            <span class="pi-tag">Principle 01</span>
            <h3>Local by Design</h3>
            <p>
              Your game library, custom cover art, session timestamps, and preferences are stored locally in <code>%APPDATA%\ember-launcher\launcher.db</code> using Electron's built-in SQLite engine. Nothing is uploaded to external servers.
            </p>
          </article>

          <article class="principle-item">
            <span class="pi-tag">Principle 02</span>
            <h3>No Mandatory Accounts</h3>
            <p>
              You never have to create an account, verify an email address, or sign in to access your own games. Install Ember, add or scan your games, and play.
            </p>
          </article>

          <article class="principle-item">
            <span class="pi-tag">Principle 03</span>
            <h3>No Subscriptions or Upsells</h3>
            <p>
              Ember is free software. There are no subscription tiers, no advertisements, and no promotional storefronts competing for screen space.
            </p>
          </article>

          <article class="principle-item">
            <span class="pi-tag">Principle 04</span>
            <h3>Crafted Visual Identity</h3>
            <p>
              Built with Ember's custom <em>Liquid Glass</em> design system—combining deep charcoal surfaces, warm amber-to-crimson accents drawn from the Ember mark, and responsive typography in Unbounded and Inter.
            </p>
          </article>
        </div>
      </div>

      <!-- Technical Architecture Summary -->
      <div class="architecture-summary-card reveal-up">
        <div class="asc-copy">
          <span class="section-eyebrow">Under the Hood</span>
          <h2>Thoughtful Windows Engineering</h2>
          <p>
            Ember is built specifically for Windows 10 and Windows 11 using Electron, built-in <code>node:sqlite</code>, and a lightweight native C# telemetry &amp; process helper daemon. This architecture lets Ember detect running game processes, read Windows Start Menu / Store AppUserModelIDs, and render an in-game hardware overlay without third-party bloat.
          </p>
          <div class="asc-actions">
            <button type="button" class="btn btn-primary" data-ember-download>
              <span>Download Ember (<span data-ember-version>v${baselineVersion}</span>)</span>
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

