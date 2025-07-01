import { Router } from 'express';
import { AIController } from '../controllers/aiController';

const router = Router();
const aiController = new AIController();

// AI NPC interaction routes
router.post('/interact', aiController.interactWithNPC.bind(aiController));
router.get('/npcs', aiController.getAvailableNPCs.bind(aiController));
router.get('/history/:playerId', aiController.getInteractionHistory.bind(aiController));
router.post('/quest/:npcId', aiController.getQuest.bind(aiController));

export { router as aiRouter };
