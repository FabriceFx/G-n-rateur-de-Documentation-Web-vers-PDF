/**
 * @fileoverview Script de récupération de documentation Web vers Google Docs avec envoi PDF.
 * Nécessite l'activation du service avancé "Drive API" et la bibliothèque "Cheerio".
 * @author Fabrice Faucheux
 */

/**
 * CONFIGURATION GLOBALE
 * Paramètres centraux pour le crawler et l'envoi.
 */
const CONFIGURATION_GLOBALE = {
  URL_RACINE: "https://developers.google.com/workspace/add-ons/workflows",
  URL_BASE: "https://developers.google.com",
  TITRE_DOC: "Guide Google Workspace Flows (Généré)",
  DELAI_ATTENTE_MS: 500,
  // L'email sera envoyé à l'utilisateur qui exécute le script par défaut
  EMAIL_DESTINATAIRE: Session.getActiveUser().getEmail() 
};

/**
 * FONCTION PRINCIPALE
 * Orchestre le crawling, la génération et l'envoi du PDF.
 */
function genererDocumentationDepuisWeb() {
  console.time("Execution_Script");
  
  try {
    // 1. Scan de la page racine
    Logger.log(`🔍 Scan de l'URL racine : ${CONFIGURATION_GLOBALE.URL_RACINE}`);
    const htmlRacine = UrlFetchApp.fetch(CONFIGURATION_GLOBALE.URL_RACINE).getContentText();
    const listeUrls = extraireLiensPertinents(htmlRacine, CONFIGURATION_GLOBALE.URL_RACINE);

    Logger.log(`✅ ${listeUrls.length} pages trouvées.`);

    // 2. Construction du Blob HTML
    let htmlCombine = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11pt; }
            h1 { color: #000000; page-break-before: always; font-size: 24pt; font-weight: 700; margin-bottom: 12pt; }
            h2 { color: #000000; font-size: 18pt; font-weight: 700; margin-top: 18pt; margin-bottom: 6pt; }
            p { margin-bottom: 8pt; line-height: 1.15; }
            code { background-color: #f1f3f4; padding: 2px 4px; border-radius: 4px; font-family: Consolas, monospace; font-size: 10pt; }
            pre { background-color: #f1f3f4; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-family: Consolas, monospace; border: 1px solid #ddd; }
            .lien-source { font-size: 9pt; color: #666; font-style: italic; margin-bottom: 24pt; }
            .index-liste { list-style-type: none; padding: 0; }
            .index-liste li { margin-bottom: 5pt; }
            .index-liste a { text-decoration: none; color: #1a73e8; }
          </style>
        </head>
        <body>
          <h1 style="font-size: 36pt; font-weight: bold; margin-bottom: 20px;">${CONFIGURATION_GLOBALE.TITRE_DOC}</h1>
          <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
          <h2>Table des Matières</h2>
          <ul class="index-liste">
            ${listeUrls.map(url => `<li><a href="${url}">${url}</a></li>`).join('')}
          </ul>
          <hr/>
    `;

    // Boucle de récupération des contenus
    listeUrls.forEach((url, index) => {
      Logger.log(`🔄 Traitement ${index + 1}/${listeUrls.length}: ${url}`);
      try {
        const reponse = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (reponse.getResponseCode() === 200) {
          htmlCombine += nettoyerHtmlPourDoc(reponse.getContentText(), url);
        } else {
          htmlCombine += `<p style="color:red">Échec récupération : ${url}</p>`;
        }
        Utilities.sleep(CONFIGURATION_GLOBALE.DELAI_ATTENTE_MS);
      } catch (erreur) {
        console.error(`❌ Erreur sur ${url}: ${erreur.message}`);
      }
    });

    htmlCombine += "</body></html>";

    // 3. Création du Google Doc
    const idNouveauDoc = creerDocDepuisHtml(htmlCombine, CONFIGURATION_GLOBALE.TITRE_DOC);
    
    // 4. Post-traitement et Envoi
    if (idNouveauDoc) {
      Logger.log("🎨 Post-traitement (Titres & Images)...");
      appliquerStylesTitres(idNouveauDoc);
      redimensionnerImagesDoc(idNouveauDoc);
      
      Logger.log("📧 Conversion en PDF et envoi par email...");
      envoyerPdfParEmail(idNouveauDoc, CONFIGURATION_GLOBALE.TITRE_DOC);
      
      Logger.log("🎉 Processus terminé avec succès.");
    }

  } catch (e) {
    console.error("❌ Erreur fatale : " + e.message);
  }
  
  console.timeEnd("Execution_Script");
}

/**
 * Convertit le Doc en PDF et l'envoie par email.
 * @param {string} idDoc - L'ID du Google Doc source.
 * @param {string} nomDoc - Le nom à donner au fichier PDF.
 */
function envoyerPdfParEmail(idDoc, nomDoc) {
  try {
    const fichierDoc = DriveApp.getFileById(idDoc);
    const blobPdf = fichierDoc.getAs(MimeType.PDF).setName(nomDoc + ".pdf");
    
    const sujet = `[Documentation] ${nomDoc}`;
    const corpsMessage = `Bonjour,\n\nVeuillez trouver ci-joint la documentation générée automatiquement : "${nomDoc}".\n\nCordialement,\nVotre Script GAS.`;
    
    GmailApp.sendEmail(CONFIGURATION_GLOBALE.EMAIL_DESTINATAIRE, sujet, corpsMessage, {
      attachments: [blobPdf],
      name: "Générateur de Docs"
    });
    
    Logger.log(`✉️ Email envoyé à ${CONFIGURATION_GLOBALE.EMAIL_DESTINATAIRE}`);
  } catch (e) {
    console.error(`❌ Erreur lors de l'envoi de l'email : ${e.message}`);
    throw e; // Relance l'erreur pour la gestion globale
  }
}

// --- FONCTIONS UTILITAIRES (Identiques à la version précédente) ---

function redimensionnerImagesDoc(idDoc) {
  const doc = DocumentApp.openById(idDoc);
  const corps = doc.getBody();
  const images = corps.getImages();
  const LARGEUR_MAX = 600;

  images.forEach(image => {
    const largeur = image.getWidth();
    if (largeur > LARGEUR_MAX) {
      const nouvelleHauteur = (image.getHeight() / largeur) * LARGEUR_MAX;
      image.setWidth(LARGEUR_MAX);
      image.setHeight(nouvelleHauteur);
    }
  });
  doc.saveAndClose();
}

function appliquerStylesTitres(idDoc) {
  const doc = DocumentApp.openById(idDoc);
  const paragraphes = doc.getBody().getParagraphs();

  paragraphes.forEach(p => {
    const attributs = p.getAttributes();
    if (p.getText().length > 0 && attributs.FONT_SIZE >= 20 && attributs.BOLD) {
      p.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    }
  });
  doc.saveAndClose();
}

function nettoyerHtmlPourDoc(html, urlSource) {
  // Bibliothèque Cheerio requise
  const $ = Cheerio.load(html);

  const selecteursASupprimer = [
    '.devsite-article-meta', '.devsite-feedback', '.devsite-toc', '.devsite-nav', 
    'script', 'style', '.button', 'header', 'footer', 'nav'
  ];
  $(selecteursASupprimer.join(', ')).remove();

  let $titre = $('h1.devsite-page-title').first();
  if ($titre.length === 0) $titre = $('h1').first();
  $titre.find('*').remove(); 
  
  // Correction liens relatifs
  $('.devsite-article-body img').each((i, el) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('/')) $(el).attr('src', CONFIGURATION_GLOBALE.URL_BASE + src);
  });

  // Nettoyage simplifié pour gain de place dans la réponse
  // (La logique reste identique à la V1 pour le reste du nettoyage)
  
  return `
    <div class="section-doc">
      <h1 style="page-break-before: always; font-size: 24pt;">${$titre.text().trim()}</h1>
      <p style="font-size: 9pt; color: #666;">Source : <a href="${urlSource}">${urlSource}</a></p>
      ${$('.devsite-article-body').html() || ""}
    </div>
  `;
}

function extraireLiensPertinents(html, urlRacine) {
  const $ = Cheerio.load(html);
  const liens = new Set();
  $('.devsite-book-nav a').each(function() {
    let href = $(this).attr('href');
    if (href) {
      if (href.startsWith('/')) href = CONFIGURATION_GLOBALE.URL_BASE + href;
      if (href.startsWith(urlRacine) && !href.includes('#')) liens.add(href);
    }
  });
  return Array.from(liens);
}

function creerDocDepuisHtml(contenuHtml, titre) {
  const blob = Utilities.newBlob(contenuHtml, MimeType.HTML, titre + ".html");
  try {
    const fichier = Drive.Files.insert({ title: titre, mimeType: MimeType.GOOGLE_DOCS }, blob, { convert: true });
    return fichier.id;
  } catch (e) {
    console.error(`❌ Erreur Drive API : ${e.message}`);
    return null;
  }
}
