import { Router } from 'express';
import { GameController } from '../controllers/gameController';

const router = Router();
const gameController = new GameController();

// Game state routes
router.get('/state/:playerId', gameController.getGameState.bind(gameController));
router.post('/leave', gameController.leaveGame.bind(gameController));
router.get('/leaderboard', gameController.getLeaderboard.bind(gameController));

// Player routes
router.post('/player/connect', gameController.connectPlayer.bind(gameController));
router.get('/player/:wallet', gameController.getPlayer.bind(gameController));
router.put('/player/:playerId', gameController.updatePlayer.bind(gameController));

export { router as gameRouter };
