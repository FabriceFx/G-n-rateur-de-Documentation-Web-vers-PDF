# Générateur de Documentation Web vers PDF (avec envoi Email)

![License MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script-green)
![Runtime](https://img.shields.io/badge/Google%20Apps%20Script-V8-green)
![Author](https://img.shields.io/badge/Auteur-Fabrice%20Faucheux-orange)

## Description
Outil d'automatisation complet qui récupère de la documentation en ligne, la compile dans un Google Doc, la convertit en PDF et l'envoie automatiquement par email au destinataire configuré.

## Fonctionnalités Clés
* **Web Scraping & Nettoyage** : Extraction intelligente du contenu via Cheerio.
* **Génération Doc** : Création d'un document maître via l'API Drive.
* **Conversion PDF** : Export automatique au format PDF.
* **Notification Email** : Envoi du rapport final en pièce jointe via Gmail.

## Prérequis Techniques

### Bibliothèques
* **Cheerio** (ID : `1ReeQ6WO8kKNxoaA_O0XEQ589cIrNwEvFS8cON0279vz9kVLOFOgt-t-0`)

### Services Avancés Google
* **Drive API** (identifiant : `Drive`)

### Autorisations
Lors de la première exécution, le script demandera l'accès à :
* **Gmail** (pour envoyer l'email).
* **Drive** (pour créer et lire les fichiers).
* **Service externe** (UrlFetchApp pour le scraping).

## Configuration
Dans `Code.gs`, modifiez l'objet `CONFIGURATION_GLOBALE` :
```javascript
const CONFIGURATION_GLOBALE = {
  // ... URLs ...
  EMAIL_DESTINATAIRE: "votre.email@domaine.com" // Par défaut : votre email
};
