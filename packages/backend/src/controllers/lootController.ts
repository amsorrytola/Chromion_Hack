import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database/prisma';
import { blockchainService } from '../services/blockchainService';
import { logger } from '../utils/logger';

export class LootController {
  private getDb() {
    return getDatabase();
  }

  async generateLoot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        playerId, 
        playerAddress, 
        dungeonLevel = 1, 
        chainId = 11155111 
      } = req.body;

      if (!playerId || !playerAddress) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: playerId, playerAddress' 
        });
        return;
      }

      // Generate random equipment
      const equipment = this.generateRandomEquipment(dungeonLevel);
      
      // Mint NFT on blockchain
      const mintResult = await blockchainService.mintLoot(
        chainId,
        playerAddress,
        equipment.name,
        equipment.equipmentType,
        this.getRarityIndex(equipment.rarity),
        equipment.attackPower,
        equipment.attributes || []
      );

      // Save to database
      const createdEquipment = await this.getDb().equipment.create({
        data: {
          ...equipment,
          tokenId: mintResult.tokenId.toString(),
          ownerId: playerId,
        }
      });

      res.json({ 
        success: true, 
        data: {
          ...createdEquipment,
          transactionHash: mintResult.transactionHash,
          chainId
        }
      });
    } catch (error) {
      logger.error('Generate loot error:', error);
      next(error);
    }
  }

  async generateLootDev(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        playerId, 
        playerAddress, 
        dungeonLevel = 1, 
        chainId = 11155111 
      } = req.body;

      if (!playerId || !playerAddress) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: playerId, playerAddress' 
        });
        return;
      }

      // Ensure player exists, create if not
      let player = await this.getDb().player.findUnique({
        where: { id: playerId }
      });

      if (!player) {
        // Try to find by wallet address first
        player = await this.getDb().player.findUnique({
          where: { wallet: playerAddress }
        });

        if (!player) {
          // Create new player
          player = await this.getDb().player.create({
            data: {
              id: playerId,
              wallet: playerAddress,
              username: `Player_${playerId.slice(-6)}`,
              level: 1,
              experience: 0
            }
          });
          logger.info(`Created new player for dev loot generation: ${playerId}`);
        }
      }

      // Generate random equipment
      const equipment = this.generateRandomEquipment(dungeonLevel);
      
      // Create fake tokenId for development
      const fakeTokenId = Math.floor(Math.random() * 10000) + 1000;

      // Save to database without blockchain interaction
      const { attributes, ...equipmentData } = equipment; // Remove attributes field
      const createdEquipment = await this.getDb().equipment.create({
        data: {
          ...equipmentData,
          tokenId: fakeTokenId.toString(),
          ownerId: player.id,
          isLendable: true, // Make equipment lendable by default
        }
      });

      res.json({ 
        success: true, 
        data: {
          ...createdEquipment,
          transactionHash: '0xfake_dev_transaction_hash',
          chainId,
          playerId: player.id
        }
      });
    } catch (error) {
      logger.error('Generate loot dev error:', error);
      next(error);
    }
  }

  async getPlayerLoot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { playerId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      if (!playerId) {
        res.status(400).json({ success: false, message: 'Player ID is required' });
        return;
      }

      const equipment = await this.getDb().equipment.findMany({
        where: { ownerId: playerId },
        skip: Number(offset),
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      });

      res.json({ 
        success: true, 
        data: equipment 
      });
    } catch (error) {
      logger.error('Get player loot error:', error);
      next(error);
    }
  }

  async getEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing tokenId' 
        });
        return;
      }

      const equipment = await this.getDb().equipment.findUnique({
        where: { tokenId: tokenId },
        include: {
          owner: {
            select: { id: true, username: true, wallet: true }
          },
          lendingOrders: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!equipment) {
        res.status(404).json({ 
          success: false, 
          message: 'Equipment not found' 
        });
        return;
      }

      res.json({ 
        success: true, 
        data: equipment 
      });

    } catch (error) {
      logger.error('Get equipment error:', error);
      next(error);
    }
  }

  async createLendingOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        equipmentId, 
        lenderId, 
        price, 
        collateral, 
        duration = 24 
      } = req.body;

      if (!equipmentId || !lenderId || !price || !collateral) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: equipmentId, lenderId, price, collateral' 
        });
        return;
      }

      // Check if equipment exists and is owned by lender
      const equipment = await this.getDb().equipment.findUnique({
        where: { id: equipmentId }
      });

      if (!equipment || equipment.ownerId !== lenderId) {
        res.status(403).json({ 
          success: false, 
          message: 'Equipment not found or not owned by lender' 
        });
        return;
      }

      if (!equipment.isLendable) {
        res.status(400).json({ 
          success: false, 
          message: 'Equipment is not lendable' 
        });
        return;
      }

      const lendingOrder = await this.getDb().lendingOrder.create({
        data: {
          equipmentId,
          lenderId,
          price: price.toString(),
          collateral: collateral.toString(),
          duration,
          status: 'active',
          expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000)
        },
        include: {
          equipment: {
            include: {
              owner: {
                select: { id: true, username: true, wallet: true }
              }
            }
          }
        }
      });

      res.json({ 
        success: true, 
        data: lendingOrder 
      });

    } catch (error) {
      logger.error('Create lending order error:', error);
      next(error);
    }
  }

  async borrowEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId, borrowerId, borrowerAddress } = req.body;

      if (!orderId || !borrowerId || !borrowerAddress) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: orderId, borrowerId, borrowerAddress' 
        });
        return;
      }

      const order = await this.getDb().lendingOrder.findUnique({
        where: { id: orderId },
        include: {
          equipment: true
        }
      });

      if (!order || order.status !== 'active') {
        res.status(404).json({ 
          success: false, 
          message: 'Lending order not found or not active' 
        });
        return;
      }

      if (order.expiresAt < new Date()) {
        res.status(400).json({ 
          success: false, 
          message: 'Lending order has expired' 
        });
        return;
      }

      // Update lending order to show it's borrowed
      const updatedOrder = await this.getDb().lendingOrder.update({
        where: { id: orderId },
        data: {
          borrowerId,
          status: 'borrowed' // Change status to borrowed instead of completed
        },
        include: {
          equipment: {
            include: {
              owner: {
                select: { id: true, username: true, wallet: true }
              }
            }
          }
        }
      });

      res.json({ 
        success: true, 
        data: updatedOrder 
      });

    } catch (error) {
      logger.error('Borrow equipment error:', error);
      next(error);
    }
  }

  async getMarketplace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        rarity, 
        equipmentType, 
        minPrice, 
        maxPrice 
      } = req.query;

      const where: any = { 
        status: 'active',
        expiresAt: { gt: new Date() }
      };

      if (rarity) {
        where.equipment = { ...where.equipment, rarity };
      }
      if (equipmentType) {
        where.equipment = { ...where.equipment, equipmentType };
      }
      if (minPrice) {
        where.price = { ...where.price, gte: minPrice.toString() };
      }
      if (maxPrice) {
        where.price = { ...where.price, lte: maxPrice.toString() };
      }

      const [orders, total] = await Promise.all([
        this.getDb().lendingOrder.findMany({
          where,
          include: {
            equipment: {
              include: {
                owner: {
                  select: { id: true, username: true, wallet: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          skip: Number(offset)
        }),
        this.getDb().lendingOrder.count({ where })
      ]);

      res.json({ 
        success: true, 
        data: {
          orders,
          pagination: {
            total,
            offset: Number(offset),
            limit: Number(limit),
            hasMore: Number(offset) + Number(limit) < total
          }
        }
      });

    } catch (error) {
      logger.error('Get marketplace error:', error);
      next(error);
    }
  }

  async updateLendingOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const { status, borrowerId } = req.body;

      if (!orderId) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing orderId' 
        });
        return;
      }

      const updatedOrder = await this.getDb().lendingOrder.update({
        where: { id: orderId },
        data: { status, borrowerId },
        include: {
          equipment: {
            include: {
              owner: {
                select: { id: true, username: true, wallet: true }
              }
            }
          }
        }
      });

      res.json({ 
        success: true, 
        data: updatedOrder 
      });

    } catch (error) {
      logger.error('Update lending order error:', error);
      next(error);
    }
  }

  async cancelLendingOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing orderId' 
        });
        return;
      }

      // Check if order exists and get details
      const order = await this.getDb().lendingOrder.findUnique({
        where: { id: orderId },
        include: {
          equipment: {
            include: {
              owner: {
                select: { id: true, username: true, wallet: true }
              }
            }
          }
        }
      });

      if (!order) {
        res.status(404).json({ 
          success: false, 
          message: 'Lending order not found' 
        });
        return;
      }

      // Check if order can be cancelled (only active orders)
      if (order.status !== 'active') {
        res.status(400).json({ 
          success: false, 
          message: 'Only active orders can be cancelled' 
        });
        return;
      }

      // Update order status to cancelled
      const cancelledOrder = await this.getDb().lendingOrder.update({
        where: { id: orderId },
        data: { status: 'cancelled' },
        include: {
          equipment: {
            include: {
              owner: {
                select: { id: true, username: true, wallet: true }
              }
            }
          }
        }
      });

      res.json({ 
        success: true, 
        data: cancelledOrder 
      });

    } catch (error) {
      logger.error('Cancel lending order error:', error);
      next(error);
    }
  }

  async syncEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { playerId, playerAddress, chainId = 11155111 } = req.body;

      if (!playerId || !playerAddress) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: playerId, playerAddress' 
        });
        return;
      }

      // For now, just return the player's equipment from database
      // In a real implementation, this would sync with blockchain
      const equipment = await this.getDb().equipment.findMany({
        where: { ownerId: playerId },
        orderBy: { createdAt: 'desc' }
      });

      // TODO: Implement actual blockchain sync logic here
      // This would involve:
      // 1. Query the blockchain for player's NFTs
      // 2. Compare with database records
      // 3. Update/insert missing equipment
      // 4. Mark transferred equipment as no longer owned

      res.json({ 
        success: true, 
        data: equipment,
        message: `Synced ${equipment.length} equipment items for player ${playerId}`
      });

    } catch (error) {
      logger.error('Sync equipment error:', error);
      next(error);
    }
  }

  async getUserListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { playerId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      if (!playerId) {
        res.status(400).json({ success: false, message: 'Player ID is required' });
        return;
      }

      // Get orders where user is the lender (their listings)
      const myListings = await this.getDb().lendingOrder.findMany({
        where: {
          lenderId: playerId,
          expiresAt: { gt: new Date() } // Only get non-expired orders
        },
        include: {
          equipment: {
            include: {
              owner: {
                select: { id: true, username: true, wallet: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      res.json({ success: true, data: myListings });
    } catch (error) {
      logger.error('Get user listings error:', error);
      next(error);
    }
  }

  async getUserBorrowedEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { playerId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      if (!playerId) {
        res.status(400).json({ success: false, message: 'Player ID is required' });
        return;
      }

      // Get orders where user is the borrower and status is borrowed
      const borrowedEquipment = await this.getDb().lendingOrder.findMany({
        where: {
          borrowerId: playerId,
          status: 'borrowed',
          expiresAt: { gt: new Date() } // Only get non-expired orders
        },
        include: {
          equipment: {
            include: {
              owner: {
                select: { id: true, username: true, wallet: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      res.json({ success: true, data: borrowedEquipment });
    } catch (error) {
      logger.error('Get user borrowed equipment error:', error);
      next(error);
    }
  }

  async transferLootCrossChain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        equipmentId,
        destinationChainId,
        receiverAddress,
        senderAddress
      } = req.body;

      if (!equipmentId || !destinationChainId || !receiverAddress || !senderAddress) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: equipmentId, destinationChainId, receiverAddress, senderAddress' 
        });
        return;
      }

      // Get equipment from database
      const equipment = await this.getDb().equipment.findUnique({
        where: { id: equipmentId },
        include: { owner: true }
      });

      if (!equipment) {
        res.status(404).json({ 
          success: false, 
          message: 'Equipment not found' 
        });
        return;
      }

      // Verify ownership
      if (equipment.owner.wallet !== senderAddress) {
        res.status(403).json({ 
          success: false, 
          message: 'Not the owner of this equipment' 
        });
        return;
      }

      // For now, assume source chain is Sepolia (11155111)
      const sourceChainId = 11155111;

      // Initiate cross-chain transfer
      const transferHash = await blockchainService.transferLootCrossChain(
        sourceChainId,
        destinationChainId,
        equipment.tokenId,
        receiverAddress
      );

      // TODO: Add a transfer status table to track cross-chain transfers
      // For now, just return the transaction hash

      res.json({ 
        success: true, 
        data: {
          transactionHash: transferHash,
          equipmentId: equipmentId,
          estimatedArrival: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes estimate
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getCrossChainTransferFee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceChainId, destinationChainId, equipmentId } = req.query;

      if (!sourceChainId || !destinationChainId || !equipmentId) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required parameters: sourceChainId, destinationChainId, equipmentId' 
        });
        return;
      }

      const equipment = await this.getDb().equipment.findUnique({
        where: { id: String(equipmentId) }
      });

      if (!equipment) {
        res.status(404).json({ 
          success: false, 
          message: 'Equipment not found' 
        });
        return;
      }

      // For now, return a fixed fee estimate
      // TODO: Implement actual fee calculation using Chainlink CCIP fee estimator
      const estimatedFee = "1000000000000000000"; // 1 LINK token

      res.json({ 
        success: true, 
        data: {
          fee: estimatedFee,
          currency: 'LINK',
          equipmentId,
          sourceChain: sourceChainId,
          destinationChain: destinationChainId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransferStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transferId } = req.params;

      // This would typically query a transfer status service or event logs
      // For now, return a mock status
      res.json({ 
        success: true, 
        data: {
          transferId,
          status: 'PENDING', // PENDING, COMPLETED, FAILED
          estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000),
          txHash: '0x...'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // New enhanced loot functions
  async requestRandomLoot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { playerAddress, dungeonLevel = 1, chainId = 11155111 } = req.body;

      if (!playerAddress) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required field: playerAddress' 
        });
        return;
      }

      const result = await blockchainService.requestRandomLoot(chainId, playerAddress, dungeonLevel);

      res.json({
        success: true,
        data: {
          requestId: result.requestId,
          transactionHash: result.transactionHash,
          message: 'Random loot request submitted successfully'
        }
      });

      logger.info(`Random loot requested`, { playerAddress, dungeonLevel, chainId, requestId: result.requestId });
    } catch (error) {
      logger.error('Error requesting random loot:', error);
      next(error);
    }
  }

  async getRequestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { requestId, chainId = 11155111 } = req.params;

      if (!requestId) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required parameter: requestId' 
        });
        return;
      }

      const status = await blockchainService.getRequestStatus(Number(chainId), requestId);

      res.json({
        success: true,
        data: {
          requestId,
          fulfilled: status.fulfilled,
          randomWords: status.randomWords.map(word => word.toString())
        }
      });
    } catch (error) {
      logger.error('Error getting request status:', error);
      next(error);
    }
  }

  async requestLoot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { playerAddress, partyId, dungeonLevel = 1, chainId = 11155111 } = req.body;

      if (!playerAddress || !partyId) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: playerAddress, partyId' 
        });
        return;
      }

      const result = await blockchainService.requestLoot(chainId, playerAddress, BigInt(partyId), dungeonLevel);

      res.json({
        success: true,
        data: {
          requestId: result.requestId,
          transactionHash: result.transactionHash,
          message: 'Loot request submitted successfully'
        }
      });

      logger.info(`Loot requested`, { playerAddress, partyId, dungeonLevel, chainId, requestId: result.requestId });
    } catch (error) {
      logger.error('Error requesting loot:', error);
      next(error);
    }
  }

  async setLendingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tokenId, isLendable, chainId = 11155111 } = req.body;

      if (!tokenId || typeof isLendable !== 'boolean') {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: tokenId, isLendable' 
        });
        return;
      }

      const transactionHash = await blockchainService.setLendingStatus(chainId, BigInt(tokenId), isLendable);

      // Update database
      await this.getDb().equipment.update({
        where: { tokenId: tokenId.toString() },
        data: { isLendable }
      });

      res.json({
        success: true,
        data: {
          tokenId,
          isLendable,
          transactionHash,
          message: 'Lending status updated successfully'
        }
      });

      logger.info(`Lending status updated`, { tokenId, isLendable, chainId, transactionHash });
    } catch (error) {
      logger.error('Error setting lending status:', error);
      next(error);
    }
  }

  async burnLoot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tokenId, chainId = 11155111 } = req.body;

      if (!tokenId) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required field: tokenId' 
        });
        return;
      }

      const transactionHash = await blockchainService.burnLoot(chainId, BigInt(tokenId));

      // Update database - mark as inactive since we don't have isBurned field
      await this.getDb().equipment.update({
        where: { tokenId: tokenId.toString() },
        data: { 
          // We can use name to indicate it's burned or add a status field later
          name: `[BURNED] ${(await this.getDb().equipment.findUnique({ where: { tokenId: tokenId.toString() } }))?.name || 'Equipment'}`,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        data: {
          tokenId,
          transactionHash,
          message: 'Loot burned successfully'
        }
      });

      logger.info(`Loot burned`, { tokenId, chainId, transactionHash });
    } catch (error) {
      logger.error('Error burning loot:', error);
      next(error);
    }
  }

  async getCrossChainFee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        sourceChainId = 11155111, 
        destinationChainSelector, 
        receiverAddress, 
        lootData 
      } = req.body;

      if (!destinationChainSelector || !receiverAddress || !lootData) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: destinationChainSelector, receiverAddress, lootData' 
        });
        return;
      }

      const fee = await blockchainService.getCrossChainFee(
        sourceChainId, 
        destinationChainSelector, 
        receiverAddress, 
        lootData
      );

      res.json({
        success: true,
        data: {
          fee: fee.toString(),
          feeInEth: (Number(fee) / 1e18).toFixed(6)
        }
      });
    } catch (error) {
      logger.error('Error getting cross-chain fee:', error);
      next(error);
    }
  }

  private generateRandomEquipment(dungeonLevel: number) {
    const equipmentTypes = ['weapon', 'armor', 'accessory', 'consumable'];
    const equipmentType = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
    const rarity = this.generateRarity(dungeonLevel);
    const rarityIndex = this.getRarityIndex(rarity);
    
    const basePower = (rarityIndex + 1) * 10 + dungeonLevel * 5;
    const attackPower = basePower + Math.floor(Math.random() * 20);
    
    return {
      name: this.generateEquipmentName(equipmentType || 'weapon', rarity),
      equipmentType: equipmentType as string,
      rarity,
      attackPower,
      defensePower: Math.floor(attackPower * 0.8),
      magicPower: Math.floor(attackPower * 0.6),
      specialAbility: this.generateSpecialAbility(rarity),
      attributes: [`${equipmentType} +${attackPower}`],
    };
  }

  private generateRarity(dungeonLevel: number): string {
    const roll = Math.random() * 100 + dungeonLevel * 2;
    if (roll >= 95) return 'mythic';
    if (roll >= 85) return 'legendary';
    if (roll >= 70) return 'epic';
    if (roll >= 50) return 'rare';
    if (roll >= 25) return 'uncommon';
    return 'common';
  }

  private generateEquipmentName(type: string, rarity: string): string {
    const prefixes = {
      common: 'Basic', uncommon: 'Enhanced', rare: 'Superior',
      epic: 'Heroic', legendary: 'Legendary', mythic: 'Mythic'
    };
    const names = {
      weapon: 'Sword', armor: 'Armor', accessory: 'Ring', consumable: 'Potion'
    };
    return `${prefixes[rarity as keyof typeof prefixes]} ${names[type as keyof typeof names]}`;
  }

  private generateSpecialAbility(rarity: string): string | null {
    const rarityIndex = this.getRarityIndex(rarity);
    if (rarityIndex < 2) return null;
    const abilities = ['Fire Damage', 'Ice Damage', 'Lightning Damage'];
    const ability = abilities[Math.floor(Math.random() * abilities.length)];
    return ability || null;
  }

  private getRarityIndex(rarity: string): number {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    return rarities.indexOf(rarity.toLowerCase());
  }
}

export const lootController = new LootController();