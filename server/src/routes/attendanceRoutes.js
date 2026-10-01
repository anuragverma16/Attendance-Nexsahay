import { Router } from 'express';
import {
  deleteAttendance,
  getAttendance,
  markLeave,
  punchOut,
  updateAttendance,
  upsertAttendance,
} from '../controllers/attendanceController.js';

const router = Router();

router.get('/', getAttendance);
router.post('/', upsertAttendance);
router.post('/punch-out', punchOut);
router.post('/mark-leave', markLeave);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;
