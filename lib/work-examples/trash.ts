import { WORK_EXAMPLE_TRASH_MS } from "@/lib/work-examples/constants";

export function workExampleTrashDeadline(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + WORK_EXAMPLE_TRASH_MS);
}

export function isWorkExampleTrashExpired(
  deletedAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!deletedAt) return false;
  return now.getTime() >= workExampleTrashDeadline(deletedAt).getTime();
}

export function isWorkExampleTrashActive(
  deletedAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!deletedAt) return false;
  return !isWorkExampleTrashExpired(deletedAt, now);
}
