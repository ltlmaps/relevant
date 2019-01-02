/* eslint-disable no-console */
import { normalize, schema } from 'normalizr';
import * as types from 'core/actionTypes';
import { api, alert } from 'app/utils';

const linkSchema = new schema.Entity('links', {}, { idAttribute: '_id' });

const postSchema = new schema.Entity('posts', { metaPost: linkSchema }, { idAttribute: '_id' });

const userSchema = new schema.Entity('users', {}, { idAttribute: '_id' });

const investmentSchema = new schema.Entity(
  'investments',
  {
    post: postSchema,
    investor: userSchema
  },
  { idAttribute: '_id' }
);

export function updatePostVote(voteObj) {
  return {
    type: types.UPDATE_POST_INVESTMENTS,
    payload: [voteObj]
  };
}

export function undoPostVote(post) {
  return {
    type: types.UNDO_POST_INVESTMENT,
    payload: post
  };
}

export function setPosts(data) {
  return {
    type: 'SET_POSTS_SIMPLE',
    payload: { data }
  };
}

export function setInvestments(investments, userId, index) {
  return {
    type: 'SET_INVESTMENTS',
    payload: {
      investments,
      userId,
      index
    }
  };
}

export function loadingInvestments() {
  return {
    type: types.LOADING_INVESTMENTS
  };
}

export function setPostInvestments(data, postId, skip) {
  return {
    type: types.SET_POST_INVESTMENTS,
    payload: {
      postId,
      data,
      index: skip
    }
  };
}

export function setUsers(users) {
  return {
    type: types.SET_USERS,
    payload: users
  };
}

// optimistic ui
export function vote(amount, post, user, undo) {
  return async dispatch => {
    try {
      if (undo) dispatch(undoPostVote(post._id));
      else dispatch(updatePostVote({ post: post._id, amount }));
      const res = await api.request({
        method: 'POST',
        endpoint: 'invest',
        path: '/',
        body: JSON.stringify({
          investor: user._id,
          amount,
          post
        })
      });
      return res;
    } catch (error) {
      if (undo) dispatch(updatePostVote({ post: post._id, amount }));
      else dispatch(undoPostVote(post._id));
      alert.Alert().alert(error.message);
      // throw new Error(error.message);
    }
  };
}

export function getInvestments(token, userId, skip, limit) {
  return async dispatch => {
    try {
      dispatch(loadingInvestments());
      const res = await api.request({
        method: 'GET',
        endpoint: 'invest',
        path: '/' + userId,
        query: { skip, limit }
      });
      const data = normalize({ investments: res }, { investments: [investmentSchema] });
      dispatch(setPosts(data));
      dispatch(setInvestments(data, userId, skip));
    } catch (err) {
      console.log(err);
    }
  };
}

export function loadingPostInvestments(postId) {
  return {
    type: types.LOADING_POST_INVESTMENTS,
    payload: postId
  };
}

export function getPostInvestments(postId, limit, skip) {
  return async dispatch => {
    try {
      dispatch(loadingPostInvestments(postId));
      const res = await api.request({
        method: 'GET',
        endpoint: 'invest',
        query: { skip, limit },
        path: `/post/${postId}`
      });
      const data = normalize({ investments: res }, { investments: [investmentSchema] });
      dispatch(setUsers(data.entities.users));
      dispatch(setPostInvestments(data, postId, skip));
    } catch (err) {
      console.warn(err);
    }
  };
}