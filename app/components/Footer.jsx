import React, {Component} from "react";
import {translate} from "react-i18next";
import {Link} from "react-router";
import {connect} from "react-redux";
import "./Footer.css";

class Footer extends Component {

  changeLang(e) {
    e.preventDefault();
    const newOrigin = e.target.id === "en"
      ? window.location.origin.replace("pt.", "en.")
      : window.location.origin.replace("en.", "pt.");
    window.location = `${newOrigin}${window.location.pathname}`;
  }

  render() {
    const {className, t, user, i18n} = this.props;
    const {language} = i18n;

    return (
      <footer id="footer" className={ className }>
        <div className="links">
          <Link className="link" to="/glossary">{ t("Glossary") }</Link>&nbsp;
          <Link className="link" to="/about">{ t("About") }</Link>&nbsp;
          <Link className="link" to="/privacy">{ t("Privacy Policy") }</Link>&nbsp;
          { user ? <Link className="link" to="/survey">{ t("Survey") }</Link> : null }
          <a href="#" id="en" onClick={this.changeLang}>EN</a> | <a id="pt" href="#" onClick={this.changeLang}>PT</a>
        </div>
        <div className="logos">
          <a target="_blank" href="http://www.datawheel.us/"><img className="logo datawheel" src="/footer/logo-datawheel.svg" /></a>
          <a target="_blank" href="http://www.fapemig.br/"><img className="logo" src="/footer/logo-fapemig.svg" /></a>
          <a target="_blank" href="http://www.governo.mg.gov.br/"><img className="logo" src="/footer/logo-mg.svg" /></a>
        </div>
      </footer>
    );
  }
}

Footer.defaultProps = {
  className: ""
};

Footer = connect(state => ({
  user: state.auth.user
}))(Footer);
Footer = translate()(Footer);
export default Footer;
