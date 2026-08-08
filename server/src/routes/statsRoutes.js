import { Router } from 'express';
import { getSummary } from '../controllers/attendanceController.js';

const router = Router();
router.get('/summary', getSummary);

export default router;
