import React, { Component } from 'react';
import PropTypes from 'prop-types';

if (process.env.BROWSER === true) {
  require('./selectTags.css');
}

if (process.env.BROWSER === true) {
  // require('./divider.css');
}

export default class TagInput extends Component {
  static propTypes = {
    placeholderText: PropTypes.string,
    selectedTags: PropTypes.array,
    deselectTag: PropTypes.func,
    selectTag: PropTypes.func
  };

  state = {
    input: ''
  };

  render() {
    const { selectedTags, deselectTag, selectTag } = this.props;
    const tagEls = selectedTags.map((tag, i) => (
      <span
        key={i}
        className={'selected'}
        role={'checkbox'}
        aria-checked
        onClick={() => deselectTag(tag)}
      >
        #{tag}
      </span>
    ));
    const input = this.state.input || '';

    return (
      <div>
        Tags: <span className="selectTags">{tagEls}</span>
        <div className="tagInput">
          <input
            placeholder={this.props.placeholderText}
            value={this.state.input}
            onKeyDown={e => {
              if (e.keyCode === 13) {
                const tag = e.target.value.trim()
                .replace('#', '');
                selectTag(tag);
                return this.setState({ input: '' });
              }
              return null;
            }}
            onBlur={e => {
              let tags = e.target.value.split(/,|#/);
              tags = tags.map(t => t.trim()
              .replace('#', ''))
              .filter(t => t.length);
              if (tags.length) {
                selectTag(tags);
              }
              return this.setState({ input: '' });
            }}
            onChange={e => {
              const tags = e.target.value;
              let tagsArr = tags.split(/,|#/);
              tagsArr = tagsArr.map(t => t.trim())
              .filter(t => t.length);
              if (tagsArr.length > 1) {
                selectTag(tagsArr[0]);
                return this.setState({ input: tagsArr[1] });
              }
              return this.setState({ input: tags });
            }}
          />
        </div>
      </div>
    );
  }
}