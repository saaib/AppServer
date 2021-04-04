import React, { Component } from "react";
import PropTypes from "prop-types";
import { withRouter } from "react-router";
import { withTranslation } from "react-i18next";
import styled from "styled-components";
import Text from "@appserver/components/text";
import Avatar from "@appserver/components/avatar";
import Link from "@appserver/components/link";
import toastr from "@appserver/components/toast/toastr";
import Button from "@appserver/components/button";
import RequestLoader from "@appserver/components/request-loader";
import Loader from "@appserver/components/loader";
import PeopleSelector from "people/PeopleSelector";
import isEmpty from "lodash/isEmpty";
import { inject } from "mobx-react";
import { showLoader, hideLoader } from "@appserver/common/utils";

const OwnerContainer = styled.div`
  .link_style {
    margin-right: 16px;
  }
  .text-body_wrapper {
    margin-bottom: 16px;
  }
  .advanced-selector {
    position: relative;
  }
  .text-body_inline {
    display: inline-flex;
  }
  .button_offset {
    margin-right: 16px;
  }
`;
const HeaderContainer = styled.div`
  margin: 0 0 16px 0;
`;

const BodyContainer = styled.div`
  display: flex;
  align-items: flex-start;
  flex-direction: row;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const AvatarContainer = styled.div`
  display: flex;
  width: 330px;
  height: 120px;
  margin-right: 130px;
  margin-bottom: 24px;
  padding: 8px;
  border: 1px solid lightgrey;

  .avatar_wrapper {
    width: 100px;
    height: 100px;
  }

  .avatar_body {
    margin-left: 24px;
    max-width: 190px;
    word-wrap: break-word;
    overflow: hidden;
  }
`;

const ProjectsBody = styled.div`
  width: 280px;
`;

class PureOwnerSettings extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      showSelector: false,
      showLoader: true,
      selectedOwner: null,
    };
  }

  componentDidMount() {
    const { owner, getPortalOwner } = this.props;
    showLoader();
    if (isEmpty(owner, true)) {
      getPortalOwner()
        .catch((error) => {
          toastr.error(error);
        })
        .finally(() => this.setState({ showLoader: false }));
    } else {
      this.setState({ showLoader: false });
    }
    hideLoader();
  }

  onChangeOwner = () => {
    const { t, owner, sendOwnerChange } = this.props;
    const { selectedOwner } = this.state;
    sendOwnerChange(selectedOwner.key)
      .then((res) => toastr.success(res.message)) //toastr.success(t("DnsChangeMsg", { email: owner.email })))
      .catch((err) => toastr.error(err));
  };

  onLoading = (status) => this.setState({ isLoading: status });

  onShowSelector = (status) => {
    this.setState({
      showSelector: status,
    });
  };

  onCancelSelector = () => {
    this.onShowSelector(false);
  };

  onSelect = (items) => {
    this.onShowSelector(false);
    this.setState({ selectedOwner: items[0] });
  };

  render() {
    const { t, owner, me, groupsCaption } = this.props;
    const { isLoading, showLoader, showSelector, selectedOwner } = this.state;

    const OwnerOpportunities = t("AccessRightsOwnerOpportunities").split("|");

    console.log("Owner render_");

    return (
      <>
        {showLoader ? (
          <Loader className="pageLoader" type="rombs" size="40px" />
        ) : (
          <OwnerContainer>
            <RequestLoader
              visible={isLoading}
              zIndex={256}
              loaderSize="16px"
              loaderColor={"#999"}
              label={`${t("LoadingProcessing")} ${t("LoadingDescription")}`}
              fontSize="12px"
              fontColor={"#999"}
              className="page_loader"
            />
            <HeaderContainer>
              <Text fontSize="18px">{t("PortalOwner")}</Text>
            </HeaderContainer>

            <BodyContainer>
              <AvatarContainer>
                <Avatar
                  className="avatar_wrapper"
                  size="big"
                  role="owner"
                  userName={owner.userName}
                  source={owner.avatar}
                />
                <div className="avatar_body">
                  <Text className="avatar_text" fontSize="16px" isBold={true}>
                    {owner.displayName}
                  </Text>
                  {owner.groups &&
                    owner.groups.map((group) => (
                      <Link
                        fontSize="12px"
                        key={group.id}
                        href={owner.profileUrl}
                      >
                        {group.name}
                      </Link>
                    ))}
                </div>
              </AvatarContainer>
              <ProjectsBody>
                <Text className="portal_owner" fontSize="12px">
                  {t("AccessRightsOwnerCan")}:
                </Text>
                <Text fontSize="12px">
                  {OwnerOpportunities.map((item, key) => (
                    <li key={key}>{item};</li>
                  ))}
                </Text>
              </ProjectsBody>
            </BodyContainer>

            <Text fontSize="12px" className="text-body_wrapper">
              {t("AccessRightsChangeOwnerText")}
            </Text>

            <Link
              className="link_style"
              isHovered={true}
              onClick={this.onShowSelector.bind(this, !showSelector)}
            >
              {selectedOwner ? selectedOwner.label : t("ChooseOwner")}
            </Link>

            <Button
              className="button_offset"
              size="medium"
              primary={true}
              label={t("AccessRightsChangeOwnerButtonText")}
              isDisabled={!isLoading ? selectedOwner === null : false}
              onClick={this.onChangeOwner}
            />
            <Text className="text-body_inline" fontSize="12px" color="#A3A9AE">
              {t("AccessRightsChangeOwnerConfirmText")}
            </Text>

            <div className="advanced-selector">
              <PeopleSelector
                isOpen={showSelector}
                size={"compact"}
                onSelect={this.onSelect}
                onCancel={this.onCancelSelector}
                defaultOption={me}
                defaultOptionLabel={t("MeLabel")}
                groupsCaption={groupsCaption}
              />
            </div>
          </OwnerContainer>
        )}
      </>
    );
  }
}

const OwnerSettings = withTranslation("Settings")(PureOwnerSettings);

OwnerSettings.defaultProps = {
  owner: {},
};

OwnerSettings.propTypes = {
  owner: PropTypes.object,
};

export default inject(({ auth, setup }) => {
  const { customNames, getPortalOwner, owner } = auth.settingsStore;
  const { sendOwnerChange } = setup;
  return {
    groupsCaption: customNames.groupsCaption,
    getPortalOwner,
    owner,
    me: auth.userStore.user,
    sendOwnerChange,
  };
})(withRouter(OwnerSettings));
