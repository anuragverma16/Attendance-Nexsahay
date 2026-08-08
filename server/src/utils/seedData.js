import { Admin } from '../models/Admin.js';
import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { env } from '../config/env.js';

function todayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function seedDatabase() {
  await Promise.all([
    Employee.deleteMany({}),
    Attendance.deleteMany({}),
    Admin.deleteMany({}),
  ]);

  await Admin.create({
    username: env.adminUsername,
    password: env.adminPassword,
  });

  const employees = await Employee.insertMany([
    { name: 'Rahul Sharma', contact: '9876543210', role: 'BDM' },
    { name: 'Priya Patel', contact: '9876501234', role: 'BDE' },
    { name: 'Aman Verma', contact: '9988776655', role: 'Full Stack Developer' },
    { name: 'Neha Gupta', contact: '9123456780', role: 'Graphic Designer' },
    { name: 'Vikas Singh', contact: '9012345678', role: 'BDE' },
  ]);

  const attendanceDocs = [];
  const dayOffsets = [-2, -1, 0];

  dayOffsets.forEach((offset) => {
    const date = todayOffset(offset);
    employees.forEach((emp, index) => {
      const isAbsent =
        (offset === -1 && emp.role === 'BDE' && index === 1) ||
        (offset === 0 && emp.name === 'Vikas Singh');

      if (isAbsent) {
        attendanceDocs.push({
          employeeId: emp._id,
          employeeName: emp.name,
          employeeContact: emp.contact,
          employeeRole: emp.role,
          date,
          status: 'Absent',
          entryTime: '',
          exitTime: '',
        });
        return;
      }

      if (offset === 0 && emp.name === 'Neha Gupta') return;

      const hasExit = !(offset === 0 && emp.name === 'Aman Verma');
      attendanceDocs.push({
        employeeId: emp._id,
        employeeName: emp.name,
        employeeContact: emp.contact,
        employeeRole: emp.role,
        date,
        status: 'Present',
        entryTime: '10:00',
        exitTime: hasExit ? '18:30' : '',
      });
    });
  });

  const attendance = await Attendance.insertMany(attendanceDocs);

  return {
    employees: employees.length,
    attendance: attendance.length,
    admin: {
      username: env.adminUsername,
      password: env.adminPassword,
    },
  };
}
