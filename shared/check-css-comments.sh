#!/usr/bin/env bash
# check-css-comments.sh — détecte les commentaires CSS mal fermés (* /) dans shared/css/
# Régression #233/#275 : * / (avec espace) au lieu de */ masque des blocs CSS entiers
# Exit 1 si des occurrences sont trouvées — bloque le CI
set -uo pipefail

BAD=$(grep -rcP '\* /' shared/css/ 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')
if [ "$BAD" -gt 0 ]; then
  echo "ERREUR : Commentaires CSS mal fermes (* /) trouves dans shared/css/ — regression #275"
  echo "Remplacer '* /' par '*/' dans les fichiers suivants :"
  grep -rnP '\* /' shared/css/ || true
  exit 1
fi
echo "OK : Aucun commentaire CSS mal ferme detecte dans shared/css/"
