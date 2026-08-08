import { Router } from 'express';
import { seed } from '../controllers/seedController.js';

const router = Router();
router.post('/', seed);

export default router;
