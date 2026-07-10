export class ArchitectInteraction {
  id: string = '';
  architectId: string = '';
  architectName: string = '';

  type: string = '';       // Call | Meeting | Office Visit | Showroom Visit
  date: string = '';
  time: string = '';
  team: string[] = [];
  notes: string = '';

  createdAt: number = 0;
}
