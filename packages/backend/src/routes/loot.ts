import { Router } from 'express';
import { LootController } from '../controllers/lootController';

const router = Router();
const lootController = new LootController();

// Loot generation routes
router.post('/generate', lootController.generateLoot.bind(lootController));
router.post('/generate-dev', lootController.generateLootDev.bind(lootController));
router.get('/player/:playerId', lootController.getPlayerLoot.bind(lootController));
router.get('/equipment/:tokenId', lootController.getEquipment.bind(lootController));
router.post('/sync', lootController.syncEquipment.bind(lootController));

// Enhanced loot generation with VRF
router.post('/request-random', lootController.requestRandomLoot.bind(lootController));
router.get('/request-status/:chainId/:requestId', lootController.getRequestStatus.bind(lootController));
router.post('/request', lootController.requestLoot.bind(lootController));

// Equipment management
router.post('/set-lending-status', lootController.setLendingStatus.bind(lootController));
router.post('/burn', lootController.burnLoot.bind(lootController));

// Cross-chain transfer routes
router.post('/transfer-cross-chain', lootController.transferLootCrossChain.bind(lootController));
router.get('/cross-chain-fee', lootController.getCrossChainTransferFee.bind(lootController));
router.post('/cross-chain-fee', lootController.getCrossChainFee.bind(lootController));
router.get('/transfer-status/:transferId', lootController.getTransferStatus.bind(lootController));

// Lending marketplace routes
router.post('/lend', lootController.createLendingOrder.bind(lootController));
router.post('/borrow', lootController.borrowEquipment.bind(lootController));
router.get('/marketplace', lootController.getMarketplace.bind(lootController));
router.get('/user/:playerId/listings', lootController.getUserListings.bind(lootController));
router.get('/user/:playerId/borrowed', lootController.getUserBorrowedEquipment.bind(lootController));
router.put('/lending/:orderId', lootController.updateLendingOrder.bind(lootController));
router.delete('/lending/:orderId', lootController.cancelLendingOrder.bind(lootController));

export { router as lootRouter };
