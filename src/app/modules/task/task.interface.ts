export type TTaskFilterableFields = {
  searchTerm?: string;
  projectId?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  assignedToId?: string;
  deadlineStatus?: 'upcoming' | 'overdue';
};
