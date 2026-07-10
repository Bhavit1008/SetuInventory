export class ArchitectFollowUp {
  id: string = '';
  architectId: string = '';
  architectName: string = '';

  title: string = '';
  type: string = '';
  dueDate: string = '';
  priority: string = '';   // High | Medium | Low
  status: string = 'Pending'; // Pending | Completed
  notes: string = '';

  createdAt: number = 0;
  completedAt: number | null = null;
}
