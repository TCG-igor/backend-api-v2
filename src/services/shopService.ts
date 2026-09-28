import { Request, Response } from 'express';
import { companies, shops, shopDrafts, userDraftIndex, submittedDrafts, ShopDraft, Company, Shop } from '../utils/storeStores';
import { users } from '../utils/userStore';

function generateId() { return Math.random().toString(36).slice(2,10); }

export async function startShopDraftHandler(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  // resume existing draft if present
  const existingId = userDraftIndex.get(user.id);
  if (existingId) {
    const d = shopDrafts.get(existingId);
    if (d) return res.json(d);
  }

  const draft: ShopDraft = { id: generateId(), ownerId: user.id, data: {}, status: 'incomplete', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  shopDrafts.set(draft.id, draft);
  userDraftIndex.set(user.id, draft.id);
  return res.status(201).json(draft);
}

export async function updateShopDraftHandler(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { draftId, data } = req.body;
  if (!draftId || !data) return res.status(400).json({ error: 'draftId and data required' });
  const d = shopDrafts.get(draftId);
  if (!d || d.ownerId !== user.id) return res.status(404).json({ error: 'not found' });
  d.data = { ...d.data, ...data };
  // basic validation: require companyName and shopName to be valid
  if (d.data.companyName && d.data.shopName) d.status = 'valid';
  d.updatedAt = new Date().toISOString();
  shopDrafts.set(d.id, d);
  return res.json(d);
}

export async function submitShopDraftHandler(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { draftId } = req.body;
  if (!draftId) return res.status(400).json({ error: 'draftId required' });
  const d = shopDrafts.get(draftId);
  if (!d || d.ownerId !== user.id) return res.status(404).json({ error: 'not found' });

  // idempotency: if already submitted, return existing shop/company
  if (submittedDrafts.has(draftId)) {
    const shop = Array.from(shops.values()).find(s => s.companyId && companies.get(s.companyId)?.name === d.data.companyName && s.name === d.data.shopName);
    if (shop) return res.json(shop);
  }

  if (d.status !== 'valid') return res.status(400).json({ error: 'draft not valid' });

  // create company and shop
  const company: Company = { id: generateId(), name: d.data.companyName!, ownerId: user.id, createdAt: new Date().toISOString() };
  companies.set(company.id, company);
  const shop: Shop = { id: generateId(), companyId: company.id, name: d.data.shopName!, verified: false, status: 'submitted', createdAt: new Date().toISOString() };
  shops.set(shop.id, shop);
  d.status = 'submitted';
  submittedDrafts.add(draftId);
  return res.json({ company, shop });
}

export async function getMyDraftHandler(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const draftId = userDraftIndex.get(user.id);
  if (!draftId) return res.json({ draft: null });
  const d = shopDrafts.get(draftId) || null;
  return res.json({ draft: d });
}

export async function adminListSubmittedHandler(req: Request, res: Response) {
  // list shops with status submitted
  const list = Array.from(shops.values()).filter(s => s.status === 'submitted');
  return res.json({ list });
}

export async function adminDecideShopHandler(req: Request, res: Response) {
  const { shopId, action, reason } = req.body; // action: 'approve' | 'reject' | 'block' | 'activate'
  if (!shopId || !action) return res.status(400).json({ error: 'shopId and action required' });
  const shop = shops.get(shopId);
  if (!shop) return res.status(404).json({ error: 'not found' });

  // record history entry
  const entry = { id: Math.random().toString(36).slice(2,10), shopId, action, reason, at: new Date().toISOString() };
  history.push(entry);

  if (action === 'approve') {
    shop.status = 'active';
    shop.verified = true;
  } else if (action === 'reject') {
    shop.status = 'blocked';
    shop.verified = false;
  } else if (action === 'block') {
    shop.status = 'blocked';
    shop.verified = false;
  } else if (action === 'activate') {
    // activation allowed only if company exists and shop was submitted
    if (shop.status !== 'submitted' && shop.status !== 'blocked') return res.status(400).json({ error: 'cannot activate from current state' });
    shop.status = 'active';
  }
  shops.set(shop.id, shop);
  return res.json({ ok: true, shop, entry });
}

export const history: Array<any> = [];

export async function adminGetHistoryHandler(req: Request, res: Response) {
  const { shopId } = req.query as any;
  if (shopId) {
    return res.json({ entries: history.filter(h => h.shopId === shopId) });
  }
  return res.json({ entries: history });
}

export async function adminCorrectHandler(req: Request, res: Response) {
  const { shopId, companyName, shopName, reason } = req.body;
  if (!shopId) return res.status(400).json({ error: 'shopId required' });
  const shop = shops.get(shopId);
  if (!shop) return res.status(404).json({ error: 'not found' });
  const company = companies.get(shop.companyId);
  if (!company) return res.status(404).json({ error: 'company not found' });

  const changes: any = {};
  if (companyName && company.name !== companyName) {
    changes.companyName = { from: company.name, to: companyName };
    company.name = companyName;
    companies.set(company.id, company);
  }
  if (shopName && shop.name !== shopName) {
    changes.shopName = { from: shop.name, to: shopName };
    shop.name = shopName;
    shops.set(shop.id, shop);
  }

  const entry = { id: Math.random().toString(36).slice(2,10), shopId, action: 'correct', details: changes, reason, at: new Date().toISOString() };
  history.push(entry);
  return res.json({ ok: true, shop, company, entry });
}

export async function draftResendHandler(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { draftId } = req.body;
  if (!draftId) return res.status(400).json({ error: 'draftId required' });
  const d = shopDrafts.get(draftId);
  if (!d || d.ownerId !== user.id) return res.status(404).json({ error: 'not found' });
  if (d.status !== 'valid') return res.status(400).json({ error: 'draft not valid' });

  // if previously submitted and shop exists
  const existingShop = Array.from(shops.values()).find(s => companies.get(s.companyId)?.name === d.data.companyName && s.name === d.data.shopName);
  if (existingShop) {
    // if blocked allow resend to set to submitted
    if (existingShop.status === 'blocked') {
      // resubmission from blocked brings it back to submitted for re-review
      existingShop.status = 'submitted';
      shops.set(existingShop.id, existingShop);
      const entry = { id: Math.random().toString(36).slice(2,10), shopId: existingShop.id, action: 'resend', at: new Date().toISOString() };
      history.push(entry);
      d.status = 'submitted';
      submittedDrafts.add(draftId);
      return res.json({ ok: true, shop: existingShop });
    }
    // if already submitted, idempotent
    if (existingShop.status === 'submitted') return res.json({ ok: true, shop: existingShop });
  }

  // otherwise create new submission (idempotent via submittedDrafts)
  if (submittedDrafts.has(draftId)) {
    const shop = Array.from(shops.values()).find(s => companies.get(s.companyId)?.name === d.data.companyName && s.name === d.data.shopName);
    return res.json({ ok: true, shop });
  }

  // create company and shop
  const company: Company = { id: Math.random().toString(36).slice(2,10), name: d.data.companyName!, ownerId: user.id, createdAt: new Date().toISOString() };
  companies.set(company.id, company);
  const shop: Shop = { id: Math.random().toString(36).slice(2,10), companyId: company.id, name: d.data.shopName!, verified: false, status: 'submitted', createdAt: new Date().toISOString() };
  shops.set(shop.id, shop);
  d.status = 'submitted';
  submittedDrafts.add(draftId);
  const entry = { id: Math.random().toString(36).slice(2,10), shopId: shop.id, action: 'resend-create', at: new Date().toISOString() };
  history.push(entry);
  return res.json({ ok: true, shop, company });
}

export async function getShopHandler(req: Request, res: Response) {
  const { id } = req.params as any;
  const shop = shops.get(id);
  if (!shop) return res.status(404).json({ error: 'not found' });
  const company = companies.get(shop.companyId) || null;
  return res.json({ shop, company });
}
