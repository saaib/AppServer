import React from "react";
import { withRouter } from "react-router";
import { withTranslation } from "react-i18next";
import styled from "styled-components";
import PropTypes from "prop-types";
import axios from "axios";
import { createUser } from "@appserver/common/api/people";
import { inject, observer } from "mobx-react";
import Button from "@appserver/components/button";
import TextInput from "@appserver/components/text-input";
import Text from "@appserver/components/text";
import PasswordInput from "@appserver/components/password-input";
import toastr from "@appserver/components/toast/toastr";
import Loader from "@appserver/components/loader";
import EmailInput from "@appserver/components/email-input";
import PageLayout from "@appserver/common/components/PageLayout";
import { combineUrl, createPasswordHash } from "@appserver/common/utils";
import { AppServerConfig } from "@appserver/common/constants";

const inputWidth = "400px";

const ConfirmContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-left: 200px;

  @media (max-width: 830px) {
    margin-left: 40px;
  }

  .start-basis {
    align-items: flex-start;
  }

  .margin-left {
    margin-left: 20px;
  }

  .full-width {
    width: ${inputWidth};
  }

  .confirm-row {
    margin: 23px 0 0;
  }

  .break-word {
    word-break: break-word;
  }
`;

const emailInputName = "email";
const passwordInputName = "password";

const emailRegex = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$";
const validationEmail = new RegExp(emailRegex);

class Confirm extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      email: "",
      emailValid: true,
      firstName: "",
      firstNameValid: true,
      lastName: "",
      lastNameValid: true,
      password: "",
      passwordValid: true,
      errorText: "",
      isLoading: false,
      passwordEmpty: false,
      key: props.linkData.confirmHeader,
      linkType: props.linkData.type,
    };
  }

  /*componentWillMount() {
      const { isAuthenticated, logout } = this.props;

      if(isAuthenticated)
          logout();
  }*/

  onSubmit = () => {
    this.setState({ isLoading: true }, () => {
      const { defaultPage, linkData, hashSettings } = this.props;
      const isVisitor = parseInt(linkData.emplType) === 2;

      this.setState({ errorText: "" });

      let hasError = false;

      if (!this.state.firstName.trim()) {
        hasError = true;
        this.setState({ firstNameValid: !hasError });
      }

      if (!this.state.lastName.trim()) {
        hasError = true;
        this.setState({ lastNameValid: !hasError });
      }

      if (!validationEmail.test(this.state.email.trim())) {
        hasError = true;
        this.setState({ emailValid: !hasError });
      }

      if (!this.state.passwordValid) {
        hasError = true;
        this.setState({ passwordValid: !hasError });
      }

      !this.state.password.trim() && this.setState({ passwordEmpty: true });

      if (hasError) {
        this.setState({ isLoading: false });
        return false;
      }

      const hash = createPasswordHash(this.state.password, hashSettings);

      const loginData = {
        userName: this.state.email,
        passwordHash: hash,
      };

      const personalData = {
        firstname: this.state.firstName,
        lastname: this.state.lastName,
        email: this.state.email,
      };
      const registerData = Object.assign(personalData, {
        isVisitor: isVisitor,
      });

      this.createConfirmUser(registerData, loginData, this.state.key)
        .then(() => window.location.replace(defaultPage))
        .catch((error) => {
          console.error("confirm error", error);
          this.setState({
            errorText: error,
            isLoading: false,
          });
        });
    });
  };

  createConfirmUser = async (registerData, loginData, key) => {
    const data = Object.assign(
      { fromInviteLink: true },
      registerData,
      loginData
    );

    const user = await createUser(data, key);

    console.log("Created user", user);

    const { login } = this.props;
    const { userName, passwordHash } = loginData;

    const response = await login(userName, passwordHash);

    console.log("Login", response);

    return user;
  };

  onKeyPress = (event) => {
    if (event.key === "Enter") {
      this.onSubmit();
    }
  };

  onCopyToClipboard = () =>
    toastr.success(this.props.t("EmailAndPasswordCopiedToClipboard"));
  validatePassword = (value) => this.setState({ passwordValid: value });

  componentDidMount() {
    const { history, getSettings, getPortalPasswordSettings } = this.props;

    const requests = [getSettings(), getPortalPasswordSettings(this.state.key)];

    axios.all(requests).catch((e) => {
      console.error("get settings error", e);
      history.push(combineUrl(AppServerConfig.proxyURL, `/login/error=${e}`));
    });

    window.addEventListener("keydown", this.onKeyPress);
    window.addEventListener("keyup", this.onKeyPress);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.onKeyPress);
    window.removeEventListener("keyup", this.onKeyPress);
  }

  onChangeName = (event) => {
    this.setState({ firstName: event.target.value });
    !this.state.firstNameValid &&
      this.setState({ firstNameValid: event.target.value });
    this.state.errorText && this.setState({ errorText: "" });
  };

  onChangeSurname = (event) => {
    this.setState({ lastName: event.target.value });
    !this.state.lastNameValid && this.setState({ lastNameValid: true });
    this.state.errorText && this.setState({ errorText: "" });
  };

  onChangeEmail = (event) => {
    this.setState({ email: event.target.value });
    // !this.state.emailValid && this.setState({ emailValid: true });
    this.state.errorText && this.setState({ errorText: "" });
  };

  onValidateEmail = (value) => this.setState({ emailValid: value.isValid });

  onChangePassword = (event) => {
    this.setState({ password: event.target.value });
    !this.state.passwordValid && this.setState({ passwordValid: true });
    event.target.value.trim() && this.setState({ passwordEmpty: false });
    this.state.errorText && this.setState({ errorText: "" });
    this.onKeyPress(event);
  };

  render() {
    const { settings, t, greetingTitle } = this.props;

    //console.log("createUser render");

    return !settings ? (
      <Loader className="pageLoader" type="rombs" size="40px" />
    ) : (
      <ConfirmContainer>
        <div className="start-basis">
          <div className="margin-left">
            <Text className="confirm-row" as="p" fontSize="18px">
              {t("InviteTitle")}
            </Text>

            <div className="confirm-row full-width break-word">
              <a href="/login">
                <img src="images/dark_general.png" alt="Logo" />
              </a>
              <Text as="p" fontSize="24px" color="#116d9d">
                {greetingTitle}
              </Text>
            </div>
          </div>

          <div>
            <div className="full-width">
              <TextInput
                className="confirm-row"
                id="name"
                name="name"
                value={this.state.firstName}
                placeholder={t("FirstName")}
                size="huge"
                scale={true}
                tabIndex={1}
                isAutoFocussed={true}
                autoComplete="given-name"
                isDisabled={this.state.isLoading}
                hasError={!this.state.firstNameValid}
                onChange={this.onChangeName}
                onKeyDown={this.onKeyPress}
              />

              <TextInput
                className="confirm-row"
                id="surname"
                name="surname"
                value={this.state.lastName}
                placeholder={t("LastName")}
                size="huge"
                scale={true}
                tabIndex={2}
                autoComplete="family-name"
                isDisabled={this.state.isLoading}
                hasError={!this.state.lastNameValid}
                onChange={this.onChangeSurname}
                onKeyDown={this.onKeyPress}
              />

              <EmailInput
                className="confirm-row"
                id="email"
                name={emailInputName}
                value={this.state.email}
                placeholder={t("Email")}
                size="huge"
                scale={true}
                tabIndex={3}
                autoComplete="email"
                isDisabled={this.state.isLoading}
                // hasError={!this.state.emailValid}
                onChange={this.onChangeEmail}
                onKeyDown={this.onKeyPress}
                onValidateInput={this.onValidateEmail}
              />
            </div>

            <PasswordInput
              className="confirm-row"
              id="password"
              inputName={passwordInputName}
              emailInputName={emailInputName}
              inputValue={this.state.password}
              placeholder={t("InvitePassword")}
              size="huge"
              scale={true}
              tabIndex={4}
              maxLength={30}
              inputWidth={inputWidth}
              hasError={this.state.passwordEmpty}
              onChange={this.onChangePassword}
              onCopyToClipboard={this.onCopyToClipboard}
              onValidateInput={this.validatePassword}
              clipActionResource={t("CopyEmailAndPassword")}
              clipEmailResource={`${t("Email")}: `}
              clipPasswordResource={`${t("InvitePassword")}: `}
              tooltipPasswordTitle={`${t("ErrorPasswordMessage")}:`}
              tooltipPasswordLength={`${t("ErrorPasswordLength", {
                fromNumber: settings.minLength,
                toNumber: 30,
              })}:`}
              tooltipPasswordDigits={t("ErrorPasswordNoDigits")}
              tooltipPasswordCapital={t("ErrorPasswordNoUpperCase")}
              tooltipPasswordSpecial={`${t(
                "ErrorPasswordNoSpecialSymbols"
              )} (!@#$%^&*)`}
              generatorSpecial="!@#$%^&*"
              passwordSettings={settings}
              isDisabled={this.state.isLoading}
              onKeyDown={this.onKeyPress}
            />

            <Button
              className="confirm-row"
              primary
              size="big"
              label={t("LoginRegistryButton")}
              tabIndex={5}
              isLoading={this.state.isLoading}
              onClick={this.onSubmit}
            />
          </div>

          {/*             <Row className='confirm-row'>

                    <Text as='p' fontSize='14px'>{t('LoginWithAccount')}</Text>

            </Row>
 */}
          <Text className="confirm-row" fontSize="14px" color="#c30">
            {this.state.errorText}
          </Text>
        </div>
      </ConfirmContainer>
    );
  }
}

Confirm.propTypes = {
  location: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
};
const CreateUserForm = (props) => (
  <PageLayout>
    <PageLayout.SectionBody>
      <Confirm {...props} />
    </PageLayout.SectionBody>
  </PageLayout>
);

export default inject(({ auth }) => {
  const { login, logout, isAuthenticated, settingsStore } = auth;
  const {
    passwordSettings,
    greetingSettings,
    hashSettings,
    defaultPage,
    getSettings,
    getPortalPasswordSettings,
  } = settingsStore;

  return {
    settings: passwordSettings,
    greetingTitle: greetingSettings,
    hashSettings,
    defaultPage,
    isAuthenticated,
    login,
    logout,
    getSettings,
    getPortalPasswordSettings,
  };
})(withRouter(withTranslation("Confirm")(observer(CreateUserForm))));
