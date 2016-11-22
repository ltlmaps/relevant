import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import * as subscriptionActions from '../actions/subscription.actions';
import { globalStyles, fullWidth, fullHeight } from '../styles/global';

let defaultImg = require('../assets/images/default_user.jpg');

class ProfileComponent extends Component {
  constructor (props, context) {
    super(props, context);
    this.state = {
      followers: null,
      following: null,
    };
  }

  componentDidMount() {
    if (this.props.user) {
      if (this.props.user._id) {
        this.props.actions.getStats(this.props.user._id);
        subscriptionActions.getSubscriptionData('follower', this.props.user._id).then((response) => {
          this.setState({ following: response.data });
        });
        subscriptionActions.getSubscriptionData('following', this.props.user._id).then((response) => {
          this.setState({ followers: response.data });
        });
      }
    }
  }

  render() {
    const parentStyles = this.props.styles;
    const styles = { ...localStyles, ...parentStyles };
    let followers = null;
    let user = null;
    let userImage = null;
    let relevance = null;
    let balance = null;
    let userImageEl = null;
    let following = null;
    let relevanceEl = null;
    let percent = 0;
    let oldRel = null;
    let online = false;
    
    if (this.state.followers) followers = this.state.followers;
    if (this.state.following) following = this.state.following;


    if (this.props.user) {
      user = this.props.user;
      if (user.online) online = true;
      if (user.image) userImage = user.image;
      if (user.relevance) relevance = user.relevance.toFixed(1);
      if (user.balance) balance = user.balance.toFixed(0);
    }

    if (userImage) {
      userImageEl = (<Image source={{ uri: userImage }} style={styles.uploadAvatar} />);
    } else {
      userImageEl = (<Image source={defaultImg} style={styles.uploadAvatar} />);
    }
    if (this.props.stats[this.props.user._id]) {
      if (this.props.stats[this.props.user._id].startAmount) {
        oldRel = this.props.stats[this.props.user._id].startAmount;
      }
      if (relevance > 0) {
        let change = oldRel / relevance;
        percent = Math.round((1 - change) * 100);
      }
    }

    if (percent === 0) {
      relevanceEl = (<Text style={[styles.libre, {fontSize: 23}]}>📈Relevance <Text style={[styles.bebas]}>{relevance} <Text style={styles.active}>0%</Text></Text></Text>);
    }
    if (percent > 0) {
      relevanceEl = (<Text>📈<Text style={[styles.libre]}>{relevance} ⬆️{percent}%</Text></Text>);
    }
    if (percent < 0) {
      relevanceEl = (
        <Text>📈<Text style={styles.active}>{relevance}</Text>
          <Text style={{ color: 'red' }}> ⬇️{percent}%</Text>
        </Text>
      );
    }


    return (
      <View style={[styles.row, styles.fullWidthStyle, styles.padding10]}>
        <View>{userImageEl}</View>
        <View style={[styles.insideRow, styles.insidePadding]}>
          {relevanceEl}
          <Text style={[styles.libre, { fontSize: 25 }]}>💵Worth <Text style={[styles.bebas, {fontSize: 23}]}>{balance}</Text>
          </Text>

          <View style={styles.onlineRow}>
            <View style={user.online ? styles.onlineCirc : styles.offlineCirc} />
            <Text style={styles.darkGray}>
              {user.online ? 'Online' : 'Offline'}
            </Text>
          </View>

  
          <Text style={styles.darkGray}>
            Followers <Text style={styles.active}>{followers ? followers.length : 0}</Text>
          </Text>
          <Text style={styles.darkGray}>
            Following <Text style={styles.active}>{following ? following.length : 0}</Text>
          </Text>
        </View>
      </View>
    );
  }
}

const localStyles = StyleSheet.create({

});

export default ProfileComponent;

