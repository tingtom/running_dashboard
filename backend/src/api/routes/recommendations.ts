import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/recommendations
 * Get run recommendations based on training load theory
 *
 * Query params:
 * - weeks (optional): number of weeks to plan (default 4)
 * - goalDistance (optional): target weekly distance in km (if not provided, will progress from current)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const weeks = parseInt(req.query.weeks as string) || 4;
    const goalDistance = req.query.goalDistance ? parseFloat(req.query.goalDistance as string) : undefined;

    if (weeks < 1 || weeks > 12) {
      return res.status(400).json({ error: 'Weeks must be between 1 and 12' });
    }

    if (goalDistance !== undefined && (goalDistance < 5 || goalDistance > 200)) {
      return res.status(400).json({ error: 'Goal distance must be between 5 and 200 km per week' });
    }

    const recommendationService = req.app.locals.recommendationService;
    const recommendations = recommendationService.generate(weeks, goalDistance);

    res.json(recommendations);
  } catch (error: any) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

export default router;
