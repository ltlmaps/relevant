import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as animationActions from 'modules/animation/animation.actions';
import { globalStyles, fullHeight, fullWidth } from 'app/styles/global';
import Dollar from './coin.component';

const localStyles = StyleSheet.create({
  moneyContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: fullHeight,
    width: fullWidth
  }
});

const styles = { ...globalStyles, ...localStyles };

class InvestAnimation extends Component {
  static propTypes = {
    animation: PropTypes.object
  };

  constructor(props, context) {
    super(props, context);
    this.enabled = true;
    this.state = {
      investAni: [],
      num: 0
    };
    this.clearEls = this.clearEls.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  componentWillUpdate(next) {
    if (this.props.animation.invest !== next.animation.invest) {
      this.amount = Math.min(20, next.animation.amount.invest) || 10;
      this.investAni();
    }
  }

  componentWillUnmount() {
    this.clearEls();
  }

  clearEls() {
    // if (this.state.num > 0)
    this.setState({ num: 0, investAni: [] });
  }

  destroy(key) {
    delete this.state.investAni[key];
    this.setState({ thumbs: this.state.investAni });
  }

  investAni() {
    this.clearEls();
    const newArr = [];
    for (let i = 0; i < this.amount; i++) {
      newArr.push(
        <Dollar
          destroy={this.destroy}
          amount={this.amount}
          key={i + Math.random()}
          specialKey={i}
        />
      );
      this.setState({ investAni: newArr });
    }
  }

  render() {
    return (
      <View pointerEvents={'none'} style={styles.moneyContainer}>
        {this.state.investAni}
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    animation: state.animation
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(
      {
        ...animationActions
      },
      dispatch
    )
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InvestAnimation);
