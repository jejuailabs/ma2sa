export interface Village {
  id: string;
  name: string;
  address: string;
  regionCode: string;
  description: string;
  photoURL: string;
  bannerURL: string;
  population: number | null;
  specialties: string[];
  createdBy: string;
  createdAt: Date;
  memberCount: number;
  settings: VillageSettings;
  formDefaults?: FormDefaults;
}

export interface FormDefaults {
  organizationName: string;
  representativeName: string;
  representativePhone: string;
  contactName: string;
  contactPhone: string;
  email: string;
}

export interface VillageSettings {
  isPublic: boolean;
  requireApproval: boolean;
  inviteOnly: boolean;
}

export interface Invite {
  code: string;
  villageId: string;
  villageName: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  usedBy: string[];
  maxUses: number;
  isActive: boolean;
}
