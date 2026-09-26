# Role Management System - Implementation Guide

## Overview
A complete role management system has been added to your attendance system. This allows you to:
- Create custom roles
- Manage default system roles (HR, Admin, Manager)
- Assign roles to employees
- Track roles separately from employees

## What Was Added

### Backend Changes

#### 1. **New Role Model** (`server/src/models/Role.js`)
- `name` (String, required, unique): Role name (e.g., "HR", "Manager", "Custom Role")
- `description` (String): Optional description of the role
- `isDefault` (Boolean): Marks system default roles (HR, Admin, Manager)
- Automatic timestamps (createdAt, updatedAt)

#### 2. **Role Controller** (`server/src/controllers/roleController.js`)
Provides these functions:
- `getAllRoles()` - Fetch all roles sorted by default status
- `createRole(name, description, isDefault)` - Create new role
- `updateRole(id, name, description, isDefault)` - Update role details
- `deleteRole(id)` - Delete custom roles (default roles protected)
- `initializeDefaultRoles()` - Automatically creates HR, Admin, Manager on startup

#### 3. **Role Routes** (`server/src/routes/roleRoutes.js`)
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role

#### 4. **Updated Employee Model**
- Added `roleId` field (ObjectId reference to Role)
- Kept `role` field for backward compatibility
- Now supports both static and dynamic role assignment

#### 5. **Bootstrap Initialization**
- Default roles (HR, Admin, Manager) are automatically created on server startup
- Won't duplicate if they already exist

### Frontend Changes

#### 1. **New Types** (`client/src/lib/types.ts`)
```typescript
export type Role = {
  _id: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: string;
};
```

#### 2. **New API Functions** (`client/src/lib/api.ts`)
- `apiGetRoles()` - Fetch all roles
- `apiCreateRole(name, description, isDefault)` - Create role
- `apiUpdateRole(id, name, description, isDefault)` - Update role
- `apiDeleteRole(id)` - Delete role

## How to Use

### 1. Creating a Custom Role
```typescript
const newRole = await apiCreateRole({
  name: "Team Lead",
  description: "Senior team member",
  isDefault: false
});
```

### 2. Getting All Roles
```typescript
const roles = await apiGetRoles();
// Returns: [
//   { _id: "...", name: "HR", description: "HR role", isDefault: true, ... },
//   { _id: "...", name: "Admin", description: "Admin role", isDefault: true, ... },
//   { _id: "...", name: "Manager", description: "Manager role", isDefault: true, ... },
//   ...
// ]
```

### 3. Updating a Role
```typescript
const updated = await apiUpdateRole(roleId, {
  name: "Senior Manager",
  description: "Oversees team",
});
```

### 4. Deleting a Role
```typescript
// Only custom roles can be deleted (not default roles)
await apiDeleteRole(customRoleId);
```

### 5. Creating Employee with Custom Role
```typescript
const employee = await apiCreateEmployee({
  name: "John Doe",
  contact: "9876543210",
  role: "Team Lead", // Can now be any role from the system
  joiningDate: "2025-01-01"
});
```

## Database Schema

### Role Collection
```json
{
  "_id": ObjectId,
  "name": "Team Lead",
  "description": "Senior team member",
  "isDefault": false,
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

### Employee Collection (Updated)
```json
{
  "_id": ObjectId,
  "name": "John Doe",
  "contact": "9876543210",
  "role": "Team Lead",
  "roleId": ObjectId,  // NEW: Reference to Role document
  "joiningDate": "2025-01-01",
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

## Key Features

✅ **Default Roles Auto-Created**: HR, Admin, Manager are created automatically on first run
✅ **Protected Default Roles**: Cannot delete system default roles
✅ **Custom Roles**: Create unlimited custom roles
✅ **Unique Role Names**: Role names must be unique
✅ **Role Descriptions**: Optional descriptions for documentation
✅ **Backward Compatible**: Old employee records still work with static roles
✅ **Easy Integration**: Can be added to the employee form without breaking existing functionality

## Next Steps

To fully integrate this into your UI:

1. **Add Role Management Section** in your admin panel
   - Display all roles in a table
   - Add button to create new role
   - Edit/delete buttons for custom roles

2. **Update Employee Form**
   - Change role dropdown from hardcoded values
   - Dynamically load roles from API
   - Allow selection of any available role

3. **Employee Creation Flow**
   - When creating employee, automatically link to chosen role
   - Set both `role` (string) and `roleId` (reference)

4. **Role Assignment UI**
   - Add role management section in admin panel
   - List all roles with default badge
   - Modal/form to add new roles
   - Edit description or delete custom roles

## Example Usage in React

```typescript
const [roles, setRoles] = useState<Role[]>([]);

useEffect(() => {
  const loadRoles = async () => {
    try {
      const data = await apiGetRoles();
      setRoles(data);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };
  loadRoles();
}, []);

// In your employee creation form:
<select>
  {roles.map(role => (
    <option key={role._id} value={role.name}>
      {role.name} {role.isDefault && '(System)'}
    </option>
  ))}
</select>
```

## File Structure
```
server/
  src/
    models/
      Role.js (NEW)
    controllers/
      roleController.js (NEW)
    routes/
      roleRoutes.js (NEW)
    bootstrap.js (UPDATED)
      
client/
  src/
    lib/
      api.ts (UPDATED - added role functions)
      types.ts (UPDATED - added Role type)
```

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/roles` | Get all roles |
| POST | `/api/roles` | Create new role |
| PUT | `/api/roles/:id` | Update role |
| DELETE | `/api/roles/:id` | Delete custom role |

All endpoints return `{ success: true, data: ... }` on success or `{ success: false, message: ... }` on error.
