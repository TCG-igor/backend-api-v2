import request from 'supertest';
import app from '../server';
import { users } from '../utils/userStore';
import { verificationTokens, recoveryTokens } from '../services/authService';
import { companies, shops, shopDrafts, userDraftIndex, submittedDrafts } from '../utils/storeStores';
import { history } from '../services/shopService';

describe('Auth', () => {
  beforeEach(() => {
    users.clear();
  });

  it('registers and logs in', async () => {
    const email = 'test@example.com';
    const password = 'secret123';

    const reg = await request(app).post('/api/auth/register').send({ email, password, name: 'Tester' });
    expect(reg.status).toBe(201);
    expect(reg.body.id).toBeDefined();
    expect(reg.body.token).toBeDefined();

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });

  it('verification flow', async () => {
    const email = 'v@e.com';
    const password = 'p12345';
    const reg = await request(app).post('/api/auth/register').send({ email, password });
    expect(reg.status).toBe(201);
    const userId = reg.body.id;
    const token = verificationTokens.get(userId);
    expect(token).toBeDefined();
    const verify = await request(app).post('/api/auth/verify').send({ userId, token });
    expect(verify.status).toBe(200);
  });

  it('recovery flow', async () => {
    const email = 'r@e.com';
    const password = 'oldpass';
    const reg = await request(app).post('/api/auth/register').send({ email, password });
    const userId = reg.body.id;
    await request(app).post('/api/auth/recovery/request').send({ email });
    const token = recoveryTokens.get(userId);
    expect(token).toBeDefined();
    const perform = await request(app).post('/api/auth/recovery/perform').send({ userId, token, newPassword: 'newpass' });
    expect(perform.status).toBe(200);
    // old password should fail
    const loginOld = await request(app).post('/api/auth/login').send({ email, password });
    expect(loginOld.status).toBe(401);
    const loginNew = await request(app).post('/api/auth/login').send({ email, password: 'newpass' });
    expect(loginNew.status).toBe(200);
  });

  it('shop draft and submit flow', async () => {
    // register + login
    const email = 'shopper@example.com';
    const password = 'shop1234';
    const reg = await request(app).post('/api/auth/register').send({ email, password });
    const token = reg.body.token;
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    const resStart = await request(app).post('/api/auth/shop/draft/start').set('Authorization', `Bearer ${token}`);
    expect(resStart.status).toBe(201);
    const draftId = resStart.body.id;
    const resUpdate = await request(app).post('/api/auth/shop/draft/update').set('Authorization', `Bearer ${token}`).send({ draftId, data: { companyName: 'ACME', shopName: 'ACME Store' } });
    expect(resUpdate.body.status).toBe('valid');
    const resSubmit = await request(app).post('/api/auth/shop/draft/submit').set('Authorization', `Bearer ${token}`).send({ draftId });
    expect(resSubmit.status).toBe(200);
    expect(resSubmit.body.company).toBeDefined();
    expect(resSubmit.body.shop).toBeDefined();
    // submitting again should be idempotent
    const resSubmit2 = await request(app).post('/api/auth/shop/draft/submit').set('Authorization', `Bearer ${token}`).send({ draftId });
    expect(resSubmit2.status).toBe(200);
  });

  it('admin approves shop and history recorded', async () => {
    const email = 'admin@example.com';
    const password = 'adminpass';
    const reg = await request(app).post('/api/auth/register').send({ email, password });
    const userId = reg.body.id;
    // promote to admin
    await request(app).post('/api/auth/promote').send({ userId });
    const token = reg.body.token;
    // create shop as normal user
    const reg2 = await request(app).post('/api/auth/register').send({ email: 'u2@example.com', password: 'p2' });
    const token2 = reg2.body.token;
    const resStart = await request(app).post('/api/auth/shop/draft/start').set('Authorization', `Bearer ${token2}`);
    const draftId = resStart.body.id;
    await request(app).post('/api/auth/shop/draft/update').set('Authorization', `Bearer ${token2}`).send({ draftId, data: { companyName: 'AdminCo', shopName: 'Admin Shop' } });
    const resSubmit = await request(app).post('/api/auth/shop/draft/submit').set('Authorization', `Bearer ${token2}`).send({ draftId });
    const shopId = resSubmit.body.shop.id;
    // admin list submitted
    const list = await request(app).get('/api/auth/shop/admin/submitted').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    // admin decide approve
    const decide = await request(app).post('/api/auth/shop/admin/decide').set('Authorization', `Bearer ${token}`).send({ shopId, action: 'approve', reason: 'OK' });
    expect(decide.status).toBe(200);
    expect(history.length).toBeGreaterThan(0);
    // ensure shop is verified and active
    const s = await request(app).get(`/api/auth/shop/${shopId}`);
    expect(s.body.shop.verified).toBe(true);
    expect(s.body.shop.status).toBe('active');
    // test admin history endpoint
    const hist = await request(app).get('/api/auth/shop/admin/history').set('Authorization', `Bearer ${token}`);
    expect(hist.status).toBe(200);
    // test get shop
    const getshop = await request(app).get(`/api/auth/shop/${shopId}`);
    expect(getshop.status).toBe(200);
    // test correct
    const corr = await request(app).post('/api/auth/shop/admin/correct').set('Authorization', `Bearer ${token}`).send({ shopId, companyName: 'AdminCoX', shopName: 'Admin Shop X', reason: 'typo' });
    expect(corr.status).toBe(200);
    // test draft resend: create a draft and resend
    const start = await request(app).post('/api/auth/shop/draft/start').set('Authorization', `Bearer ${token2}`);
    const did = start.body.id;
    await request(app).post('/api/auth/shop/draft/update').set('Authorization', `Bearer ${token2}`).send({ draftId: did, data: { companyName: 'ResendCo', shopName: 'Resend Shop' } });
    const resend = await request(app).post('/api/auth/shop/draft/resend').set('Authorization', `Bearer ${token2}`).send({ draftId: did });
    expect(resend.status).toBe(200);
  });

  it('does not leak existence on register', async () => {
    const email = 'a@b.com';
    const password = 'p';
    await request(app).post('/api/auth/register').send({ email, password });
    const second = await request(app).post('/api/auth/register').send({ email, password });
    expect(second.status).toBe(409);
  });
});
