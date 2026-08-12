export class Employee {
  id: string = '';
  employeeName: string = '';
  employeeNumber: string = '';
  employeeEmail: string = '';
  /** Only ever sent on create/update — the backend never returns it. */
  password: string = '';
  role: string = '';
  storeLocation: string = '';
  createdAt: number = 0;
}
