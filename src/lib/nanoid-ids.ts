import { nanoid } from "nanoid";

/** Default size for nanoid segment (after prefix). 21 is nanoid default; short and URL-safe. */
const DEFAULT_SIZE = 21;

function prefixedId(prefix: string, size = DEFAULT_SIZE): string {
  return `${prefix}${nanoid(size)}`;
}

export function createUserId(): string {
  return prefixedId("u_");
}

export function createBeanId(): string {
  return prefixedId("b_");
}

export function createShotId(): string {
  return prefixedId("s_");
}

export function createBeansShareId(): string {
  return prefixedId("b2u_");
}

export function createOriginId(): string {
  return prefixedId("origin_");
}

export function createRoasterId(): string {
  return prefixedId("roast_");
}

export function createMachineId(): string {
  return prefixedId("mach_");
}

export function createGrinderId(): string {
  return prefixedId("grind_");
}

export function createFeedbackId(): string {
  return prefixedId("fbk_");
}

export function createImageId(): string {
  return prefixedId("img_");
}

export function createChatId(): string {
  return prefixedId("chat_");
}

export function createChatMessageId(): string {
  return prefixedId("cmsg_");
}

export function createAiUserMemoryId(): string {
  return prefixedId("aum_");
}

export function createAiBeansMemoryId(): string {
  return prefixedId("abm_");
}
