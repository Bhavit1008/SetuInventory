/**
 * Frozen snapshot of the source block's own details, captured at the
 * moment it's converted into a slab. The conversion reuses the same
 * record id and overwrites every block-specific field (dimensions,
 * weight, photos) with the slab's own — this snapshot is the only place
 * that data survives afterward.
 */
export class SourceBlockDetails {
  blockCode: string = '';
  godownLocation: string = '';
  productQuality: string = '';
  productLength: number = 0;
  productWidth: number = 0;
  productHeight: number = 0;
  productWeight: number = 0;
  status: string = '';
  description: string = '';
  imageUrl: string = '';
  imageUrls: string[] = [];
  convertedAt: number = 0;
}
