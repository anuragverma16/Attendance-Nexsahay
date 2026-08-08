import { Router } from 'express';
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
} from '../controllers/employeeController.js';

const router = Router();

router.get('/', getEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;
