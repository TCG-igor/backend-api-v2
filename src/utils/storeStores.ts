export type Company = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
};

export type Shop = {
  id: string;
  companyId: string;
  name: string;
  verified: boolean;
  status: 'submitted' | 'active' | 'blocked';
  createdAt: string;
};

export type ShopDraft = {
  id: string;
  ownerId: string;
  data: {
    companyName?: string;
    shopName?: string;
    [key: string]: any;
  };
  status: 'incomplete' | 'valid' | 'submitted';
  createdAt: string;
  updatedAt: string;
};

export const companies = new Map<string, Company>();
export const shops = new Map<string, Shop>();
export const shopDrafts = new Map<string, ShopDraft>();

// index to find a user's active draft
export const userDraftIndex = new Map<string, string>();

// track submitted drafts to ensure idempotency
export const submittedDrafts = new Set<string>();
