import { deckCardsRepository } from './deckCards.repository'

export const deckCardsService = {
  /**
   * Vérifie qu'un deck contient exactement 10 cartes.
   *
   * @param {number} id_deck - Identifiant du deck
   *
   * @returns {Promise<boolean>} true si le deck contient 10 cartes, false sinon
   *
   * @throws {Error} Erreur lors de la récupération des cartes
   */
  async nb_cards_decks(id_deck: number) {
    const nb_cards = await deckCardsRepository.nb_cards_decks(id_deck)
    if (nb_cards === 10) {
      return true
    }
    return false
  },

  /**
   * Retourne les identifiants de toutes les cartes d'un deck.
   *
   * @param {number} deck_id - Identifiant du deck
   *
   * @returns {Promise<number[]>} Liste des identifiants de cartes
   *
   * @throws {Error} Erreur lors de la récupération des cartes
   */
  async getCardsByDeck(deck_id: number) {
    return deckCardsRepository.getCardsByDeck(deck_id)
  },
}
