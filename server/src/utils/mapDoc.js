export function mapEmployee(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  return {
    id: String(obj._id),
    name: obj.name,
    contact: obj.contact,
    role: obj.role,
    createdAt: obj.createdAt
      ? new Date(obj.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

export function mapAttendance(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  return {
    id: String(obj._id),
    employeeId: String(obj.employeeId),
    employeeName: obj.employeeName,
    employeeContact: obj.employeeContact,
    employeeRole: obj.employeeRole,
    date: obj.date,
    status: obj.status,
    entryTime: obj.entryTime || '',
    exitTime: obj.exitTime || '',
    createdAt: obj.createdAt
      ? new Date(obj.createdAt).toISOString()
      : new Date().toISOString(),
  };
}
