import { Router } from 'express';
import { ok } from '../utils/response.js';
import attendanceRoutes from './attendanceRoutes.js';
import authRoutes from './authRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import roleRoutes from './roleRoutes.js';
import seedRoutes from './seedRoutes.js';
import statsRoutes from './statsRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  ok(res, {
    status: 'ok',
    service: 'nexsahay-attendance-api',
    database: 'mongodb',
  });
});

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/roles', roleRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/stats', statsRoutes);
router.use('/seed', seedRoutes);

export default router;
