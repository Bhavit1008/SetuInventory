import { Injectable } from '@angular/core';

export interface InventoryFilterSnapshot {
  filterValues: Record<string, any>;
  filterActive: boolean;
  sortField: 'none' | 'number' | 'date';
  sortDirection: 'asc' | 'desc';
  pageNumber: number;
}

/**
 * Remembers each Inventory List page's (Block/Slab/Process/Sold) last-used
 * filter/sort/page state, keyed by that page's category+statusFilter, so
 * navigating to View Product and back restores it instead of the page
 * reloading from scratch — InventoryListComponent is destroyed and
 * recreated on that round trip, so its own instance fields can't survive
 * it; this singleton (one per app session) can.
 */
@Injectable({ providedIn: 'root' })
export class InventoryFilterStateService {
  private snapshots = new Map<string, InventoryFilterSnapshot>();

  save(key: string, snapshot: InventoryFilterSnapshot): void {
    this.snapshots.set(key, snapshot);
  }

  get(key: string): InventoryFilterSnapshot | undefined {
    return this.snapshots.get(key);
  }
}
