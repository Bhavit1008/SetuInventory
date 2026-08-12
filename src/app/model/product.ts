import { SlabPieces } from './slab-pieces';
import { SourceBlockDetails } from './source-block-details';

export class Product {
  id: string = '';
  category: string = '';
  productCode: string = '';
  /** The slab's own identifying code — distinct from productCode (which may reference the source block). */
  slabNumber: string = '';
  godownLocation: string = '';
  productQuality: string = '';
  productFinished: string = '';
  productLength: number = 0;
  productHeight: number = 0;
  productThickness: number = 0;
  productWidth: number = 0;
  productWeight: number = 0;
  quantity: number = 0;
  size: number = 0;
  exFactoryCost: number = 0;
  rate: number = 0;
  freightCost: number = 0;
  miscellaneousCost: number = 0;
  inHouseCost: number = 0;
  sellingCost: number = 0;
  royaltyCost: number = 0;
  status: string = '';
  description: string = '';
  pieces: SlabPieces[] = [];
  imageUrl: string = '';
  imageUrls: string[] = [];
  origin: string = '';
  material: string = '';
  product: string = '';

  // Captured when a product is marked Sold (see the Sold popup on view-product)
  partyName: string = '';
  soldQuantity: number = 0;   // Slabs only
  soldSqft: number = 0;       // Slabs only
  weightSold: number = 0;     // Blocks only (tons)
  soldDate: number | null = null; // epoch millis, picked via the Sold form's datepicker

  // Fields used by the dashboard (SearchPageComponent)
  sqft: number = 0;
  weightTons: number = 0;
  statusUpdatedAt: Date | string = '';

  createdAt: number = 0;

  /** Links a Block back to the catalogue (Marble Master) record it was created from. */
  catalogueItemId: string = '';

  /** Set only on a Slab that was converted from a Block — the block's own frozen details. */
  sourceBlock: SourceBlockDetails | null = null;
}