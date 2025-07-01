import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed database...');

  try {
    // Create sample players
    const player1 = await prisma.player.upsert({
      where: { wallet: '0x1234567890123456789012345678901234567890' },
      update: {},
      create: {
        wallet: '0x1234567890123456789012345678901234567890',
        username: 'DungeonMaster',
        level: 15,
        experience: 1250,
      },
    });

    const player2 = await prisma.player.upsert({
      where: { wallet: '0x0987654321098765432109876543210987654321' },
      update: {},
      create: {
        wallet: '0x0987654321098765432109876543210987654321',
        username: 'LootHunter',
        level: 12,
        experience: 980,
      },
    });

    console.log('✅ Created sample players');

    // Create sample equipment
    const equipment1 = await prisma.equipment.upsert({
      where: { tokenId: '1001' },
      update: {},
      create: {
        tokenId: '1001',
        name: '🔥 Flaming Sword of Destruction',
        equipmentType: 'weapon',
        rarity: 'legendary',
        attackPower: 95,
        defensePower: 5,
        magicPower: 25,
        specialAbility: 'Burns enemies for 3 rounds',
        isLendable: true,
        ownerId: player1.id,
      },
    });

    const equipment2 = await prisma.equipment.upsert({
      where: { tokenId: '1002' },
      update: {},
      create: {
        tokenId: '1002',
        name: '🛡️ Divine Shield of Light',
        equipmentType: 'armor',
        rarity: 'epic',
        attackPower: 0,
        defensePower: 80,
        magicPower: 15,
        specialAbility: 'Reflects 20% damage back to attacker',
        isLendable: true,
        ownerId: player1.id,
      },
    });

    const equipment3 = await prisma.equipment.upsert({
      where: { tokenId: '1003' },
      update: {},
      create: {
        tokenId: '1003',
        name: '💍 Ring of Ancient Wisdom',
        equipmentType: 'accessory',
        rarity: 'rare',
        attackPower: 10,
        defensePower: 10,
        magicPower: 45,
        specialAbility: 'Increases spell critical chance by 15%',
        isLendable: true,
        ownerId: player2.id,
      },
    });

    const equipment4 = await prisma.equipment.upsert({
      where: { tokenId: '1004' },
      update: {},
      create: {
        tokenId: '1004',
        name: '⚔️ Shadowbane Dagger',
        equipmentType: 'weapon',
        rarity: 'uncommon',
        attackPower: 35,
        defensePower: 0,
        magicPower: 5,
        specialAbility: 'Poisons enemies',
        isLendable: true,
        ownerId: player2.id,
      },
    });

    const equipment5 = await prisma.equipment.upsert({
      where: { tokenId: '1005' },
      update: {},
      create: {
        tokenId: '1005',
        name: '🥾 Boots of Swift Movement',
        equipmentType: 'armor',
        rarity: 'rare',
        attackPower: 5,
        defensePower: 30,
        magicPower: 0,
        specialAbility: 'Increases movement speed by 50%',
        isLendable: true,
        ownerId: player1.id,
      },
    });

    console.log('✅ Created sample equipment');

    // Create sample lending orders
    const lendingOrder1 = await prisma.lendingOrder.upsert({
      where: { id: 'lending-1' },
      update: {},
      create: {
        id: 'lending-1',
        equipmentId: equipment1.id,
        lenderId: player1.id,
        price: '0.05', // 0.05 ETH
        collateral: '0.1', // 0.1 ETH
        duration: 24, // 24 hours
        status: 'active',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });

    const lendingOrder2 = await prisma.lendingOrder.upsert({
      where: { id: 'lending-2' },
      update: {},
      create: {
        id: 'lending-2',
        equipmentId: equipment2.id,
        lenderId: player1.id,
        price: '0.03', // 0.03 ETH
        collateral: '0.08', // 0.08 ETH
        duration: 12, // 12 hours
        status: 'active',
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      },
    });

    const lendingOrder3 = await prisma.lendingOrder.upsert({
      where: { id: 'lending-3' },
      update: {},
      create: {
        id: 'lending-3',
        equipmentId: equipment3.id,
        lenderId: player2.id,
        price: '0.02', // 0.02 ETH
        collateral: '0.06', // 0.06 ETH
        duration: 6, // 6 hours
        status: 'active',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      },
    });

    const lendingOrder4 = await prisma.lendingOrder.upsert({
      where: { id: 'lending-4' },
      update: {},
      create: {
        id: 'lending-4',
        equipmentId: equipment4.id,
        lenderId: player2.id,
        price: '0.01', // 0.01 ETH
        collateral: '0.03', // 0.03 ETH
        duration: 8, // 8 hours
        status: 'active',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      },
    });

    const lendingOrder5 = await prisma.lendingOrder.upsert({
      where: { id: 'lending-5' },
      update: {},
      create: {
        id: 'lending-5',
        equipmentId: equipment5.id,
        lenderId: player1.id,
        price: '0.025', // 0.025 ETH
        collateral: '0.07', // 0.07 ETH
        duration: 18, // 18 hours
        status: 'active',
        expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
      },
    });

    console.log('✅ Created sample lending orders');

    // Create some game stats
    await prisma.gameStats.upsert({
      where: { playerId: player1.id },
      update: {},
      create: {
        playerId: player1.id,
        dungeonsCleared: 25,
        totalLoot: 45,
        totalExperience: 1250,
        highestLevel: 15,
        gamesPlayed: 32,
      },
    });

    await prisma.gameStats.upsert({
      where: { playerId: player2.id },
      update: {},
      create: {
        playerId: player2.id,
        dungeonsCleared: 18,
        totalLoot: 32,
        totalExperience: 980,
        highestLevel: 12,
        gamesPlayed: 24,
      },
    });

    console.log('✅ Created sample game stats');

    console.log('🎉 Database seeding completed successfully!');
    console.log('Sample data includes:');
    console.log('- 2 Players with wallets');
    console.log('- 5 Equipment items (various rarities)');
    console.log('- 5 Active lending orders');
    console.log('- Game statistics for both players');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
