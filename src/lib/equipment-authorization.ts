export function isSuperAdminRole(role: string | undefined): boolean {
  return role === "super-admin";
}

export function isEquipmentStaffRole(role: string | undefined): boolean {
  return role === "admin" || role === "super-admin";
}

/** Owner or admin/super-admin may attach or clear equipment photos. */
export function canSetEquipmentImage(params: {
  userId: string;
  role: string | undefined;
  equipmentCreatedBy: string | null;
}): boolean {
  if (isEquipmentStaffRole(params.role)) return true;
  return params.equipmentCreatedBy === params.userId;
}

/** Name, brand, specs: staff, or the user who created the row (not global catalog rows). */
export function canEditEquipmentMetadata(params: {
  userId: string;
  role: string | undefined;
  equipmentCreatedBy: string | null;
}): boolean {
  if (isEquipmentStaffRole(params.role)) return true;
  return params.equipmentCreatedBy === params.userId;
}
