export const toggleIconSelection = (selectedIds: string[], targetId: string) =>
  selectedIds.includes(targetId)
    ? selectedIds.filter((id) => id !== targetId)
    : [...selectedIds, targetId];
