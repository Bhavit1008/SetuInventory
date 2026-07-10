export class ArchitectDocument {
  id: string = '';
  architectId: string = '';
  architectName: string = '';

  fileName: string = '';
  fileUrl: string = '';
  fileType: string = '';
  fileSizeBytes: number = 0;
  category: string = 'Other';  // Company | Project | Quotation | Other

  uploadedAt: number = 0;
}
