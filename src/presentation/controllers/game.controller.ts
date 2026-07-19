import { Response } from 'express';
import { GameService } from '../../domain/game/game.service';

const gameService = new GameService();

export const gameController = {
  async getTodayQuestions(req: any, res: Response) {
    try {
      const memberId = req.user.memberId;
      const tenantId = req.user.tenantId;
      if (!memberId) {
        return res.status(400).json({ error: 'ID Anggota wajib disertakan' });
      }
      const questions = await gameService.getTodayQuestions(memberId, tenantId);
      res.json(questions);
    } catch (e: any) {
      console.error('[gameController.getTodayQuestions] Error:', e);
      res.status(400).json({ error: e.message });
    }
  },

  async submitAnswer(req: any, res: Response) {
    try {
      const memberId = req.user.memberId;
      const tenantId = req.user.tenantId;
      if (!memberId) {
        return res.status(400).json({ error: 'ID Anggota wajib disertakan' });
      }
      const result = await gameService.submitAnswer(memberId, tenantId, req.body);
      res.json(result);
    } catch (e: any) {
      console.error('[gameController.submitAnswer] Error:', e);
      res.status(400).json({ error: e.message });
    }
  },

  async getGameProfile(req: any, res: Response) {
    try {
      const memberId = req.user.memberId;
      const tenantId = req.user.tenantId;
      if (!memberId) {
        return res.status(400).json({ error: 'ID Anggota wajib disertakan' });
      }
      const profile = await gameService.getGameProfile(memberId, tenantId);
      res.json(profile);
    } catch (e: any) {
      console.error('[gameController.getGameProfile] Error:', e);
      res.status(400).json({ error: e.message });
    }
  },

  async getLeaderboard(req: any, res: Response) {
    try {
      const tenantId = req.user.tenantId;
      const leaderboard = await gameService.getLeaderboard(tenantId);
      res.json(leaderboard);
    } catch (e: any) {
      console.error('[gameController.getLeaderboard] Error:', e);
      res.status(400).json({ error: e.message });
    }
  },
};
