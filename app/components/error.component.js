import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableHighlight,
} from 'react-native';
require('../publicenv');
import { globalStyles, fullWidth, fullHeight } from '../styles/global';
var moment = require('moment');
import * as errorActions from '../actions/error.actions';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

class ErrorComponent extends Component {
  constructor(props, context) {
    super(props, context);
  }

  componentWillUnmount() {
    this.props.actions.setError(false);
  }

  render() {
    var self = this;
    let errorEl = null;
    let reloadFunction = null;
    if (this.props.reloadFunction) reloadFunction = this.props.reloadFunction;

    if (this.props.error) {
      errorEl = (<TouchableHighlight underlayColor={'transparent'} onPress={() => reloadFunction()}>
        <Text style={{ fontSize: 20 }}>Reload</Text>
      </TouchableHighlight>);
    }

    return (
      <View pointerEvents={this.props.error ? 'auto' : 'none'} style={{ justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
        {errorEl}
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    error: state.error,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({
      ...errorActions,
    }, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ErrorComponent);
