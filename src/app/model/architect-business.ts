export class ArchitectBusinessRecord {
  id: string = '';
  architectId: string = '';
  architectName: string = '';

  enquiryNumber: string = '';
  projectName: string = '';
  city: string = '';
  recordType: string = 'Enquiry';  // Enquiry | Quotation | Order
  status: string = '';             // Under Discussion | Quotation Sent | Won | Lost
  date: string = '';
  value: number | null = null;

  createdAt: number = 0;
}
