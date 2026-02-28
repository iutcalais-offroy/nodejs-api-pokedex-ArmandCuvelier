import { prisma } from '../database'

export const deckCardsRepository = {
  /**
   * Retourne le nombre de cartes associées à un deck.
   *
   * @param {number} deck_id - Identifiant du deck
   *
   * @returns {Promise<number>} Nombre de cartes dans le deck
   *
   * @throws {Error} Erreur lors de l'accès à la base de données
   */
  async nb_cards_decks(deck_id: number) {
    const results = await prisma.deckCard.findMany({
      where: { deckId: deck_id },
    })
    return results.length
  },

  /**
   * Retourne les identifiants de toutes les cartes associées à un deck.
   *
   * @param {number} deck_id - Identifiant du deck
   *
   * @returns {Promise<number[]>} Liste des identifiants de cartes
   *
   * @throws {Error} Erreur lors de l'accès à la base de données
   */
  async getCardsByDeck(deck_id: number) {
    const results = await prisma.deckCard.findMany({
      where: { deckId: deck_id },
      select: { cardId: true },
    })
    return results.map((r) => r.cardId)
  },
}
