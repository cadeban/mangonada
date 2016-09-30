/**
 * The top-most component. Does not do anything except render
 * SearchBar and RepoDisplay.
 */

import React, { Component } from 'react';
import RepoDisplay from '../containers/repo_display';
import SearchBar from '../containers/searchbar';

export default class App extends Component {
  render() {
    return (
      <div>
        <SearchBar />
        <RepoDisplay />
      </div>
    );
  }
}
