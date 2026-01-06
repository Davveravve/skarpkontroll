// src/pages/TermsPage.js - Terms of Service
import React from 'react';
import './TermsPage.css';

const TermsPage = () => {
  return (
    <div className="terms-page">
      <div className="terms-container">
        {/* Header */}
        <header className="terms-header">
          <h1>Användarvillkor</h1>
          <p className="terms-last-updated">Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}</p>
        </header>

        {/* Content */}
        <div className="terms-content">
          {/* Section 1 */}
          <section className="terms-section">
            <h2>1. Dataskydd och integritet</h2>
            <p>
              Vi på SkarpKontroll värnar om din integritet. Vi sparar endast den data som är absolut nödvändig
              för att SkarpKontroll ska fungera som tänkt. Vi sparar aldrig mer information än vad som är
              erforderligt.
            </p>
          </section>

          {/* Section 2 */}
          <section className="terms-section">
            <h2>2. Data som vi sparar</h2>
            <p className="section-intro">
              Följande information sparas för att appen ska fungera:
            </p>

            <div className="data-categories">
              {/* User Data */}
              <div className="data-category">
                <h3>Användardata</h3>
                <ul>
                  <li><strong>E-postadress</strong> - För inloggning och återställning av lösenord</li>
                  <li><strong>Lösenord (krypterat)</strong> - För säker autentisering</li>
                  <li><strong>Kontaktperson</strong> - Ditt namn/entreprenörsnamn</li>
                  <li><strong>Telefonnummer</strong> - För kontakt vid behov</li>
                  <li><strong>Skapandedatum</strong> - Håll reda på kontoålder</li>
                  <li><strong>Senaste inloggning</strong> - Säkerhetsöversikt</li>
                </ul>
              </div>

              {/* Team Data */}
              <div className="data-category">
                <h3>Teamdata</h3>
                <ul>
                  <li><strong>Teamnamn</strong> - Identifiera teamet</li>
                  <li><strong>Teaminbjudningskod</strong> - Möjliggöra att andra kan gå med</li>
                  <li><strong>Teammedlemmar</strong> - Hantera vem som är medlem</li>
                  <li><strong>Teamlogotyp</strong> - Visas i PDF-rapporter och interface</li>
                  <li><strong>Teampresentationer</strong> - Valfritt lösenord för att gå med i teamet</li>
                </ul>
              </div>

              {/* Control Data */}
              <div className="data-category">
                <h3>Kontrolldata</h3>
                <ul>
                  <li><strong>Kontrollnamn</strong> - Beskrivning av kontrollen</li>
                  <li><strong>Kontrollstatus</strong> - Aktiv eller slutförd</li>
                  <li><strong>Noder (kontrollpunkter)</strong> - Hierarki av inspektionspunkter</li>
                  <li><strong>Anmärkningar</strong> - Iakttagelser och problem vid kontroll</li>
                  <li><strong>Bilder</strong> - Dokumentation av kontroller</li>
                  <li><strong>Skapandedatum</strong> - När kontrollen genomfördes</li>
                </ul>
              </div>

              {/* Customer Data */}
              <div className="data-category">
                <h3>Kunddata</h3>
                <ul>
                  <li><strong>Kundnamn</strong> - Identifiera kundens fastighet/installation</li>
                  <li><strong>Adress</strong> - Var kontrollen genomfördes</li>
                  <li><strong>Kontaktuppgifter</strong> - Möjliggör kommunikation om behov</li>
                </ul>
              </div>

              {/* Optional Profile Data */}
              <div className="data-category">
                <h3>Valfri profilinformation</h3>
                <ul>
                  <li><strong>Hemsida</strong> - Visas i rapporter (valfritt)</li>
                  <li><strong>Organisationsnummer</strong> - Visas i rapporter (valfritt)</li>
                  <li><strong>Adress</strong> - Visas i rapporter (valfritt)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="terms-section">
            <h2>3. Data vi sparar INTE</h2>
            <p className="highlight">
              Vi sparar aldrig:
            </p>
            <ul>
              <li>Cookies för spårning eller marknadsföring</li>
              <li>Personlig information bortom vad som listas ovan</li>
              <li>Information om ditt användarbeteende</li>
              <li>IP-adresser eller loggdata för spårning</li>
              <li>Data från tredjepartsanalytik eller spårningsverktyg</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="terms-section">
            <h2>4. Dina rättigheter</h2>
            <p>
              Du har rätt att:
            </p>
            <ul>
              <li>Få tillgång till all data vi sparar om dig</li>
              <li>Redigera eller uppdatera din information när som helst</li>
              <li>Be oss att radera ditt konto och all tillhörande data</li>
              <li>Exportera dina kontroller och data</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="terms-section">
            <h2>5. Ändringar av villkoren</h2>
            <p>
              Vi kan uppdatera dessa villkor ibland. Om vi gör större ändringar kommer vi att meddela dig
              via din registrerade e-postadress. Din fortsatta användning av SkarpKontroll efter ändringar
              innebär att du accepterar de nya villkoren.
            </p>
          </section>

          {/* Section 6 */}
          <section className="terms-section">
            <h2>6. Kontakt</h2>
            <p>
              Har du frågor om dessa villkor eller hur vi hanterar din data? Kontakta oss på:{' '}
              <a href="mailto:support@skarpkontroll.se">support@skarpkontroll.se</a>
            </p>
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

export default TermsPage;
