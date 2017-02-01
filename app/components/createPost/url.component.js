import React, { Component } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native';
import { globalStyles } from '../../styles/global';
import * as utils from '../../utils';
import UrlPreview from './urlPreview.component';
import UserName from '../userNameSmall.component';
import UserSearchComponent from './userSearch.component';
import PostBody from './../post/postBody.component';
import PostInfo from './../post/postInfo.component';

let styles;
const URL_REGEX = new RegExp(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);

export default class UrlComponent extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      inputHeight: 100,
    };
    this.setMention = this.setMention.bind(this);
    this.previousPostLength = 0;
  }

  componentDidMount() {
    if (this.props.postUrl) {
      this.createPreview(this.props.postUrl);
    }
  }

  componentWillReceiveProps(next) {
    if (!this.props.postUrl && next.postUrl) {
      this.createPreview(next.postUrl);
    }
  }

  setMention(user) {
    let postBody = this.props.postBody.replace(this.mention, '@' + user._id);
    this.props.actions.setCreaPostState({ postBody });
    this.props.actions.setUserSearch([]);
    this.input.focus();
  }

  processInput(postBody, doneTyping) {
    let length = postBody ? postBody.length : 0;

    if (doneTyping) postBody = this.props.postBody;
    let lines = postBody.split('\n');
    let words = [];
    lines.forEach(line => words = words.concat(line.split(' ')));

    let shouldParseUrl = false;

    if (length - this.previousPostLength > 1) shouldParseUrl = true;
    if (postBody[postBody.length - 1] === ' ') shouldParseUrl = true;
    if (postBody[postBody.length - 1] == '\n') shouldParseUrl = true;

    this.previousPostLength = length;

    if (!this.props.postUrl && shouldParseUrl) {
      let postUrl = words.find(word => URL_REGEX.test(word));
      if (postUrl) {
        this.props.actions.setCreaPostState({ postUrl });
        // this.createPreview(postUrl);
      }
    }

    let lastWord = words[words.length - 1];
    if (lastWord.match(/^@\S+/g) && lastWord.length > 1) {
      this.mention = lastWord;
      this.props.actions.searchUser(lastWord.replace('@', ''));
    }
    else this.props.actions.setUserSearch([]);

    let bodyTags = words.map((word) => {
      if (word.match(/^#\S+/g)) {
        return word.replace('#', '').replace(/(,|\.|!|\?)\s*$/, '');
      }
      return null;
    })
    .filter(el => el !== null);

    let bodyMentions = words.map((word) => {
      if (word.match(/^@\S+/g)) {
        return word.replace('@', '').replace(/(,|\.|!|\?)\s*$/, '');
      }
      return null;
    })
    .filter(el => el !== null);

    if (this.props.urlPreview && this.props.postUrl && postBody.match(this.props.postUrl)) {
      postBody = postBody.replace(`${this.props.postUrl}`, '').trim();
    }

    this.props.actions.setCreaPostState({ postBody, bodyTags, bodyMentions });
  }

  createPreview(postUrl) {
    console.log('creating peview ', postUrl);
    utils.post.generatePreview(postUrl)
    .then((results) => {
      if (results) {
        let newBody = this.props.postBody.replace(`${postUrl}`, '').trim();
        console.log(results, 'results');
        this.props.actions.setCreaPostState({
          postBody: newBody,
          domain: results.domain,
          postUrl: results.url,
          urlPreview: {
            image: results.image,
            title: results.title ? results.title : 'Untitled',
            description: results.description,
          }
        });
      } else {
        this.props.actions.setCreaPostState({ postUrl: null });
      }
    });
  }

  extractDomain(url) {
    let domain;
    if (url.indexOf('://') > -1) {
      domain = url.split('/')[2];
    } else {
      domain = url.split('/')[0];
    }
    domain = domain.split(':')[0];

    let noPrefix = domain;

    if (domain.indexOf('www.') > -1) {
      noPrefix = domain.replace('www.', '');
    }
    return noPrefix;
  }

  render() {
    let input;
    let repostBody;

    let maxHeight = 170;
    if (this.props.share) maxHeight = 170;

    if (this.props.repost) {
      repostBody = (
        <View>
          <PostInfo post={this.props.repost} />
          <PostBody post={this.props.repost} />
        </View>);
    }

    let urlPlaceholder = 'What’s relevant? Add a link to post commentary.';

    if (this.props.postUrl) urlPlaceholder = 'Why is this relevant?';

    let userHeader = null;

    if (this.props.user && !this.props.share) {
      userHeader = (
        <View style={styles.createPostUser}>
          <View style={styles.innerBorder}>
            <UserName
              style={styles.innerBorder}
              user={this.props.user}
              setSelected={() => null}
            />
          </View>
        </View>
      );
    }

    let userSearch = null;

    if (this.props.users.search && this.props.users.search.length) {
      userSearch = <UserSearchComponent setSelected={this.setMention} users={this.props.users.search} />;
    }

    input = (
      <KeyboardAvoidingView
        behavior={'padding'}
        style={{
          flex: 1,
          backgroundColor: '#ffffff'
        }}
      >
        <ScrollView
          keyboardDismissMode={'on-drag'}
          keyboardShouldPersistTaps
          style={{
            flex: 1,
            paddingHorizontal: 10,
          }}
        >
          {userHeader}

          <View
            style={[
              this.props.urlPreview ? styles.innerBorder : null,
              this.props.share ? styles.noBorder : null,
              { height: Math.min(maxHeight, this.state.inputHeight) }]
            }
          >
            <TextInput
              ref={(c) => { this.input = c; }}
              style={[styles.font15, styles.createPostInput, styles.flex1]}
              placeholder={urlPlaceholder}
              multiline
              onChangeText={postBody => this.processInput(postBody)}
              onBlur={() => this.processInput(null, true)}
              value={this.props.postBody}
              returnKeyType={'default'}
              autoFocus
              keyboardShouldPersistTaps={false}
              onContentSizeChange={(event) => {
                let h = event.nativeEvent.contentSize.height;
                this.setState({
                  inputHeight: Math.max(100, h)
                });
              }}
            />
          </View>
          {userSearch}
          {repostBody}

          {this.props.postUrl && !this.props.users.search.length ?
            <UrlPreview {...this.props} actions={this.props.actions} /> :
            null
          }

        </ScrollView>
      </KeyboardAvoidingView>
    );

    return (
      input
    );
  }
}

const localStyles = StyleSheet.create({
  createPostUser: {
    height: 55,
  },
  innerBorder: {
    height: 55,
    borderBottomWidth: 1,
    borderBottomColor: 'grey'
  },
  noBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputBox: {
    flex: 1,
    backgroundColor: '#ffffff'
  }
});

styles = { ...localStyles, ...globalStyles };

