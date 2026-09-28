import { Router } from 'express';
import { registerHandler, loginHandler, meHandler, verifyEmailHandler, requestRecoveryHandler, performRecoveryHandler, promoteToAdminHandler } from '../services/authService';
import { authMiddleware } from '../utils/authMiddleware';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.get('/me', authMiddleware, meHandler);
router.post('/verify', verifyEmailHandler);
router.post('/recovery/request', requestRecoveryHandler);
router.post('/recovery/perform', performRecoveryHandler);
router.post('/promote', promoteToAdminHandler);

import shopRoutes from './shop';
router.use('/shop', shopRoutes);

export default router;
