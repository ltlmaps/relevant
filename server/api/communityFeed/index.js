import express from 'express';
import controller from './communityFeed.controller';
import auth from '../../auth/auth.service';

const router = express.Router();

router.get('/', auth.blocked(), controller.get);

module.exports = router;