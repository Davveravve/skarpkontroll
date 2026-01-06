// src/pages/PrivacyPage.js - Privacy Policy
import React from 'react';
import './TermsPage.css'; // Använd samma CSS

const PrivacyPage = () => {
  return (
    <div className="terms-page">
      <div className="terms-container">
        {/* Header */}
        <header className="terms-header">
          <h1>Integritetspolicy</h1>
          <p className="terms-last-updated">Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}</p>
        </header>

        {/* Content */}
        <div className="terms-content">
          {/* Section 1 */}
          <section className="terms-section">
            <h2>1. Vår inställning till din integritet</h2>
            <p>
              Din integritet är viktig för oss. SkarpKontroll är utformad med integritet i fokus från
              första dag. Vi sparar minimal data, använder ingen spårning och delar aldrig dina uppgifter
              med tredjeparter.
            </p>
          </section>

          {/* Section 2 */}
          <section className="terms-section">
            <h2>2. Vilken data samlar vi in?</h2>
            <p className="section-intro">
              Vi samlar endast in data som du aktivt tillhandahåller:
            </p>

            <div className="data-categories">
              <div className="data-category">
                <h3>Data du anger vid registrering</h3>
                <ul>
                  <li>E-postadress</li>
                  <li>Lösenord (lagras krypterat)</li>
                  <li>Ditt namn/kontaktperson</li>
                  <li>Telefonnummer (valfritt)</li>
                </ul>
              </div>

              <div className="data-category">
                <h3>Data du anger när du använder appen</h3>
                <ul>
                  <li>Teamnamn och inställningar</li>
                  <li>Kundnamn och adresser</li>
                  <li>Kontrolldata och iakttagelser</li>
                  <li>Bilder och dokumentation</li>
                  <li>Profililinformation (valfritt)</li>
                </ul>
              </div>

              <div className="data-category">
                <h3>Data vi samlar automatiskt</h3>
                <ul>
                  <li>Din senaste inloggning (för säkerhet)</li>
                  <li>Datum för när data skapas och uppdateras</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="terms-section">
            <h2>3. Hur använder vi din data?</h2>
            <p>
              Din data används för:
            </p>
            <ul>
              <li>✓ Möjliggöra att du kan logga in och använda SkarpKontroll</li>
              <li>✓ Lagra och visa dina kontroller och dokumentation</li>
              <li>✓ Generera PDF-rapporter</li>
              <li>✓ Möjliggöra samarbete i team</li>
              <li>✓ Skicka viktiga meddelanden (t.ex. lösenordsåterställning)</li>
              <li>✓ Förbättra säkerhet och stabilitet</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="terms-section">
            <h2>4. Vi delar ALDRIG din data</h2>
            <p className="highlight">
              Vi delar aldrig dina personuppgifter eller kontrolldata med:
            </p>
            <ul>
              <li>Marknadsföringsföretag eller annonsörer</li>
              <li>Analytikföretag eller spårningsföretag</li>
              <li>Sociala medier eller tredjeparts-API:er</li>
              <li>Andra användare utanför ditt team</li>
            </ul>
            <p style={{ marginTop: '16px', fontStyle: 'italic' }}>
              Vi sparar inte data för försäljning, och vi säljer aldrig användardata.
            </p>
          </section>

          {/* Section 5 */}
          <section className="terms-section">
            <h2>5. Lagring och säkerhet</h2>
            <p>
              Din data lagras säkert hos Firebase (Google Cloud). All data krypteras både under överföring
              (SSL/TLS) och i vila. Vi använder moderna säkerhetsstandarder för att skydda din information.
            </p>
          </section>

          {/* Section 6 */}
          <section className="terms-section">
            <h2>6. Dina kontrollrättigheter (GDPR)</h2>
            <p>
              Du har rätt att:
            </p>
            <ul>
              <li><strong>Få tillgång</strong> - Be om en kopia av all data vi sparar om dig</li>
              <li><strong>Rätta</strong> - Uppdatera eller korrigera din data</li>
              <li><strong>Radera</strong> - Be oss radera ditt konto och all tillhörande data</li>
              <li><strong>Exportera</strong> - Hämta dina kontroller och data i ett användarbart format</li>
              <li><strong>Invända</strong> - Invända mot viss behandling av din data</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              Kontakta oss på <a href="mailto:support@skarpkontroll.se">support@skarpkontroll.se</a> för
              att utöva någon av dessa rättigheter.
            </p>
          </section>

          {/* Section 7 */}
          <section className="terms-section">
            <h2>7. Lagring av data</h2>
            <p>
              Vi lagrar din data så länge som du är medlem. Om du tar bort ditt konto kan du välja att:
            </p>
            <ul>
              <li>Radera allt omedelbar (rekommenderas)</li>
              <li>Behålla data för arkivering (du kan sedan radera senare)</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="terms-section">
            <h2>8. Cookies och spårning</h2>
            <p>
              SkarpKontroll använder INTE:
            </p>
            <ul>
              <li>Spårning- eller marknadsföringscookies</li>
              <li>Tredjepartsanalytik</li>
              <li>Pixlar eller beacons</li>
              <li>Fingerprinting eller device IDs för spårning</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              Vi använder endast nödvändiga cookies för autentisering och sessionshantering.
            </p>
          </section>

          {/* Section 9 */}
          <section className="terms-section">
            <h2>9. Ändringar av denna policy</h2>
            <p>
              Vi kan uppdatera denna policy ibland. Alla väsentliga ändringar kommer att meddelas via
              e-post på din registrerade adress. Din fortsatta användning innebär att du accepterar
              den uppdaterade policyn.
            </p>
          </section>

          {/* Section 10 */}
          <section className="terms-section">
            <h2>10. Kontakt och frågor</h2>
            <p>
              Har du frågor om denna integritetspolicy eller hur vi hanterar din data? Tveka inte att
              kontakta oss:
            </p>
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <p>
                <strong>E-post:</strong> <a href="mailto:support@skarpkontroll.se">support@skarpkontroll.se</a>
              </p>
              <p>
                Vi svarar på alla privacy-relaterade frågor inom 5 arbetsdagar.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="terms-footer">
          <p>© 2024 SkarpKontroll. Alla rättigheter förbehålles.</p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPage;
