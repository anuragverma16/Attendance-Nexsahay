import { Role } from '../models/Role.js';
import { ok, fail } from '../utils/response.js';

export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find()
      .select('_id name description isDefault createdAt')
      .sort({ isDefault: -1, name: 1 })
      .lean()
      .exec();
    return ok(res, roles);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch roles.');
  }
};

export const createRole = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const isDefault = Boolean(req.body?.isDefault);

    if (!name) {
      return fail(res, 400, 'Role name is required.');
    }

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return fail(res, 400, 'Role already exists.');
    }

    const role = await Role.create({
      name,
      description,
      isDefault,
    });

    return ok(res, role);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to create role.');
  }
};

export const updateRole = async (req, res) => {
  try {
    const id = req.params.id;
    const name = req.body?.name ? String(req.body.name).trim() : undefined;
    const description = req.body?.description !== undefined ? String(req.body.description).trim() : undefined;
    const isDefault = req.body?.isDefault !== undefined ? Boolean(req.body.isDefault) : undefined;

    const role = await Role.findById(id);
    if (!role) {
      return fail(res, 404, 'Role not found.');
    }

    if (name) {
      const existingRole = await Role.findOne({ name, _id: { $ne: id } });
      if (existingRole) {
        return fail(res, 400, 'Role name already exists.');
      }
      role.name = name;
    }

    if (description !== undefined) {
      role.description = description;
    }

    if (isDefault !== undefined) {
      role.isDefault = isDefault;
    }

    await role.save();
    return ok(res, role);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to update role.');
  }
};

export const deleteRole = async (req, res) => {
  try {
    const id = req.params.id;

    const role = await Role.findById(id);
    if (!role) {
      return fail(res, 404, 'Role not found.');
    }

    if (role.isDefault) {
      return fail(res, 400, 'Cannot delete default roles.');
    }

    await Role.findByIdAndDelete(id);
    return ok(res, { message: 'Role deleted successfully' });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to delete role.');
  }
};

export const initializeDefaultRoles = async () => {
  try {
    const defaultRoles = ['Admin', 'Manager', 'BDE', 'Graphic Designer', 'Content creator', 'IT'];

    const existingRoles = await Role.find({ name: { $in: defaultRoles } }).lean();
    const existingNames = new Set(existingRoles.map((r) => r.name));

    const rolesToCreate = defaultRoles
      .filter((name) => !existingNames.has(name))
      .map((name) => ({
        name,
        description: `${name} role`,
        isDefault: true,
      }));

    if (rolesToCreate.length > 0) {
      await Role.insertMany(rolesToCreate);
    }
  } catch (error) {
    console.error('Error initializing default roles:', error);
  }
};
