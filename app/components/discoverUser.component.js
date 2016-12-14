import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableHighlight,
} from 'react-native';
import { globalStyles } from '../styles/global';
import * as utils from '../utils';


let styles;

class DiscoverUser extends Component {
  constructor(props, context) {
    super(props, context);
    this.setSelected = this.setSelected.bind(this);
    this.abbreviateNumber = this.abbreviateNumber.bind(this);
  }

  componentWillMount() {
    if (!this.props.stats[this.props.user._id]) {
      this.props.actions.getStats(this.props.user._id);
    }
  }

  abbreviateNumber(num) {
    let fixed = 0;
    if (num === null) { return null; } // terminate early
    if (num === 0) { return '0'; } // terminate early
    if (typeof num !== 'number') num = Number(num);
    fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
    let b = (num).toPrecision(2).split('e'); // get power
    let k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3); // floor at decimals, ceiling at trillions
    let c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3) ).toFixed(1 + fixed); // divide by power
    let d = c < 0 ? c : Math.abs(c); // enforce -0 is 0
    let e = d + ['', 'K', 'M', 'B', 'T'][k]; // append power
    return e;
  }

  setSelected() {
    this.props.navigator.goToProfile(this.props.user);
  }

  render() {
    const user = this.props.user;
    let image = null;
    let imageEl = null;
    let percent = 0;
    let percentEl = null;
    let relevanceEl = null;
    let oldRel = null;
    const relevance = user.relevance || 0;
    percentEl = (<Text style={[{ textAlign: 'right' }, styles.active, styles.bebas, styles.quarterLetterSpacing]}>0%</Text>);

    percent = utils.percent.percentChange(user);
    if (percent > 0) {
      percentEl = (<Text style={[{ textAlign: 'right' }, styles.active, styles.bebas]}>▲{percent}%</Text>);
    } else if (percent < 0) {
      percentEl = (<Text style={[{ color: 'red', textAlign: 'right' }, styles.bebas]}> ▼{percent}%</Text>);
    }

    if (user.image) {
      image = user.image;
      imageEl = (<Image style={styles.discoverAvatar} source={{ uri: image }} />);
    } else {
      image = require('../assets/images/default_user.jpg');
      imageEl = (<Image style={styles.discoverAvatar} source={image} />);
    }

    if (user.relevance) {
      relevanceEl = (
        <Text>📈
          <Text
            style={[styles.bebas, styles.quarterLetterSpacing]}
          >
            {user.relevance ? this.abbreviateNumber(user.relevance) : null}
          </Text>
        </Text>);
    } else {
      relevanceEl = null;
    }

    return (
      <TouchableHighlight style={{ flex: 1, paddingBottom: 5 }} underlayColor={'transparent'} onPress={() => this.setSelected()}>
        <View style={[styles.discoverUser]}>
          <View style={[styles.leftDiscoverUser]}>
            {imageEl}
            <Text style={styles.darkGray}>{user.name}</Text>
          </View>
          <View style={[styles.rightDiscoverUser]}>
            <View>
              {percentEl}
            </View>
            <View>
              {relevanceEl}
            </View>
          </View>
        </View>
      </TouchableHighlight>
    );
  }
}

export default DiscoverUser;

const localStyles = StyleSheet.create({
  discoverAvatar: {
    height: 50,
    width: 50,
    borderRadius: 25,
    marginRight: 10,
    marginLeft: 0
  },
  discoverUser: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 10,
    paddingRight: 20,
    paddingBottom: 10,
    paddingLeft: 20,
  },
  leftDiscoverUser: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-start'
  },
  rightDiscoverUser: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-end'
  }
});

styles = { ...localStyles, ...globalStyles };

