import express from 'express';
import controller from './invest.controller';
import auth from '../../auth/auth.service';

let router = express.Router();

router.post('/', auth.isAuthenticated(), auth.communityMember(), controller.create);
router.delete('/destroy', auth.isAuthenticated(), controller.destroy);
router.get('/downvotes', auth.hasRole('admin'), controller.downvotes);
router.get('/:userId', auth.blocked(), controller.show);
router.get('/post/:postId', auth.authMiddleware(), controller.postInvestments);

module.exports = router;
