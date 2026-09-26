import mongoose from 'mongoose';

const EMPLOYEE_ROLES = [
  'BDM',
  'BDE',
  'Graphic Designer',
  'Full Stack Developer',
];

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contact: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, 'Contact must be 10 digits'],
    },
    role: {
      type: String,
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },
    joiningDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Joining date must be YYYY-MM-DD'],
      default: '',
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const Employee = mongoose.model('Employee', employeeSchema);
export { EMPLOYEE_ROLES };
