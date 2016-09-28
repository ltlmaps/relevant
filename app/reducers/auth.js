import * as types from '../actions/actionTypes';
import { push } from 'react-router-redux';

const initialState = {
  token: null,
  isAuthenticated: false,
  isAuthenticating: false,
  statusText: null,
  user: null,
  userIndex: null,
  deviceToken: null
};


export default function auth(state = initialState, action) {
  //console.log(action.type, 'action type')
  switch (action.type) {

    case types.LOGIN_USER_REQUEST:
      return Object.assign({}, state, {
        'isAuthenticating': true,
        'statusText': null
      })

    case types.LOGIN_USER_SUCCESS:
      return Object.assign({}, state, {
        'isAuthenticating': false,
        'isAuthenticated': true,
        'token': action.payload.token,
        'statusText': 'You have been successfully logged in.'
      })

    case types.LOGIN_USER_FAILURE:
      return Object.assign({}, state, {
        'isAuthenticating': false,
        'isAuthenticated': false,
        'token': null,
        'user': null,
        'statusText': action.payload.statusText
      })

    case 'SET_AUTH_STATUS_TEXT':
      return Object.assign({}, state, {
        'statusText': action.payload
      })

    case types.LOGOUT_USER:
      return Object.assign({}, state, {
        'isAuthenticated': false,
        'token': null,
        'deviceToken': null,
        'user': null,
        'statusText': 'You have been successfully logged out.'
      })

    case types.SET_USER:
      return Object.assign({}, state, {
        'isAuthenticating': false,
        'isAuthenticated': action.payload ? true : false,
        'user': action.payload
      })

    case 'SET_DEVICE_TOKEN':
      return Object.assign({}, state, {
        'deviceToken': action.payload
      })

    case types.SET_USER_INDEX:
      return Object.assign({}, state, {
        'userIndex': action.payload
      })

    case types.SET_CONTACTS:
      return Object.assign({}, state, {
        'contacts': action.payload
      })


    default:
      return state
  }
};
