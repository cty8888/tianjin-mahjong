// ---------------------------------------------------------------------------
// Game API routes for Tianjin Mahjong (天津麻将)
// Task 9 — REST endpoints for game management and player actions.
// ---------------------------------------------------------------------------

import { Router, type Request, type Response } from 'express';
import { createNewGame, getGame, getActions, applyAction } from '../services/game-service';

export function createGameRouter(): Router {
  const router = Router();

  // POST /api/games — Create a new game
  router.post('/', (req: Request, res: Response) => {
    const { playerCount } = req.body;

    if (typeof playerCount !== 'number' || playerCount < 2 || playerCount > 4) {
      res.status(400).json({
        error: 'INVALID_PLAYER_COUNT',
        message: 'playerCount must be 2, 3, or 4',
      });
      return;
    }

    try {
      const game = createNewGame(playerCount);
      res.status(201).json({ game: { id: game.id, state: game } });
    } catch (err: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/games/:id/actions — Get available actions
  router.get('/:id/actions', (req: Request, res: Response) => {
    const game = getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'GAME_NOT_FOUND' });
      return;
    }

    const actions = getActions(game);
    if (actions === null) {
      res.status(400).json({
        error: 'GAME_NOT_PLAYING',
        message: 'Game is not in the playing phase',
      });
      return;
    }

    res.status(200).json(actions);
  });

  // POST /api/games/:id/actions — Submit a player action
  router.post('/:id/actions', (req: Request, res: Response) => {
    const game = getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'GAME_NOT_FOUND' });
      return;
    }

    const action = req.body;
    if (!action || typeof action.type !== 'string') {
      res.status(400).json({
        error: 'INVALID_ACTION',
        message: 'Action must have a type field',
      });
      return;
    }

    const result = applyAction(game, action);
    if (result.error) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json({ game: { id: game.id, state: game } });
  });

  // GET /api/games/:id — Get game state (must be after /actions to prevent id="actions")
  router.get('/:id', (req: Request, res: Response) => {
    const game = getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'GAME_NOT_FOUND' });
      return;
    }

    res.status(200).json({ game: { id: game.id, state: game } });
  });

  return router;
}
