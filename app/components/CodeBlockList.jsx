import React, {Component} from "react";
import {translate} from "react-i18next";
import {connect} from "react-redux";
import axios from "axios";
import {Collapse} from "@blueprintjs/core";
import CodeBlockCard from "components/CodeBlockCard";
import "./CodeBlockList.css";

class CodeBlockList extends Component {

  constructor(props) {
    super(props);
    this.state = {
      islands: [],
      isOpen: false,
      userProgress: null
    };
  }

  componentDidMount() {
    const {t} = this.props;
    const cbget = axios.get("/api/codeBlocks/all");
    const upget = axios.get("/api/userprogress/mine");
    const lkget = axios.get("/api/likes/mine");
    const rget = axios.get("/api/reports/codeblocks");
    const scget = axios.get("/api/siteconfigs");
    Promise.all([cbget, upget, lkget, rget, scget]).then(resp => {
      const allCodeBlocks = resp[0].data;
      const userProgress = resp[1].data.progress;
      const likes = resp[2].data;
      const reports = resp[3].data;
      const constants = resp[4].data;
      const islands = this.props.islands.slice(0);
      allCodeBlocks.sort((a, b) => b.likes - a.likes || b.id - a.id);
      for (const i of islands) {
        i.myCodeBlocks = [];
        i.likedCodeBlocks = [];
        i.unlikedCodeBlocks = [];
        for (const s of allCodeBlocks) {
          s.likes = Number(s.likes);
          if (reports.find(r => r.report_id === s.id)) s.reported = true;
          if (s.uid === this.props.auth.user.id) {
            s.displayname = t("you!");
            s.mine = true;
            if (likes.find(l => l.likeid === s.id)) s.liked = true;
            if (s.lid === i.id) i.myCodeBlocks.push(s);
          }
          else {
            if (s.lid === i.id) {
              if (s.reports >= constants.FLAG_COUNT_HIDE || s.status === "banned" || s.sharing === "false") s.hidden = true;
              // TODO: move this to db call, don't do this here
              if (!s.hidden) {
                if (likes.find(l => l.likeid === s.id)) {
                  s.liked = true;
                  i.likedCodeBlocks.push(s);
                }
                else {
                  s.liked = false;
                  i.unlikedCodeBlocks.push(s);
                }
              }
            }
          }
        }
      }
      this.setState({islands, userProgress});
    });
  }

  reportLike(codeBlock) {
    const island = this.state.islands.find(l => l.id === codeBlock.lid);
    if (island) {
      // TODO: I don't need to clone these arrays after all. come back later and modify them in place and reset state
      const likedCodeBlocks = island.likedCodeBlocks.slice(0);
      const unlikedCodeBlocks = island.unlikedCodeBlocks.slice(0);
      if (codeBlock.mine) return;
      if (codeBlock.liked) {
        likedCodeBlocks.push(codeBlock);
        unlikedCodeBlocks.splice(unlikedCodeBlocks.map(s => s.id).indexOf(codeBlock.id), 1);
      }
      else {
        unlikedCodeBlocks.push(codeBlock);
        likedCodeBlocks.splice(likedCodeBlocks.map(s => s.id).indexOf(codeBlock.id), 1);
      }
      likedCodeBlocks.sort((a, b) => b.likes - a.likes || b.id - a.id);
      unlikedCodeBlocks.sort((a, b) => b.likes - a.likes || b.id - a.id);
      island.likedCodeBlocks = likedCodeBlocks;
      island.unlikedCodeBlocks = unlikedCodeBlocks;
      // updating the parameter arrays of an island does not intrinsically update state
      // so we have to force an update to rearrange the render after a like is reported
      this.forceUpdate();
    }
  }

  handleClick(l) {
    this.setState({[l]: !this.state[l]});
  }

  render() {
    const {islands, userProgress} = this.state;

    if (!islands || !userProgress) return null;

    const codeBlockItems = [];

    for (const i of islands) {
      // added this ordering blocker for november beta. Need to increment this as levels are unlocked.
      if (i.likedCodeBlocks.length + i.unlikedCodeBlocks.length + i.myCodeBlocks.length === 0 || i.ordering > 5) continue;
      codeBlockItems.push(
        <li className={`snippet ${i.theme}`} key={i.id} onClick={this.handleClick.bind(this, i.id)}>
          <img className="icon" src={`/islands/${i.theme}-small.png`} />{ i.name }
        </li>
      );
      const thisIslandItems = [];
      for (const s of i.myCodeBlocks.concat(i.likedCodeBlocks, i.unlikedCodeBlocks)) {
        thisIslandItems.push(
          <li><CodeBlockCard theme={i.theme} icon={i.icon} codeBlock={s} userProgress={userProgress} reportLike={this.reportLike.bind(this)} projectMode={true}/></li>
        );
      }
      codeBlockItems.push(<Collapse isOpen={this.state[i.id]}>{thisIslandItems}</Collapse>);
    }

    return (
      <div id="snippets">
        <ul className="snippets-list">
          { codeBlockItems }
        </ul>
      </div>
    );
  }
}

CodeBlockList = connect(state => ({
  islands: state.islands,
  auth: state.auth
}))(CodeBlockList);
CodeBlockList = translate()(CodeBlockList);
export default CodeBlockList;
