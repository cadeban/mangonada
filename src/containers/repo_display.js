/* eslint-disable */
/**
 * This is the container that displays the repo itself. It needs access to the
 * redux state to receive the commit data returned from the api call. Does not
 * need to dispatch to the redux state.
 *
 * While this is a component, React is not actually being used to manipulate the
 * DOM here. We simply call a function that will directly go to our canvas and
 * draw on it, bypassing React.
 */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import GithubApiInterface from '../reducers/gitD3/githubBranchFunction';
import d3 from '../reducers/gitD3/d3.js';
import tooltip from '../reducers/gitD3/d3tip.js';
import _  from 'lodash';

d3.tip = tooltip;

class RepoDisplay extends Component {
  makeD3Display () {
    // remove all svg elements
    d3.select("svg").remove();
    $('#container').remove();
    $('body').append('<div id="container"></div>')


    const githubTranslator = new GithubApiInterface(
      this.props.currentRepo.JSONCommits,
      this.props.currentRepo.JSONBranches
    );
    const { JSONCommits, SHALookup, branchLookup, JSONBranches } = githubTranslator;

    const checkoutSite = 'https://www.atlassian.com/git/tutorials/viewing-old-commits';
    const branchSite = 'https://www.atlassian.com/git/tutorials/using-branches/';
    const rebaseSite = 'https://www.atlassian.com/git/tutorials/rewriting-history/git-rebase';
    const tagSite = 'https://git-scm.com/book/en/v2/Git-Basics-Tagging';

    /**
     * Creat an HTML anchor tag
     * @param  {String} linkedText - the text you wish to appear
     * @param  {String} site - the site to link to
     * @return {String} - the anchor HTML element
     */
    function makeAnchor(linkedText, site) {
      return `<a href="${site}" target="_blank">${linkedText}</a>`;
    }

    let numCommits = 0;
    /**
     * Generate an x-value for each commit. Each commit sent in will
     * have a higher x-value than the one before it. Useful for placing
     * elements in order.
     */
    function generateX(node) {
     return 40 + numCommits++ * 30;
    }

    /**
     * branchXCoordinates will contain the start and end x-values for
     * each commit.
     * @type {Object}
     */
    const branchXCoordinates = {};

    /**
     * branchYCoordinates will the y-coordinate of each branch.
     * @type {Object}
     */
    const branchYCoordinates = { master: 360 };

    /**
     * Generate the x and y-coordinates for each commit. Place them as properties
     * on the commit.
     */
    function generateCoordinates() {
      JSONCommits.forEach(commit => { 
        commit.x = generateX(commit);

        //if it's the first time we're processing a commit from this branch, create an object
        if(!branchXCoordinates[commit.branch]) {
          branchXCoordinates[commit.branch] = { start: commit.x };
        }

        branchXCoordinates[commit.branch].end = commit.x;
      });

      /**
       * List the positions that are taken. Properties of each object are
       * a y-value and the range (start and end) of the x-values taken for that
       * y-value.
       * @type {Array}
       */
      const taken = [{ 
        y: 360,
        start: branchXCoordinates['master'].start,
        end: branchXCoordinates['master'].end,
      }];

      /**
       * Determine if the y-position we're checking will have overlaps. If so,
       * put in a different place. Recursively checks the next y-value if the current
       * one is already taken.
       * @param  {String} branch - the branch name
       * @param  {Number} y - the y-value we're checking. Is set automatically,
       *                    or recursively.
       * @return {Numver} - the y position.
       */
      function getY(branch, y = 360) {
        let overlap = false;
        const { start: thisBranchStartPoint, end: thisBranchEndPoint } = branchXCoordinates[branch];

        taken.forEach(set => {
          if(set.y === y) {
            if((set.start <= thisBranchStartPoint && thisBranchStartPoint <= set.end) || 
              (set.start <= thisBranchEndPoint && thisBranchEndPoint <= set.end)) {
              overlap = true;
            }
          }
        });

        return overlap ? getY(branch, y + 40) : y;
      }

      //get the y-coordinates for each branch
      Object.keys(branchLookup).forEach(branch => {
        if(!branchXCoordinates[branch] || branch === 'master') return;

        const { start, end } = branchXCoordinates[branch];
        const yCoordinate = getY(branch);
        branchYCoordinates[branch] = yCoordinate;
        taken.push({ start, end, y: yCoordinate});
      });

      //map the branchYCoordinates values over to their commits
      d3commits.forEach(commit => commit.y = branchYCoordinates[commit.branch]);
    }

    //https://bl.ocks.org/mbostock/6123708
    function zoomed() {
      const translate = d3.event.translate;
      const scale = d3.event.scale;

      svg.selectAll('g').attr("transform", "translate(" + translate + ")scale(" + scale + ")");
      svg.selectAll('line').attr("transform", "translate(" + translate + ")scale(" + d3.event.scale + ")");
      svg.selectAll('.tooltip').attr('transform', `translate(${translate})`);
      infoTip.show();
      headTip.hide();

      d3.selectAll('dt-tip')
        .attr('opacity', 0);
    }

    function dragstarted(d) {
      d3.event.sourceEvent.stopPropagation();
      d3.select(this).classed("dragging", true);
    }

    function dragged(d) {
      d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
    }

    function dragended(d) {
      d3.select(this).classed("dragging", false);
    }

    //add x and y values to each commit
    function addCoordinates(nodes) {
      nodes.forEach(node => {
        node.x = generateX(node);
        node.y = generateY(node);
      });
    }

    //give each branch a different color property
    function addColors(branches) {
      const colors = [
        '#FA8072',  //salmon
        "#7D3C98",  //purple
        "#2471A3",  //blue
        "#F1C40F",  //yellow
        '#E67E22',  //orange
        "#A93226",  //red
        "#17A589",  //aqua
        '#839192',  //grey
        '#000000',  //black
      ];

      let i = 0;
      for(let branch in branchLookup) {
        branchLookup[branch].color = colors[i++ % colors.length];
      }
    }

    //Create an object with some statistics for the commits passed in
    function analyzeRepo(commits) {
      function countCommitsPerAuthor(author) {
        return commits.reduce((authorCount, commit) => {
          if(commit.author.login === author) authorCount++;
          return authorCount;
        }, 0);
      }

      function countCommitsPerBranch(branch) {
        return commits.reduce((branchCount, commit) => {
          if(commit.branch === branch) branchCount++;
          return branchCount;
        }, 0);
      }

      const stats = {
        branches: {},
        contributors: {},
      };

      const { branches, contributors } = stats;

      for(let branch in branchLookup) {
        branches[branch] = branches[branch] || countCommitsPerBranch(branch);
      }

      commits.forEach((commit) => {
        const author = commit.author.login;
        contributors[author] = contributors[author] || countCommitsPerAuthor(author);
      });

      return stats;
    }

    const d3commits = JSONCommits;
    // addCoordinates(d3commits);
    generateCoordinates();
















    addColors(d3commits);
    const pageWidth = window.innerWidth;
    const pageHeight = window.innerHeight;

    //tooltip: http://bl.ocks.org/Caged/6476579
    const headTip = d3.tip()
      .attr('class', 'd3-tip')
      .direction('n')
      .offset([-10, 0])
      .html('HEAD');

    const infoTip = d3.tip()
      .attr('class', 'd3-tip')
      .direction('s')
      .offset([10, 0])
      // .html('placeholder');

    //https://bl.ocks.org/mbostock/6123708
    const zoom = d3.behavior.zoom()
      .scaleExtent([1, 10])
      .on("zoom", zoomed);

    const drag = d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", dragstarted)
        .on("drag", dragged)
        .on("dragend", dragended);

    let svg = d3.select('#container').append('svg')
      .attr('width', pageWidth)
      .attr('height', pageHeight)
      .on('click', infoTip.hide)
      .call(zoom);

    svg.call(headTip);
    svg.call(infoTip);

    let container = svg.append('g');

    console.log('line 215');

    // Make the lines
    d3commits.forEach(commit => {
      commit.children.forEach(child => {
        let childObj = githubTranslator.getCommit(child);
        //straight lines
        if(commit.y === childObj.y) {
          svg.append("line")
            .attr('class', 'line')
            .attr("x1", commit.x)
            .attr("y1", commit.y)
            .attr("x2", childObj.x)
            .attr("y2", childObj.y)
            .attr("stroke-width", 1)
            .attr('stroke', branchLookup[commit.branch].color) //
            .attr('fill', branchLookup[commit.branch].color)
        } else {
        //curved lines: http://stackoverflow.com/questions/34558943/draw-curve-between-two-points-using-diagonal-function-in-d3-js
          var curveData = [ {x:commit.x, y:commit.y },{x:childObj.x,  y:childObj.y}];
          var edge = d3.select("svg").append('g');
          var diagonal = d3.svg.diagonal()
            .source(function(d) {return {"x":d[0].y, "y":d[0].x}; })            
            .target(function(d) {return {"x":d[1].y, "y":d[1].x}; })
            .projection(function(d) { return [d.y, d.x]; });
             
          d3.select("g")
              .datum(curveData)
            .append("path")
              .attr("class", "line")
              .attr("d", diagonal)
              .attr("stroke-width", 1)
            .attr('stroke', branchLookup[commit.branch].color)
            .attr('fill', 'none')
        }
      });
    });

    //Make the nodes
    const nodes = svg.append('g')
      .attr('class', 'commit')
      .selectAll('circle')
      .data(d3commits)
      .enter().append('circle')
      .attr('r', 5)
      .attr('cx', commit => commit.x)
      .attr('cy', commit => commit.y)
      .attr('stroke', commit => branchLookup[commit.branch].color)
      .attr('fill', commit => branchLookup[commit.branch].color)
      .call(drag);

      //show the tooltip on hover
      nodes.on("mouseover", function(commit) {
        const { branch, sha, author: { login: authorName } } = commit;
        const branchLinkPrefix = `https://github.com/mangonada/mangonada/commits/`;
        const commitLinkPrefix = `https://github.com/mangonada/mangonada/commit/`;
        const checkoutButton = `<button class="btn" onClick="headTip.show()">Checkout</button>`;

        const universalCommands = `

Possible git commands:
  ${makeAnchor('git checkout', checkoutSite)} ${sha}
    options:
      -b: create and check out new branch
  ${makeAnchor('git branch', branchSite)} [branch name]
    options:
      -d: delete branch
      -D: delete branch, suppress warnings
  ${makeAnchor('git tag', tagSite)} [tag name]`;

      const tooltipContent =
  `Branch:  ${makeAnchor(branch, branchLinkPrefix + branch)}
Sha:     ${makeAnchor(sha.slice(0, 9) + '...', commitLinkPrefix + sha)}   ${checkoutButton}
Message: ${commit.commit.message}
Author:  ${authorName}${universalCommands}`;

        infoTip.html(`<pre>${tooltipContent}</pre>`);
        infoTip.show();
      })
      .on('click', headTip.show);



    ////////////////////////////////////////////////////////////////////
    //Charts: https://bost.ocks.org/mike/bar/

    // const repoStats = analyzeRepo(d3commits);
    // console.log(repoStats);
    //
    // let chart = d3.select('#chart');
    //
    // function entries(obj){
    //   const arr = [];
    //   Object.keys(obj).forEach(key =>
    //     arr.push( [key, obj[key]] )
    //   );
    //   return arr;
    // }
    //
    // function values(obj){
    //   const arr = [];
    //   Object.keys(obj).forEach((key) =>
    //     arr.push(obj[key])
    //   );
    //   return arr;
    // }
    //
    // const branchEntries = entries(repoStats.branches);
    // const branchNames = Object.keys(repoStats.branches);
    // const branchValues = entries(repoStats.branches);
    //
    // d3.select('#chart')
    //   .selectAll('div')
    //   .data(branchEntries)
    //   .enter().append('div')
    //   .style("width", d => d[1] * 10 + "px")
    //   .text(d => d[0]);
    //
    // let scale = d3.scale.linear()
    //     .domain([0, d3.max(branchValues)])
    //     .range([0, 420]);
    //
    // d3.select("#chart")
    //   .selectAll("div")
    //     .data(branchEntries)
    //   .enter().append("div")
    //     .style("width", function(d) { return scale(d[1]) + "px"; })
    //     .text(function(d) { return d[1]; });
    //
    // function filterRepo(event) {
    //   event.preventDefault();
    //   console.log(event)
    //
    //   //make all of them the correct color (not red)
    //   d3.selectAll('circle')
    //     .each(function(node){
    //       d3.select(this)
    //         .classed('selected', false);
    //     });
    //
    //   //consistently use toLowerCase() to remove case-sensitivity
    //   const term = event.target.value.toLowerCase();
    //
    //   //if empty string, return
    //   if(!term) return;
    //
    //   d3.selectAll('circle')
    //     .each(function(node){
    //       if(JSON.stringify(node).toLowerCase().includes(term)) {
    //         d3.select(this)
    //           .classed('selected', true);
    //       }
    //     });
    // }
  }

  componentWillUnmount() {
    console.log('unmounting')
  }

  render() {
    return (
      <div>
        {this.makeD3Display()}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return { currentRepo: state.currentRepo };
}

export default connect(mapStateToProps)(RepoDisplay);
