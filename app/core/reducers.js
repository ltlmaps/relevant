import { combineReducers } from 'redux';
import notif from 'modules/activity/activity.reducer';
import animation from 'modules/animation/animation.reducer';
import auth from 'modules/auth/auth.reducer';
import admin from 'modules/admin/admin.reducer';
import community from 'modules/community/community.reducer';
import createPost from 'modules/createPost/createPost.reducer';
import posts from 'modules/post/post.reducer';
import user from 'modules/user/user.reducer';
import invest from 'modules/post/invest.reducer';
import comment from 'modules/comment/comment.reducer';
import tags from 'modules/tag/tag.reducer';
import stats from 'modules/stats/stats.reducer';
import tooltip from 'modules/tooltip/tooltip.reducer';
import error from 'modules/ui/error.reducer';
import earnings from 'modules/wallet/earnings.reducer';
import navigation from 'modules/navigation/navigation.reducer';
import { reducer as formReducer } from 'redux-form';
// import { reducer as RelevantToken } from './contracts';

// import { web3Reducers } from './web3.reducer';
import socket from './socket.reducer';
import view from './view.reducer';
import subscriptions from './subscriptions.reducer';

let RelevantToken = {};
let web3Reducers = {};

if (process.env.WEB !== 'true') {
  // might need this form for conditional require
} else {
  // block these imports in package.json in react-native field
  RelevantToken = require('./contracts').reducer;
  web3Reducers = require('./web3.reducer').web3Reducers;
}

let communityState = {};

const createReducer = (asyncReducers = {}) =>
  combineReducers({
    auth,
    posts,
    user,
    socket,
    form: formReducer,
    notif,
    error,
    animation,
    view,
    // TODO update
    investments: invest,
    stats,
    // TODO update
    comments: comment,
    navigation,
    createPost,
    tags,
    tooltip,
    subscriptions,
    admin,
    community,
    earnings,
    // ...drizzleReducers,
    web3: web3Reducers,
    ...RelevantToken,
    ...asyncReducers
  });

const appReducer = createReducer();

// export function injectAsyncReducer(store, name, asyncReducer) {
//   if (store.asyncReducers[name]) {
//     return;
//   }
//   store.asyncReducers[name] = asyncReducer;
//   appReducer = createReducer();
//   store.replaceReducer(createReducer(appReducer));
// }

const initialState = {
  posts: appReducer.posts,
  user: appReducer.user,
  stats: appReducer.stats
};

// Purpose of this reducer is to swap out community state
// we swap out posts, user data and stats
const rootReducer = (state, action) => {
  if (action.type === 'SET_COMMUNITY') {
    const { community } = state.auth; // eslint-disable-line

    if (community === action.payload) return appReducer(state, action);

    const { posts, user, stats, earnings } = state; // eslint-disable-line
    if (community) {
      communityState = {
        ...communityState,
        [community]: {
          posts,
          user,
          stats,
          earnings
        }
      };
    }

    const cachedCommunityState = communityState[action.payload] || initialState;
    const authUser =
      (state.auth.user &&
        cachedCommunityState.user &&
        cachedCommunityState.user.users[state.auth.user._id] &&
        cachedCommunityState.user.users[state.auth.user._id]) ||
      state.auth.user;

    const newState = {
      ...state,
      ...cachedCommunityState,
      auth: { ...state.auth, community: action.payload, user: authUser }
    };

    return appReducer(newState, action);
  }
  return appReducer(state, action);
};

export const _rootReducer = createReducer();

export default rootReducer;
