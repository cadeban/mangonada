/* eslint-disable */
/**
 * The top-most component. Does not do anything except render
 * SearchBar and RepoDisplay.
 */

import React, { Component } from 'react';
import RepoDisplay from '../containers/repo_display';
import SearchBar from '../containers/searchbar';
import Chart from '../containers/chart';
import WordCloud from '../containers/word_cloud';
import BubbleChart from '../containers/bubble_chart';

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = { user_repo : "" };
    this.updateUrl = this.updateUrl.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    if ((prevProps.params.user != this.props.params.user) ||
        (prevProps.params.repo != this.props.params.repo)) {

      const newUrlEntered = `${this.props.params.user}/${this.props.params.repo}`;
      this.updateUrl(newUrlEntered);
    }
  }

  updateUrl(newUserRepo) {
    this.setState({ user_repo : newUserRepo });
  }

  render() {
    let user_repo ='https://github.com/';
    if (this.props.params.user && this.props.params.repo) {
      user_repo += this.props.params.user + '/' + this.props.params.repo;
    }
    return (
      <div>
        <SearchBar urlEntered={user_repo} onSubmit={this.updateUrl.bind(this)}/>
        <RepoDisplay />
        <Chart />
        <WordCloud />
        <BubbleChart />
      </div>
    );
  }
}
