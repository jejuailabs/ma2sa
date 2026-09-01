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
