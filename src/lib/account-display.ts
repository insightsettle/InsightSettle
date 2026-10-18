/** Presentation only; access and verification decisions remain server-owned. */
export function showCustomerPrompts(isStaff: boolean, accessLoading: boolean) {
  return !isStaff && !accessLoading;
}

export function identityDisplayState(status: string | null | undefined, documents: { status: string }[]) {
  if (status === "verified") return "done";
  if (status === "rejected") return "todo";
  return documents.some(doc => doc.status === "pending") ? "pending" : "todo";
}