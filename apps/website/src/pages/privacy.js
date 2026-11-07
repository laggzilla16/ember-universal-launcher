const { constants } = require('../../../../packages/shared');

function renderPrivacyPage({ basePath = '.' }) {
  return `
  <section class="page-hero privacy-hero">
    <div class="container">
      <div class="page-hero-header reveal-up">
        <span class="section-eyebrow">Transparency &amp; Data Practices</span>
        <h1 class="page-headline">Privacy Policy &amp; <span class="text-gradient">Terms</span></h1>
        <p class="page-lead">
          Accurate documentation of how ${constants.productFullName} handles your data locally on your PC, directly matching the policies shipped inside the desktop application.
        </p>
      </div>

      <div class="legal-grid reveal-up" data-delay="70">
        <!-- Privacy Policy Document (Synchronized with PRIVACY.md) -->
        <article class="legal-doc-card" id="privacy-policy">
          <div class="ldc-header">
            <span class="ldc-badge">Official Desktop Policy</span>
            <h2>NUKRON — Privacy Policy</h2>
            <p class="ldc-date">Last updated: October 28, 2026</p>
          </div>

          <div class="ldc-section">
            <h3>The short version</h3>
            <p>
              NUKRON runs on your PC and keeps your data on your PC. There are no accounts, no analytics, no ads, and no tracking.
            </p>
          </div>

          <div class="ldc-section">
            <h3>What NUKRON stores</h3>
            <p>
              Your game library (names, file paths, launch settings, groups), cover images you choose, your play sessions (start and end times), and your theme, overlay, startup, and consent choices. All of it is saved locally in <code>%APPDATA%\ember-launcher\</code> and is never uploaded.
            </p>
          </div>

          <div class="ldc-section">
            <h3>How playtime and performance are detected</h3>
            <p>
              To know when a game is running, NUKRON reads the file paths of running processes on your computer. When the optional performance overlay is enabled, NUKRON reads local hardware utilization and temperature sensors on your PC. This happens locally. NUKRON does not record, store, or send the list of your other programs or hardware telemetry.
            </p>
          </div>

          <div class="ldc-section">
            <h3>Network use</h3>
            <p>
              In the desktop application, the only network activity is checking GitHub for new versions and downloading updates from GitHub Releases. On this official website, your browser requests release metadata and installer downloads directly from the GitHub Releases API (<code>api.github.com</code> and <code>github.com</code>). Like any standard web request, this lets GitHub see your IP address and standard request headers under GitHub's own privacy statement. NUKRON sends no information about you, your games, or your playtime.
            </p>
          </div>

          <div class="ldc-section">
            <h3>Your control</h3>
            <p>
              You can edit or remove any game inside the app. To erase everything stored by the desktop launcher, uninstall NUKRON and delete the <code>%APPDATA%\ember-launcher\</code> folder.
            </p>
          </div>

          <div class="ldc-section">
            <h3>Changes and contact</h3>
            <p>
              If this policy changes, the new version ships with an update and the date above changes. Questions or issues can be submitted via GitHub:
              <a href="${constants.github.issuesUrl}" target="_blank" rel="noopener noreferrer">${constants.github.issuesUrl} ↗</a>
            </p>
          </div>
        </article>

        <!-- Terms of Service Summary (Synchronized with TERMS.md) + Pre-Publication Verification Box -->
        <div class="legal-side-col">
          <article class="legal-doc-card" id="terms">
            <div class="ldc-header">
              <span class="ldc-badge">Terms of Service</span>
              <h2>NUKRON — Terms of Service</h2>
              <p class="ldc-date">Last updated: October 28, 2026</p>
            </div>

            <div class="ldc-section">
              <h3>1. Using NUKRON</h3>
              <p>
                NUKRON is a free tool for launching games and tracking how long you play them. By using it you agree to these terms. If you do not agree, please do not use it.
              </p>
            </div>

            <div class="ldc-section">
              <h3>2. Play fair: use games you own</h3>
              <p>
                NUKRON works with games you have bought from any platform or store (Steam, Epic, GOG, Xbox, EA, Ubisoft, itch.io and others), standalone installers, and emulators running copies you legally own. NUKRON does not provide, find, share, or unlock games and does not bypass copy protection. You are solely responsible for the files you add to NUKRON and for following the laws and licence terms that apply to you.
              </p>
            </div>

            <div class="ldc-section">
              <h3>3. Your content</h3>
              <p>
                Games, trademarks, and artwork shown in NUKRON belong to their respective owners. Cover images are chosen by you, so make sure you are allowed to use them.
              </p>
            </div>

            <div class="ldc-section">
              <h3>4. No warranty &amp; Limitation of liability</h3>
              <p>
                NUKRON is provided “as is” without warranties of any kind. Playtime is detected by watching processes, so it may be slightly inaccurate. To the extent allowed by law, the authors are not liable for any damages arising from your use of NUKRON.
              </p>
            </div>
          </article>

          <!-- Required Pre-Publication Confirmation Notice (per Section 7 prompt guidelines) -->
          <aside class="verification-notice-card" aria-label="Items to confirm before public website publication">
            <h3>Website Publication Confirmation Notes</h3>
            <p>
              The policies above accurately reflect the NUKRON desktop application (<code>PRIVACY.md</code> and <code>TERMS.md</code>). Before publishing this website to a custom production domain, confirm the following hosting details:
            </p>
            <ul>
              <li><strong>Static Hosting Provider Logs:</strong> Confirm which static host (e.g., GitHub Pages, Cloudflare Pages, Vercel, or Netlify) serves the website and whether standard edge access logs apply.</li>
              <li><strong>Production Canonical Domain:</strong> Update the canonical base URL in <code>apps/website/src/components/layout.js</code> and <code>sitemap.xml</code> if deploying to a custom domain instead of <code>laggzilla16.github.io/ember-universal-launcher</code>.</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  </section>
  `;
}

module.exports = { renderPrivacyPage };

