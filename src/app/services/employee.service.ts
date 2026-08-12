import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee } from '../model/employee';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  static backendHost = 'https://setu-crm.onrender.com/';

  constructor(private httpClient: HttpClient) {}

  getAll(): Observable<Employee[]> {
    return this.httpClient.get<Employee[]>(EmployeeService.backendHost + 'employees');
  }

  add(employee: Partial<Employee>): Observable<Employee> {
    return this.httpClient.post<Employee>(EmployeeService.backendHost + 'employees', employee);
  }

  update(id: string, employee: Partial<Employee>): Observable<Employee> {
    return this.httpClient.put<Employee>(EmployeeService.backendHost + 'employees/' + id, employee);
  }

  delete(id: string, requestedBy: string | null): Observable<void> {
    const url = EmployeeService.backendHost + 'employees/' + id
      + (requestedBy ? '?requestedBy=' + encodeURIComponent(requestedBy) : '');
    return this.httpClient.delete<void>(url);
  }

  login(employeeName: string, password: string): Observable<Employee> {
    return this.httpClient.post<Employee>(EmployeeService.backendHost + 'employees/login', { employeeName, password });
  }
}
