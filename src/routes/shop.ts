import { Router } from 'express';
import { startShopDraftHandler, updateShopDraftHandler, submitShopDraftHandler, getMyDraftHandler } from '../services/shopService';
import { adminListSubmittedHandler, adminDecideShopHandler } from '../services/shopService';
import { adminGetHistoryHandler, adminCorrectHandler, draftResendHandler, getShopHandler } from '../services/shopService';
import { adminMiddleware } from '../utils/adminMiddleware';
import { authMiddleware } from '../utils/authMiddleware';

const router = Router();

router.post('/draft/start', authMiddleware, startShopDraftHandler);
router.post('/draft/update', authMiddleware, updateShopDraftHandler);
router.post('/draft/submit', authMiddleware, submitShopDraftHandler);
router.get('/draft/me', authMiddleware, getMyDraftHandler);

router.get('/admin/submitted', authMiddleware, adminMiddleware, adminListSubmittedHandler);
router.post('/admin/decide', authMiddleware, adminMiddleware, adminDecideShopHandler);
router.get('/admin/history', authMiddleware, adminMiddleware, adminGetHistoryHandler);
router.post('/admin/correct', authMiddleware, adminMiddleware, adminCorrectHandler);
router.post('/draft/resend', authMiddleware, draftResendHandler);
router.get('/:id', getShopHandler);

export default router;
