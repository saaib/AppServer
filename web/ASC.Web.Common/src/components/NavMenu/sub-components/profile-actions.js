import React from "react";
import PropTypes from "prop-types";
import { Avatar, DropDownItem, Link } from "asc-web-components";
import ProfileMenu from "../../ProfileMenu";
import { inject, observer } from "mobx-react";

class ProfileActions extends React.PureComponent {
  constructor(props) {
    super(props);

    this.ref = React.createRef();

    this.state = {
      opened: props.opened,
      user: props.user,
    };
  }

  setOpened = (opened) => {
    this.setState({ opened: opened });
  };

  componentDidUpdate(prevProps, prevState) {
    const { isHeaderVisible, isTabletView } = this.props;
    if (this.props.user !== prevProps.user) {
      this.setState({ user: this.props.user });
    }

    if (this.props.opened !== prevProps.opened) {
      this.setOpened(this.props.opened);
    }
    if (this.state.opened !== prevState.opened) {
      isTabletView &&
        isHeaderVisible &&
        this.props.isOpenProfileMenu(this.state.opened);
    }
  }

  getUserRole = (user) => {
    let isModuleAdmin = user.listAdminModules && user.listAdminModules.length;

    if (user.isOwner) return "owner";
    if (user.isAdmin || isModuleAdmin) return "admin";
    if (user.isVisitor) return "guest";
    return "user";
  };

  onClose = (e) => {
    const path = e.path || (e.composedPath && e.composedPath());
    const dropDownItem = path ? path.find((x) => x === this.ref.current) : null;
    if (!dropDownItem) return;

    this.setOpened(!this.state.opened);
  };

  onClick = (action, e) => {
    action.onClick && action.onClick(e);

    this.setOpened(!this.state.opened);
  };

  onClickItemLink = (e) => {
    this.setOpened(!this.state.opened);

    e.preventDefault();
  };

  render() {
    //console.log("Layout sub-component ProfileActions render");
    const { user, opened } = this.state;
    const userRole = this.getUserRole(user);

    return (
      <div ref={this.ref}>
        <Avatar
          onClick={this.onClick}
          role={userRole}
          size="small"
          source={user.avatar}
          userName={user.displayName}
        />
        <ProfileMenu
          className="profile-menu"
          avatarRole={userRole}
          avatarSource={user.avatarMedium}
          displayName={user.displayName}
          email={user.email}
          open={opened}
          clickOutsideAction={this.onClose}
        >
          <div style={{ paddingTop: "8px" }}>
            {this.props.userActions.map((action) => (
              <Link
                noHover={true}
                key={action.key}
                href={action.url}
                onClick={this.onClickItemLink}
              >
                <DropDownItem {...action} />
              </Link>
            ))}
          </div>
        </ProfileMenu>
      </div>
    );
  }
}

ProfileActions.propTypes = {
  opened: PropTypes.bool,
  user: PropTypes.object,
  userActions: PropTypes.array,
  isHeaderVisible: PropTypes.bool,
  isTabletView: PropTypes.bool,
  isOpenProfileMenu: PropTypes.func,
};

ProfileActions.defaultProps = {
  opened: false,
  user: {},
  userActions: [],
};

export default inject(({ auth }) => {
  return {
    isHeaderVisible: auth.settingsStore.isHeaderVisible,
    isTabletView: auth.settingsStore.isTabletView,
  };
})(observer(ProfileActions));