import React from "react";
import IconButton from "@appserver/components/icon-button";
import ContextMenuButton from "@appserver/components/context-menu-button";
import AvatarEditor from "@appserver/components/avatar-editor";
import Headline from "@appserver/common/components/Headline";
import toastr from "studio/toastr";
import { withRouter } from "react-router";
import { withTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import {
  resendUserInvites,
  createThumbnailsAvatar,
  loadAvatar,
  deleteAvatar,
} from "@appserver/common/api/people";
import { AppServerConfig, EmployeeStatus } from "@appserver/common/constants";
import {
  DeleteSelfProfileDialog,
  ChangePasswordDialog,
  ChangeEmailDialog,
  DeleteProfileEverDialog,
} from "../../../../components/dialogs";
import { inject, observer } from "mobx-react";
import {
  getUserStatus,
  toEmployeeWrapper,
} from "../../../../helpers/people-helpers";
import config from "../../../../../package.json";
import { combineUrl } from "@appserver/common/utils";

const StyledContainer = styled.div`
  position: relative;

  display: grid;
  grid-template-columns: ${(props) =>
    props.showContextButton ? "auto auto auto 1fr" : "auto 1fr"};
  align-items: center;

  @media (max-width: 1024px) {
    grid-template-columns: ${(props) =>
      props.showContextButton ? "auto 1fr auto" : "auto 1fr"};
  }

  .action-button {
    margin-left: 16px;

    @media (max-width: 1024px) {
      margin-left: auto;

      & > div:first-child {
        padding: 8px 16px 8px 0px;
        margin-right: -16px;
      }
    }
  }
  .arrow-button {
    @media (max-width: 1024px) {
      padding: 8px 16px 8px 16px;
      margin-left: -16px;
      margin-right: -16px;
    }
  }

  .header-headline {
    margin-left: 16px;
  }
`;

class SectionHeaderContent extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = this.mapPropsToState(props);
  }

  componentDidUpdate(prevProps) {
    if (this.props.profile.userName !== prevProps.profile.userName) {
      console.log(this.props.profile.userName);
      this.setState(this.mapPropsToState(this.props));
    }
  }

  mapPropsToState = (props) => {
    let profile = toEmployeeWrapper(props.profile);

    const newState = {
      profile: profile,
      visibleAvatarEditor: false,
      avatar: {
        tmpFile: "",
        image: null,
        defaultWidth: 0,
        defaultHeight: 0,
      },
      dialogsVisible: {
        deleteSelfProfile: false,
        changePassword: false,
        changeEmail: false,
        deleteProfileEver: false,
      },
    };

    return newState;
  };

  openAvatarEditor = () => {
    this.props.getUserPhoto(this.state.profile.id).then((userPhotoData) => {
      if (userPhotoData.original) {
        let avatarDefaultSizes = /_(\d*)-(\d*)./g.exec(userPhotoData.original);
        if (avatarDefaultSizes !== null && avatarDefaultSizes.length > 2) {
          this.setState({
            avatar: {
              tmpFile: this.state.avatar.tmpFile,
              defaultWidth: avatarDefaultSizes[1],
              defaultHeight: avatarDefaultSizes[2],
              image: userPhotoData.original
                ? userPhotoData.original.indexOf("default_user_photo") !== -1
                  ? null
                  : userPhotoData.original
                : null,
            },
            visibleAvatarEditor: true,
          });
        } else {
          this.setState({
            avatar: {
              tmpFile: this.state.avatar.tmpFile,
              defaultWidth: 0,
              defaultHeight: 0,
              image: null,
            },
            visibleAvatarEditor: true,
          });
        }
      }
    });
  };

  onLoadFileAvatar = (file, callback) => {
    let data = new FormData();
    let _this = this;
    data.append("file", file);
    data.append("Autosave", false);
    loadAvatar(this.state.profile.id, data)
      .then((response) => {
        var img = new Image();
        img.onload = function () {
          var stateCopy = Object.assign({}, _this.state);
          stateCopy.avatar = {
            tmpFile: response.data,
            image: response.data,
            defaultWidth: img.width,
            defaultHeight: img.height,
          };
          _this.setState(stateCopy);
          if (typeof callback === "function") callback();
        };
        img.src = response.data;
      })
      .catch((error) => toastr.error(error));
  };

  onSaveAvatar = (isUpdate, result) => {
    if (isUpdate) {
      createThumbnailsAvatar(this.state.profile.id, {
        x: Math.round(
          result.x * this.state.avatar.defaultWidth - result.width / 2
        ),
        y: Math.round(
          result.y * this.state.avatar.defaultHeight - result.height / 2
        ),
        width: result.width,
        height: result.height,
        tmpFile: this.state.avatar.tmpFile,
      })
        .then((response) => {
          let stateCopy = Object.assign({}, this.state);
          stateCopy.visibleAvatarEditor = false;
          stateCopy.avatar.tmpFile = "";
          stateCopy.profile.avatarMax =
            response.max +
            "?_=" +
            Math.floor(Math.random() * Math.floor(10000));
          toastr.success(this.props.t("ChangesApplied"));
          this.setState(stateCopy);
        })
        .catch((error) => toastr.error(error))
        .then(() => this.props.updateProfile(this.props.profile))
        .then(() => this.props.fetchProfile(this.state.profile.id));
    } else {
      deleteAvatar(this.state.profile.id)
        .then((response) => {
          let stateCopy = Object.assign({}, this.state);
          stateCopy.visibleAvatarEditor = false;
          stateCopy.profile.avatarMax = response.big;
          toastr.success(this.props.t("ChangesApplied"));
          this.setState(stateCopy);
        })
        .catch((error) => toastr.error(error));
    }
  };

  onCloseAvatarEditor = () => {
    this.setState({
      visibleAvatarEditor: false,
    });
  };

  toggleChangePasswordDialog = () =>
    this.setState({
      dialogsVisible: {
        ...this.state.dialogsVisible,
        changePassword: !this.state.dialogsVisible.changePassword,
      },
    });

  toggleChangeEmailDialog = () =>
    this.setState({
      dialogsVisible: {
        ...this.state.dialogsVisible,
        changeEmail: !this.state.dialogsVisible.changeEmail,
      },
    });

  onEditClick = () => {
    const { history } = this.props;
    history.push(
      combineUrl(
        AppServerConfig.proxyURL,
        config.homepage,
        `/edit/${this.state.profile.userName}`
      )
    );
  };

  onUpdateUserStatus = (status, userId) => {
    const { fetchProfile, updateUserStatus, t } = this.props;

    updateUserStatus(status, new Array(userId))
      .then(() => this.props.updateProfile(this.props.profile))
      .then(() => fetchProfile(userId))
      .then(() => toastr.success(t("SuccessChangeUserStatus")))
      .catch((error) => toastr.error(error));
  };

  onDisableClick = () =>
    this.onUpdateUserStatus(EmployeeStatus.Disabled, this.state.profile.id);

  onEnableClick = () =>
    this.onUpdateUserStatus(EmployeeStatus.Active, this.state.profile.id);

  onReassignDataClick = (user) => {
    const { history } = this.props;
    history.push(
      combineUrl(
        AppServerConfig.proxyURL,
        config.homepage,
        `/reassign/${user.userName}`
      )
    );
  };

  onDeletePersonalDataClick = () => {
    toastr.success("Context action: Delete personal data");
  };

  toggleDeleteProfileEverDialog = () =>
    this.setState({
      dialogsVisible: {
        ...this.state.dialogsVisible,
        deleteProfileEver: !this.state.dialogsVisible.deleteProfileEver,
      },
    });

  toggleDeleteSelfProfileDialog = () => {
    this.setState({
      dialogsVisible: {
        ...this.state.dialogsVisible,
        deleteSelfProfile: !this.state.dialogsVisible.deleteSelfProfile,
      },
    });
  };

  onInviteAgainClick = () => {
    resendUserInvites(new Array(this.state.profile.id))
      .then(() =>
        toastr.success(
          <Trans
            i18nKey="MessageEmailActivationInstuctionsSentOnEmail"
            ns="Profile"
          >
            The email activation instructions have been sent to the
            <strong>{{ email: this.state.profile.email }}</strong> email address
          </Trans>
        )
      )
      .catch((error) => toastr.error(error));
  };

  getUserContextOptions = (user, viewer) => {
    let status = "";
    const { t, isAdmin, isMe } = this.props;

    if (isAdmin || (!isAdmin && isMe)) {
      status = getUserStatus(user);
    }

    switch (status) {
      case "normal":
      case "unknown":
        return [
          {
            key: "edit",
            label: t("EditUserDialogTitle"),
            onClick: this.onEditClick,
          },
          {
            key: "change-password",
            label: t("PasswordChangeButton"),
            onClick: this.toggleChangePasswordDialog,
          },
          {
            key: "change-email",
            label: t("EmailChangeButton"),
            onClick: this.toggleChangeEmailDialog,
          },
          isMe
            ? viewer.isOwner
              ? {}
              : {
                  key: "delete-profile",
                  label: t("DeleteSelfProfile"),
                  onClick: this.toggleDeleteSelfProfileDialog,
                }
            : {
                key: "disable",
                label: t("DisableUserButton"),
                onClick: this.onDisableClick,
              },
        ];
      case "disabled":
        return [
          {
            key: "enable",
            label: t("EnableUserButton"),
            onClick: this.onEnableClick,
          },
          {
            key: "reassign-data",
            label: t("ReassignData"),
            onClick: this.onReassignDataClick.bind(this, user),
          },
          {
            key: "delete-personal-data",
            label: t("RemoveData"),
            onClick: this.onDeletePersonalDataClick,
          },
          {
            key: "delete-profile",
            label: t("DeleteSelfProfile"),
            onClick: this.toggleDeleteProfileEverDialog,
          },
        ];
      case "pending":
        return [
          {
            key: "edit",
            label: t("EditButton"),
            onClick: this.onEditClick,
          },
          {
            key: "invite-again",
            label: t("InviteAgainLbl"),
            onClick: this.onInviteAgainClick,
          },
          !isMe &&
            (user.status === EmployeeStatus.Active
              ? {
                  key: "disable",
                  label: t("DisableUserButton"),
                  onClick: this.onDisableClick,
                }
              : {
                  key: "enable",
                  label: t("EnableUserButton"),
                  onClick: this.onEnableClick,
                }),
          isMe && {
            key: "delete-profile",
            label: t("DeleteSelfProfile"),
            onClick: this.toggleDeleteSelfProfileDialog,
          },
        ];
      default:
        return [];
    }
  };

  onClickBack = () => {
    const { filter, setFilter, history, resetProfile } = this.props;
    resetProfile();
    const backUrl = combineUrl(AppServerConfig.proxyURL, config.homepage);
    history.push(backUrl);
    setFilter(filter);
  };

  render() {
    const { profile, isAdmin, viewer, t, filter, history, isMe } = this.props;
    const { avatar, visibleAvatarEditor, dialogsVisible } = this.state;
    const contextOptions = () => this.getUserContextOptions(profile, viewer);

    return (
      <StyledContainer
        showContextButton={(isAdmin && !profile.isOwner) || isMe}
      >
        <IconButton
          iconName="/static/images/arrow.path.react.svg"
          color="#A3A9AE"
          size="17"
          hoverColor="#657077"
          isFill={true}
          onClick={this.onClickBack}
          className="arrow-button"
        />
        <Headline className="header-headline" type="content" truncate={true}>
          {profile.displayName}
          {profile.isLDAP && ` (${t("LDAPLbl")})`}
        </Headline>
        {((isAdmin && !profile.isOwner) || isMe) && (
          <ContextMenuButton
            className="action-button"
            directionX="right"
            title={t("Actions")}
            iconName="/static/images/vertical-dots.react.svg"
            size={17}
            color="#A3A9AE"
            getData={contextOptions}
            isDisabled={false}
          />
        )}

        <AvatarEditor
          image={avatar.image}
          visible={visibleAvatarEditor}
          onClose={this.onCloseAvatarEditor}
          onSave={this.onSaveAvatar}
          onLoadFile={this.onLoadFileAvatar}
          headerLabel={t("editAvatar")}
          selectNewPhotoLabel={t("selectNewPhotoLabel")}
          orDropFileHereLabel={t("orDropFileHereLabel")}
          unknownTypeError={t("ErrorUnknownFileImageType")}
          maxSizeFileError={t("maxSizeFileError")}
          unknownError={t("Error")}
          saveButtonLabel={t("SaveButton")}
        />

        {dialogsVisible.deleteSelfProfile && (
          <DeleteSelfProfileDialog
            visible={dialogsVisible.deleteSelfProfile}
            onClose={this.toggleDeleteSelfProfileDialog}
            email={this.state.profile.email}
          />
        )}

        {dialogsVisible.changePassword && (
          <ChangePasswordDialog
            visible={dialogsVisible.changePassword}
            onClose={this.toggleChangePasswordDialog}
            email={this.state.profile.email}
          />
        )}

        {dialogsVisible.changeEmail && (
          <ChangeEmailDialog
            visible={dialogsVisible.changeEmail}
            onClose={this.toggleChangeEmailDialog}
            user={this.state.profile}
          />
        )}

        {dialogsVisible.deleteProfileEver && (
          <DeleteProfileEverDialog
            visible={dialogsVisible.deleteProfileEver}
            onClose={this.toggleDeleteProfileEverDialog}
            user={this.state.profile}
            filter={filter}
            history={history}
          />
        )}
      </StyledContainer>
    );
  }
}

export default withRouter(
  inject(({ auth, peopleStore }) => {
    return {
      isAdmin: auth.isAdmin,
      isLoaded: auth.isLoaded,
      viewer: auth.userStore.user,
      filter: peopleStore.filterStore.filter,
      setFilter: peopleStore.filterStore.setFilterParams,
      setFilterUrl: peopleStore.filterStore.setFilterUrl,
      updateUserStatus: peopleStore.usersStore.updateUserStatus,
      resetProfile: peopleStore.targetUserStore.resetTargetUser,
      fetchProfile: peopleStore.targetUserStore.getTargetUser,
      profile: peopleStore.targetUserStore.targetUser,
      isMe: peopleStore.targetUserStore.isMe,
      updateProfile: peopleStore.targetUserStore.updateProfile,
      getUserPhoto: peopleStore.targetUserStore.getUserPhoto,
    };
  })(observer(withTranslation("Profile")(SectionHeaderContent)))
);
