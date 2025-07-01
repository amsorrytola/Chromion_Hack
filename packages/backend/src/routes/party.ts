import { Router } from 'express';
import { PartyController } from '../controllers/partyController';

const router = Router();
const partyController = new PartyController();

// Party management routes
router.post('/create', partyController.createParty.bind(partyController));
router.post('/join', partyController.joinParty.bind(partyController));
router.post('/leave', partyController.leaveParty.bind(partyController));
router.get('/available', partyController.getAllAvailableParties.bind(partyController));
router.get('/:partyId', partyController.getParty.bind(partyController));
router.get('/player/:address', partyController.getPlayerParty.bind(partyController));
router.put('/:partyId', partyController.updateParty.bind(partyController));
router.delete('/:partyId', partyController.disbandParty.bind(partyController));

// Party request routes
router.post('/request', partyController.requestToJoinParty.bind(partyController));
router.get('/:partyId/requests', partyController.getPartyRequests.bind(partyController));
router.post('/requests/:requestId/respond', partyController.respondToPartyRequest.bind(partyController));

export { router as partyRouter };
