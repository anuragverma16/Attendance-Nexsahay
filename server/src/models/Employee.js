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
      enum: EMPLOYEE_ROLES,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

employeeSchema.index({ name: 1 });

export const Employee = mongoose.model('Employee', employeeSchema);
export { EMPLOYEE_ROLES };
