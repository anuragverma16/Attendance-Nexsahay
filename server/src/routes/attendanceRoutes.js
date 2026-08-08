import { Router } from 'express';
import {
  deleteAttendance,
  getAttendance,
  updateAttendance,
  upsertAttendance,
} from '../controllers/attendanceController.js';

const router = Router();

router.get('/', getAttendance);
router.post('/', upsertAttendance);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;
