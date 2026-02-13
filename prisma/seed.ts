import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { join } from 'path'
import { prisma } from '../src/database'
import { CardModel } from '../src/generated/prisma/models/Card'

//Return a Deckcards aleatory
async function deckCardAleatory(id_deck: number, max: number, min: number) {
  // Insertion of a deckcards into the deck
  for (let index = 0; index < 10; index++) {
    const card_id_random = Math.floor(Math.random() * (max - min + 1) + min)
    await prisma.deckCard.create({
      data: {
        deckId: id_deck,
        cardId: card_id_random,
      },
    })
  }
}

async function main() {
  console.log('🌱 Starting database seed...')

  await prisma.deckCard.deleteMany()
  await prisma.deck.deleteMany()
  await prisma.card.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash('password123', 10)

  await prisma.user.createMany({
    data: [
      {
        username: 'red',
        email: 'red@example.com',
        password: hashedPassword,
      },
      {
        username: 'blue',
        email: 'blue@example.com',
        password: hashedPassword,
      },
    ],
  })

  const redUser = await prisma.user.findUnique({
    where: { email: 'red@example.com' },
  })
  const blueUser = await prisma.user.findUnique({
    where: { email: 'blue@example.com' },
  })

  if (!redUser || !blueUser) {
    throw new Error('Failed to create users')
  }

  console.log('✅ Created users:', redUser.username, blueUser.username)

  const pokemonDataPath = join(__dirname, 'data', 'pokemon.json')
  const pokemonJson = readFileSync(pokemonDataPath, 'utf-8')
  const pokemonData: CardModel[] = JSON.parse(pokemonJson)

  console.log(`Created ${pokemonData.length} Pokemon cards`)

  //get the id of bleu and red
  const red_id = redUser.id
  const blue_id = blueUser.id

  // Creation of the deck
  await prisma.deck.createMany({
    data: [
      {
        userId: red_id,
        name: 'Starter Deck',
      },
      {
        userId: blue_id,
        name: 'Starter Deck',
      },
    ],
  })

  const decks = await prisma.deck.findMany({ where: { name: 'Starter Deck' } })
  if (!decks) {
    throw new Error('Failed to create decks')
  }

  //Search the min and max of id in deck
  const result = await prisma.card.aggregate({
    _min: { id: true },
    _max: { id: true },
  })
  const minId = result._min.id!
  const maxId = result._max.id!

  // Insertion of 10 cards into the decks
  for (const deck of decks) {
    await deckCardAleatory(deck.id, maxId, minId)
  }

  console.log('\n Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
