/**
 * Derive primary grinder / machine FKs from an ordered list of unified equipment ids
 * (first grinder and first machine in list order).
 */
export function syncPrimaryGrinderMachineFromEquipmentIds(
  orderedIds: string[],
  grinderIdSet: Set<string>,
  machineIdSet: Set<string>,
): { grinderId: string | undefined; machineId: string | undefined } {
  let grinderId: string | undefined;
  let machineId: string | undefined;
  for (const id of orderedIds) {
    if (!grinderId && grinderIdSet.has(id)) grinderId = id;
    if (!machineId && machineIdSet.has(id)) machineId = id;
  }
  return { grinderId, machineId };
}
