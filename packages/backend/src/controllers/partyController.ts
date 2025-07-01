import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database/prisma';
import { blockchainService } from '../services/blockchainService';
import { logger } from '../utils/logger';
import { convertBigInt } from '../utils/convertBigInt';

export class PartyController {
  private getDb() {
    return getDatabase();
  }

  async createParty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {  playerAddress, name, maxSize = 4, chainId, onchainPartyId  } = req.body;
      const db= getDatabase();

      const player = await db.player.findUnique({
        where: { wallet: playerAddress }
      });
      const playerId = player?.id;

      if (!playerId || !playerAddress) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: playerId, playerAddress' 
        });
        return;
      }


      // Create party in database
      const party = await db.party.create({  // Updated to use 'db' instead of 'this.getDb()'
        data: {
          name,
          maxSize,
          chainId,
          onchainPartyId,
          members: {
            create: {
              playerId,
              role: 'leader',
              isLeader: true
            }
          }
        },
        include: {
          members: {
            include: {
              player: {
                select: { id: true, username: true, wallet: true }
              }
            }
          }
        }
      });

      res.json({ 
        success: true, 
        data: this.convertBigInt(party) 
      });
      

    } catch (error) {
      logger.error('Create party error:', error);
      next(error);
    }
  }

  async joinParty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { partyId, playerId, role = 'member' } = req.body;

      if (!partyId || !playerId || typeof partyId !== 'string' || typeof playerId !== 'string') {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: partyId, playerId' 
        });
        return;
      }

      // Check if party exists and has space
      const party = await this.getDb().party.findUnique({
        where: { id: partyId },
        include: {
          members: true
        }
      });

      if (!party || !party.isActive) {
        res.status(404).json({ 
          success: false, 
          message: 'Party not found or inactive' 
        });
        return;
      }

      if (party.members.length >= party.maxSize) {
        res.status(400).json({ 
          success: false, 
          message: 'Party is full' 
        });
        return;
      }

      // Check if player is already in this party
      const existingMember = party.members.find((m: any) => m.playerId === playerId);
      if (existingMember) {
        res.status(400).json({ 
          success: false, 
          message: 'Player is already in this party' 
        });
        return;
      }

      // Add player to party
      const member = await this.getDb().partyMember.create({
        data: {
          partyId,
          playerId,
          role,
          isLeader: false
        },
        include: {
          player: true,
          party: {
            include: {
              members: {
                include: {
                  player: true
                }
              }
            }
          }
        }
      });

      res.json({ 
        success: true, 
        data: this.convertBigInt(member.party) 
      });
      

    } catch (error) {
      logger.error('Join party error:', error);
      next(error);
    }
  }

  async leaveParty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { partyId, playerId } = req.body;

      if (!partyId || !playerId || typeof partyId !== 'string' || typeof playerId !== 'string') {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: partyId, playerId' 
        });
        return;
      }

      const member = await this.getDb().partyMember.findFirst({
        where: {
          partyId,
          playerId
        },
        include: {
          party: {
            include: {
              members: true
            }
          }
        }
      });

      if (!member) {
        res.status(404).json({ 
          success: false, 
          message: 'Player not found in party' 
        });
        return;
      }

      // Remove player from party
      await this.getDb().partyMember.delete({
        where: { id: member.id }
      });

      // If this was the last member, deactivate the party
      if (member.party.members.length === 1) {
        await this.getDb().party.update({
          where: { id: partyId },
          data: { isActive: false }
        });
      }
      // If the leader left, assign new leader
      else if (member.isLeader) {
        const remainingMembers = member.party.members.filter((m: any) => m.id !== member.id);
        if (remainingMembers.length > 0) {
          await this.getDb().partyMember.update({
            where: { id: remainingMembers[0].id },
            data: { isLeader: true, role: 'leader' }
          });
        }
      }

      res.json({ 
        success: true, 
        message: 'Left party successfully' 
      });

    } catch (error) {
      logger.error('Leave party error:', error);
      next(error);
    }
  }

  async getParty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { partyId } = req.params;


      const party = await getDatabase().party.findUnique({
        where: { id: partyId },
        include: {
          members: {
            include: {
              player: true
            }
          },
          dungeonRuns: {
            orderBy: { startedAt: 'desc' },
            take: 10
          }
        }
      });

      if (!party) {
        res.status(404).json({ 
          success: false, 
          message: 'Party not found' 
        });
        return;
      }

      res.json({ 
        success: true, 
        data: this.convertBigInt(party) 
      });
      

    } catch (error) {
      next(error);
    }
  }

  async getPlayerParty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { address } = req.params;
      const db = getDatabase();
      const player = await db.player.findUnique({
        where: { wallet: address }
      });
      console.log('Player found:', player);
      
      if (!player) {
        res.status(404).json({
          success: false,
          message: 'Player not found'
        });
        return;
      }
      const playerId = player?.id;
      const membership = await db.partyMember.findFirst({
        where: {
          playerId,
          party: { isActive: true }
        },
        include: {
          party: {
            include: {
              members: {
                include: {
                  player: true
                }
              }
            }
          }
        }
      });

      if (!membership) {
        res.json({ 
          success: true, 
          data: null 
        });
        return;
      }

      res.json({ 
        success: true, 
        data: membership ? this.convertBigInt(membership.party) : null 
      });
      

    } catch (error) {
      next(error);
    }
  }

  async updateParty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { partyId } = req.params;
      const updateData = req.body;

      const party = await this.getDb().party.update({
        where: { id: partyId },
        data: updateData,
        include: {
          members: {
            include: {
              player: true
            }
          }
        }
      });

      res.json({ 
        success: true, 
        data: this.convertBigInt(party) 
      });
      

    } catch (error) {
      next(error);
    }
  }

  async disbandParty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { partyId } = req.params;
      const { playerId } = req.body;
  
      const db = this.getDb();
  
      // Step 1: Check if player is the leader
      const leader = await db.partyMember.findFirst({
        where: {
          partyId,
          playerId,
          isLeader: true
        }
      });
  
      if (!leader) {
        res.status(403).json({ 
          success: false, 
          message: 'Only the party leader can disband the party' 
        });
        return;
      }
  
      // Step 2: Delete related partyMembers first (required if Prisma doesn't cascade)
      await db.partyMember.deleteMany({
        where: { partyId }
      });
      console.log(`Deleted party members for party ${partyId}`);
  
      // Step 3: Delete the party itself
      await db.party.delete({
        where: { id: partyId }
      });
      console.log(`Deleted party ${partyId}`);
  
      res.json({ 
        success: true, 
        message: 'Party fully deleted from backend' 
      });
    } catch (error) {
      console.error('Error during disbandParty:', error);
      next(error);
    }
  }
  

  async getAllAvailableParties(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 20, offset = 0, excludePlayerId } = req.query;
  
      let whereClause: any = {
        isActive: true,
      };
  
      if (excludePlayerId) {
        whereClause.members = {
          none: {
            playerId: excludePlayerId as string
          }
        };
      }
  
      const parties = await this.getDb().party.findMany({
        where: whereClause,
        include: {
          members: {
            include: {
              player: {
                select: { id: true, username: true, wallet: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });
  
      const availableParties = parties.filter(party => party.members.length < party.maxSize);
  
      res.json({ 
        success: true, 
        data: convertBigInt(availableParties)
      });
  
    } catch (error) {
      logger.error('Get available parties error:', error);
      next(error);
    }
  }
  

  async requestToJoinParty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { partyId, playerId, message } = req.body;

      if (!partyId || !playerId) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: partyId, playerId' 
        });
        return;
      }

      // Check if party exists and is active
      const party = await this.getDb().party.findUnique({
        where: { id: partyId },
        include: { members: true }
      });

      if (!party || !party.isActive) {
        res.status(404).json({ 
          success: false, 
          message: 'Party not found or inactive' 
        });
        return;
      }

      // Check if party is full
      if (party.members.length >= party.maxSize) {
        res.status(400).json({ 
          success: false, 
          message: 'Party is full' 
        });
        return;
      }

      // Check if player is already in this party
      const existingMember = party.members.find((m: any) => m.playerId === playerId);
      if (existingMember) {
        res.status(400).json({ 
          success: false, 
          message: 'You are already in this party' 
        });
        return;
      }

      // Check if request already exists
      const existingRequest = await this.getDb().partyRequest.findUnique({
        where: { 
          partyId_playerId: { partyId, playerId }
        }
      });

      if (existingRequest) {
        res.status(400).json({ 
          success: false, 
          message: 'Request already sent' 
        });
        return;
      }

      // Create the party request
      const request = await this.getDb().partyRequest.create({
        data: {
          partyId,
          playerId,
          message: message || null,
          status: 'pending'
        },
        include: {
          player: {
            select: { id: true, username: true, wallet: true }
          },
          party: {
            include: {
              members: {
                where: { isLeader: true },
                include: {
                  player: {
                    select: { id: true, wallet: true }
                  }
                }
              }
            }
          }
        }
      });

      // TODO: Emit notification to party leader via socket
      // This would require access to the socket manager

      res.json({ 
        success: true, 
        data: this.convertBigInt(request),
        message: 'Request sent successfully' 
      });
      

    } catch (error) {
      logger.error('Request to join party error:', error);
      next(error);
    }
  }

  async getPartyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { partyId } = req.params;

      if (!partyId) {
        res.status(400).json({ 
          success: false, 
          message: 'Party ID is required' 
        });
        return;
      }

      const db = getDatabase();

      // Get all pending requests for this party
      const requests = await db.partyRequest.findMany({
        where: {
          partyId,
          status: 'pending'
        },
        include: {
          player: {
            select: { id: true, username: true, wallet: true, level: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json({ 
        success: true, 
        data: this.convertBigInt(requests) 
      });
      

    } catch (error) {
      logger.error('Get party requests error:', error);
      next(error);
    }
  }

  async respondToPartyRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { requestId } = req.params;
      const { action, responderId } = req.body; // action: 'approve' | 'reject'

      if (!requestId || !action || !responderId) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: requestId, action, responderId' 
        });
        return;
      }

      // Get the request
      const request = await this.getDb().partyRequest.findUnique({
        where: { id: requestId },
        include: {
          party: {
            include: {
              members: {
                where: { isLeader: true }
              }
            }
          },
          player: true
        }
      });

      if (!request) {
        res.status(404).json({ 
          success: false, 
          message: 'Request not found' 
        });
        return;
      }

      // Check if responder is the party leader
      const isLeader = request.party.members.some((member: any) => 
        member.playerId === responderId && member.isLeader
      );

      if (!isLeader) {
        res.status(403).json({ 
          success: false, 
          message: 'Only party leaders can respond to requests' 
        });
        return;
      }

      if (action === 'approve') {
        // Check if party still has space
        const currentParty = await this.getDb().party.findUnique({
          where: { id: request.partyId },
          include: { members: true }
        });

        if (!currentParty || currentParty.members.length >= currentParty.maxSize) {
          res.status(400).json({ 
            success: false, 
            message: 'Party is now full' 
          });
          return;
        }

        // Add player to party and update request status
        await this.getDb().$transaction([
          this.getDb().partyMember.create({
            data: {
              partyId: request.partyId,
              playerId: request.playerId,
              role: 'member',
              isLeader: false
            }
          }),
          this.getDb().partyRequest.update({
            where: { id: requestId },
            data: { status: 'approved' }
          })
        ]);

        res.json({ 
          success: true, 
          message: 'Request approved and player added to party' 
        });
      } else if (action === 'reject') {
        // Update request status to rejected
        await this.getDb().partyRequest.update({
          where: { id: requestId },
          data: { status: 'rejected' }
        });

        res.json({ 
          success: true, 
          message: 'Request rejected' 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid action. Use "approve" or "reject"' 
        });
      }

    } catch (error) {
      logger.error('Respond to party request error:', error);
      next(error);
    }
  }

   convertBigInt(obj: any): any {
    if (typeof obj === 'bigint') return obj.toString();
    if (Array.isArray(obj)) return obj.map(this.convertBigInt);
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, convertBigInt(value)])
      );
    }
    return obj;
  }
  
}
