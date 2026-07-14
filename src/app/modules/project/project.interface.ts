export type TProjectFilterableFields = {
  searchTerm?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  deadlineStatus?: 'upcoming' | 'overdue';
};
