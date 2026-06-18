import { Id } from "./_generated/dataModel";

/**
 * Shared utility: returns the list of department IDs that a user has been
 * temporarily borrowed INTO (i.e. their expanded scope) at a given service time.
 *
 * This reads directly from borrowAssignments.targetDeptId — the destination dept
 * stored at approval time — so there is no fragile headId chain inference.
 */
export async function getUserBorrowedDepartmentIds(
  ctx: any,
  userId: Id<"users">,
  serviceTime: number
): Promise<Id<"departments">[]> {
  const assignments = await ctx.db
    .query("borrowAssignments")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  return assignments
    .filter(
      (a: any) =>
        a.status === "active" &&
        serviceTime >= a.startDate &&
        serviceTime <= a.endDate
    )
    .map((a: any) => a.targetDeptId)
    .filter(Boolean);
}

/**
 * Shared utility: returns true for roles that bypass department/subunit scoping.
 */
export function isGlobalAdmin(role: string | undefined): boolean {
  return ["SuperAdmin", "DeaconHead", "PastoralOversight"].includes(role ?? "");
}
