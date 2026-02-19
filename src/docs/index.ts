import YAML from 'yamljs'
import path from 'path'

const currentDir = process.cwd()
const docsPath = path.join(currentDir, 'src', 'docs')

// Charger la configuration principale
const swaggerConfig = YAML.load(path.join(docsPath, 'swagger.config.yml'))

// Charger les documentations des modules
const authDoc = YAML.load(path.join(docsPath, 'auth.doc.yml'))
const userDoc = YAML.load(path.join(docsPath, 'user.doc.yml'))
const cardDoc = YAML.load(path.join(docsPath, 'card.doc.yml'))
const deckDoc = YAML.load(path.join(docsPath, 'deck.doc.yml'))

// Fusionner tous les paths
export const swaggerDocument = {
  ...swaggerConfig,
  paths: {
    ...authDoc.paths,
    ...userDoc.paths,
    ...cardDoc.paths,
    ...deckDoc.paths,
  },
}
