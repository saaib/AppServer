import React from "react";
//import PropTypes from "prop-types";
import { withRouter } from "react-router";
import MainButton from "@appserver/components/main-button";
import DropDownItem from "@appserver/components/drop-down-item";
import InviteDialog from "./../../dialogs/InviteDialog/index";
import { withTranslation } from "react-i18next";
import toastr from "studio/toastr";
import Loaders from "@appserver/common/components/Loaders";
import { inject, observer } from "mobx-react";
import config from "../../../../package.json";
import { combineUrl } from "@appserver/common/utils";
import { AppServerConfig } from "@appserver/common/constants";

class PureArticleMainButtonContent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dialogVisible: false,
    };
  }

  onImportClick = () => {
    const { history, homepage } = this.props;
    history.push(
      combineUrl(AppServerConfig.proxyURL, homepage, "${homepage}/import")
    );
  };

  goToEmployeeCreate = () => {
    const { history, homepage } = this.props;
    history.push(
      combineUrl(AppServerConfig.proxyURL, homepage, "/create/user")
    );
  };

  goToGuestCreate = () => {
    const { history, homepage } = this.props;
    history.push(
      combineUrl(AppServerConfig.proxyURL, homepage, "/create/guest")
    );
  };

  goToGroupCreate = () => {
    const { history, homepage } = this.props;
    history.push(
      combineUrl(AppServerConfig.proxyURL, homepage, "/group/create")
    );
  };

  onNotImplementedClick = (text) => {
    toastr.success(text);
  };

  onInvitationDialogClick = () =>
    this.setState({ dialogVisible: !this.state.dialogVisible });

  render() {
    //console.log("People ArticleMainButtonContent render");
    const {
      t,
      isLoaded,
      isAdmin,
      homepage,
      userCaption,
      guestCaption,
      groupCaption,
    } = this.props;

    const { dialogVisible } = this.state;

    return (
      isAdmin &&
      (!isLoaded ? (
        <Loaders.Rectangle />
      ) : (
        <>
          <MainButton isDisabled={false} isDropdown={true} text={t("Actions")}>
            <DropDownItem
              icon={combineUrl(
                AppServerConfig.proxyURL,
                homepage,
                "/images/add.employee.react.svg"
              )}
              label={userCaption}
              onClick={this.goToEmployeeCreate}
            />

            <DropDownItem
              icon={combineUrl(
                AppServerConfig.proxyURL,
                homepage,
                "/images/add.guest.react.svg"
              )}
              label={guestCaption}
              onClick={this.goToGuestCreate}
            />
            <DropDownItem
              icon={combineUrl(
                AppServerConfig.proxyURL,
                homepage,
                "/images/add.department.react.svg"
              )}
              label={groupCaption}
              onClick={this.goToGroupCreate}
            />
            <DropDownItem isSeparator />
            <DropDownItem
              icon={combineUrl(
                AppServerConfig.proxyURL,
                "/static/images/invitation.link.react.svg"
              )}
              label={t("InviteLinkTitle")}
              onClick={this.onInvitationDialogClick}
            />
            {/* <DropDownItem
              icon="images/plane.react.svg"
              label={t('LblInviteAgain')}
              onClick={this.onNotImplementedClick.bind(this, "Invite again action")}
            /> */}
            {false && (
              <DropDownItem
                icon={combineUrl(
                  AppServerConfig.proxyURL,
                  homepage,
                  "/images/import.react.svg"
                )}
                label={t("ImportPeople")}
                onClick={this.onImportClick}
              />
            )}
          </MainButton>
          {dialogVisible && (
            <InviteDialog
              visible={dialogVisible}
              onClose={this.onInvitationDialogClick}
              onCloseButton={this.onInvitationDialogClick}
            />
          )}
        </>
      ))
    );
  }
}

const ArticleMainButtonContent = withTranslation("Article")(
  PureArticleMainButtonContent
);

export default withRouter(
  inject(({ auth }) => ({
    isAdmin: auth.isAdmin,
    homepage: config.homepage,
    userCaption: auth.settingsStore.customNames.userCaption,
    guestCaption: auth.settingsStore.customNames.guestCaption,
    groupCaption: auth.settingsStore.customNames.groupCaption,
    isLoaded: auth.isLoaded,
  }))(observer(ArticleMainButtonContent))
);
