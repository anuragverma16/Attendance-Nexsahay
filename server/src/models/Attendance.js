import mongoose from 'mongoose';
import { EMPLOYEE_ROLES } from './Employee.js';

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeName: { type: String, required: true, trim: true },
    employeeContact: { type: String, required: true, trim: true },
    employeeRole: {
      type: String,
      required: true,
      enum: EMPLOYEE_ROLES,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Present', 'Absent'],
    },
    attendanceStatus: {
      type: String,
      enum: ['Present', 'Late', 'Half Day', 'Absent', 'Leave'],
      default: 'Present',
    },
    leaveType: {
      type: String,
      enum: ['Casual Leave', 'Sick Leave', 'Paid Leave', 'Unpaid Leave', 'Other'],
      default: null,
    },
    leaveReason: { type: String, default: '' },
    leaveApproved: { type: Boolean, default: false },
    entryTime: { type: String, default: '' },
    exitTime: { type: String, default: '' },
    workingHours: { type: String, default: '' },
    punchedOut: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
