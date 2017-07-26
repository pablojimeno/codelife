import axios from "axios";
import {connect} from "react-redux";
import {Link} from "react-router";
import React, {Component} from "react";
import {translate} from "react-i18next";
import himalaya from "himalaya";
import AceWrapper from "components/AceWrapper";
import {Intent, Position, Toaster} from "@blueprintjs/core";
import "./CodeBlock.css";

import Loading from "components/Loading";

class CodeBlock extends Component {

  constructor(props) {
    super(props);
    this.state = {
      mounted: false,
      currentText: "",
      isPassing: false
    };
  }

  componentDidMount() {
    this.setState({mounted: true, currentText: this.props.lesson.snippet.studentcontent}, this.renderText.bind(this));
  }

  getEditor() {
    return this.editor.editor.editor;
  }

  grabContents() {
    return this.state.currentText;
  }

  renderText() {
    const doc = this.refs.rc.contentWindow.document;
    doc.open();
    doc.write(this.state.currentText);
    doc.close();
  }

  containsTag(needle, haystack) {
    return this.tagCount(needle, haystack) > 0;
  }

  tagCount(needle, haystack) {
    let count = 0;
    for (const h of haystack) {
      if (h.type === "Element") {
        if (h.tagName === needle) {
          count++;
        } if (h.children !== null) {
          count += this.tagCount(needle, h.children);
        }
      }
    }
    return count;
  }

  onChangeText(theText) {
    const jsonArray = himalaya.parse(this.getEditor().getValue());
    const rulejson = JSON.parse(this.props.lesson.rulejson);
    let errors = 0;
    for (const r of rulejson) {
      if (r.type === "CONTAINS") {
        if (!this.containsTag(r.needle, jsonArray)) {
          errors++;
        }
      }
    }

    this.setState({currentText: theText, isPassing: errors === 0}, this.renderText.bind(this));
  }

  resetSnippet() {
    const {lesson} = this.props;
    if (lesson) this.setState({currentText: lesson.initialcontent}, this.renderText.bind(this));
  }

  saveCodeToDB() {
    const {id: uid} = this.props.user;
    const {currentText: studentcontent} = this.state;
    const snippet = this.props.lesson.snippet;
    const lid = this.props.lesson.id;
    const name = `My ${this.props.lesson.name} Snippet`;

    let endpoint = "/api/snippets/";
    // todo: double check that simply having a snippet is enough to justify an update over a new,
    // given the codeblock refactor
    snippet ? endpoint += "update" : endpoint += "new";
    axios.post(endpoint, {uid, lid, name, studentcontent}).then(resp => {
      if (resp.status === 200) {
        const t = Toaster.create({className: "saveToast", position: Position.TOP_CENTER});
        t.show({message: "Saved!", intent: Intent.SUCCESS});
        if (this.props.handleSave) this.props.handleSave(this.props.lesson.snippet.id, studentcontent);
      }
      else {
        alert("Error");
      }
    });
  }

  validateHTML() {

    /*
    const annotations = this.getEditor().getSession().getAnnotations();
    const validationText = {};
    validationText.info = "WARNINGS: \n\n";
    validationText.error = "ERRORS: \n\n";
    for (const a of annotations) {
      validationText[a.type] += `${a.text} \n\n`;
    }
    alert(`${validationText.info} ${validationText.error}`);
    */

  }

  render() {

    const {t, lesson} = this.props;
    const {isPassing} = this.state;

    if (!this.state.mounted) return <Loading />;

    return (
      <div>
        <div id="container">
          <div id="codeblock-prompt"> {lesson.prompt} </div>
          <div id="acecontainer">
          { this.state.mounted ? <AceWrapper ref={ comp => this.editor = comp } mode="html" onChange={this.onChangeText.bind(this)} value={this.state.currentText} setOptions={{behavioursEnabled: false}}/> : null }
          <button className="button" key="save" onClick={this.saveCodeToDB.bind(this)}>SAVE</button>
          <button className="button" key="reset" onClick={this.resetSnippet.bind(this)}>RESET</button>
          {isPassing ? <div className="status-text passing">Passing</div> : <div className="status-text failing">Failing</div>}
          <br/><br/>
          { lesson.snippet ? <Link className="share-link" to={`/share/snippet/${lesson.snippet.id}`}>Share this Snippet</Link> : null }
          </div>
          <iframe id="rendercontainer" ref="rc" />
        </div>
        <div className="clear" />
      </div>
    );
  }
}

CodeBlock = connect(state => ({
  user: state.auth.user
}))(CodeBlock);
CodeBlock = translate()(CodeBlock);
export default CodeBlock;