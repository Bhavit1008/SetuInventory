export interface AuditChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  category: string;
  productCode: string;
  slabNumber: string;
  performedBy: string;
  performedByRole: string;
  performedByStoreLocation: string;
  timestamp: number;
  summary: string;
  changes: AuditChange[];
}
