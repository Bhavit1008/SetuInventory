export class SlabPieces {
  id: number = 0;
  length: number = 0;
  width: number = 0;
  lessLength: number = 0;
  lessWidth: number = 0;
  totalArea: number = 0;
  editable: boolean = true;
  remark: string = '';
  imageBase64: string = '';   // local preview / upload payload
  imageUrl: string = '';      // server-returned URL after upload

  // ── Sold-recheck fields (set only when this piece goes through the Sold Slab Details form) ──
  /** Whether this piece was actually part of the sale being recorded (vs. staying in stock). */
  sold: boolean = false;
  /** Manually re-measured length/width at the time of sale — independent of the original grid length/width. */
  recheckedLength: number = 0;
  recheckedWidth: number = 0;
  /** (recheckedLength × recheckedWidth) / 144 — same inch-to-sqft conversion as the slab entry grid. */
  recheckedTotalArea: number = 0;
}