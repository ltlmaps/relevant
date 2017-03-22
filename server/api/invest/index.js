import express from 'express';
import controller from './invest.controller';
import auth from '../../auth/auth.service';

let router = express.Router();

router.post('/', auth.isAuthenticated(), controller.create);
router.delete('/destroy', auth.isAuthenticated(), controller.destroy);
router.get('/:userId', auth.authMiddleware(), controller.show);
router.get('/post/:postId', auth.authMiddleware(), controller.postInvestments);

module.exports = router;