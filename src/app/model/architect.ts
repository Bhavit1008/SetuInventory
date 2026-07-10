export class Architect {
  id: string = '';

  companyName: string = '';
  type: string = '';               // Architecture Firm | Interior Designer | Both
  logoUrl: string = '';
  photoUrl: string = '';

  contactPerson: string = '';
  designation: string = '';
  phone: string = '';
  whatsapp: string = '';
  email: string = '';

  officeAddress: string = '';
  city: string = '';
  state: string = '';
  pincode: string = '';
  mapLink: string = '';

  website: string = '';
  instagram: string = '';
  linkedin: string = '';

  about: string = '';
  yearEstablished: string = '';
  teamSize: string = '';
  projectType: string = '';

  specializations: string[] = [];
  serviceAreas: string[] = [];
  tags: string[] = [];

  status: string = 'Research';     // Research | Not Contacted | Contacted | Visited | Onboarded
  priority: string = '';           // A | B | C
  source: string = '';
  leadOwner: string = '';

  firstContactDate: string = '';
  lastContactDate: string = '';
  onboardedDate: string = '';

  createdAt: number = 0;
  updatedAt: number = 0;
}

/** Ordered stages powering the "Status & Stage" progress tracker. */
export const ARCHITECT_STAGES = ['Research', 'Not Contacted', 'Contacted', 'Visited', 'Onboarded'];
