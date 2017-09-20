import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { numbers } from '../../../utils';
import Avatar from './avatar.component';

export default class AvatarBox extends Component {
  render() {
    const user = this.props.user
    const profileLink = '/profile/' + user._id;
    let timestamp;
    if (this.props.date) {
      timestamp = ' • ' + numbers.timeSince(Date.parse(this.props.date)) + ' ago';
    }
    if (this.props.topic) {
      timestamp = (
        <span>
          {' • '}
          <img src='/img/r-emoji.png' className='r' />
          {Math.round(this.props.topic.relevance)}
          in
          #{this.props.topic.name}
        </span>
      )
    }
    let relevance;
    if (user.relevance) {
      relevance = (
        <span>
          <img src='/img/r-emoji.png' className='r' />
          {Math.round(user.relevance)}
        </span>
      );
    }
    return (
      <div className='avatarBox'>
        <Avatar user={user} />
        <div className='userBox'>
          <div className='bebasRegular username'>
            <a href={profileLink}>{user.name}</a>
            {relevance}
          </div>
          <div className='gray'>
            @<a href={profileLink}>{user._id}</a>
            {timestamp}
          </div>
        </div>
      </div>
    );
  }
}
