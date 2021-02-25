import React from "react";
import throttle from "lodash/throttle";
import PropTypes from "prop-types";

import DropDownItem from "../drop-down-item";
import DropDown from "../drop-down";
import IconButton from "../icon-button";
import Backdrop from "../backdrop";
import Aside from "../aside";
import Heading from "../heading";
import Link from "../link";
import { desktop } from "../utils/device";
import {
  StyledBodyContent,
  StyledHeaderContent,
  StyledContent,
  StyledOuter,
} from "./styled-context-menu-button";

class ContextMenuButton extends React.Component {
  constructor(props) {
    super(props);

    this.ref = React.createRef();
    const displayType =
      props.displayType === "auto" ? this.getTypeByWidth() : props.displayType;

    this.state = {
      isOpen: props.opened,
      data: props.data,
      displayType,
    };
    this.throttledResize = throttle(this.resize, 300);
  }

  getTypeByWidth = () => {
    if (this.props.displayType !== "auto") return this.props.displayType;
    return window.innerWidth < desktop.match(/\d+/)[0] ? "aside" : "dropdown";
  };

  resize = () => {
    if (this.props.displayType !== "auto") return;
    const type = this.getTypeByWidth();
    if (type === this.state.displayType) return;
    this.setState({ displayType: type });
  };

  popstate = () => {
    window.removeEventListener("popstate", this.popstate, false);
    this.onClose();
    window.history.go(1);
  };

  componentDidMount() {
    window.addEventListener("resize", this.throttledResize);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.throttledResize);
    window.removeEventListener("popstate", this.popstate, false);
    this.throttledResize.cancel();
  }

  stopAction = (e) => e.preventDefault();
  toggle = (isOpen) => this.setState({ isOpen: isOpen });
  onClose = () => this.setState({ isOpen: !this.state.isOpen });

  componentDidUpdate(prevProps) {
    if (this.props.opened !== prevProps.opened) {
      this.toggle(this.props.opened);
    }

    if (this.props.opened && this.state.displayType === "aside") {
      window.addEventListener("popstate", this.popstate, false);
    }

    if (this.props.displayType !== prevProps.displayType) {
      this.setState({ displayType: this.getTypeByWidth() });
    }
  }

  onIconButtonClick = () => {
    if (this.props.isDisabled) {
      this.stopAction;
      return;
    }

    this.setState(
      {
        data: this.props.getData(),
        isOpen: !this.state.isOpen,
      },
      () =>
        !this.props.isDisabled &&
        this.state.isOpen &&
        this.props.onClick &&
        this.props.onClick()
    ); // eslint-disable-line react/prop-types
  };

  clickOutsideAction = (e) => {
    const path = e.path || (e.composedPath && e.composedPath());
    const dropDownItem = path ? path.find((x) => x === this.ref.current) : null;
    if (!dropDownItem) return;

    this.onIconButtonClick();
  };

  onDropDownItemClick = (item, e) => {
    const open = this.state.displayType === "dropdown";
    item.onClick && item.onClick(e, open);
    this.toggle(!this.state.isOpen);
  };

  shouldComponentUpdate(nextProps, nextState) {
    if (
      this.props.opened === nextProps.opened &&
      this.state.isOpen === nextState.isOpen &&
      this.props.displayType === nextProps.displayType
    ) {
      return false;
    }
    return true;
  }

  render() {
    //console.log("ContextMenuButton render");
    const {
      className,
      clickColor,
      color,
      columnCount,
      directionX,
      directionY,
      hoverColor,
      iconClickName,
      iconHoverName,
      iconName,
      iconOpenName,
      id,
      isDisabled,
      onMouseEnter,
      onMouseLeave,
      onMouseOut,
      onMouseOver,
      size,
      style,
      isFill, // eslint-disable-line react/prop-types
      asideHeader, // eslint-disable-line react/prop-types
    } = this.props;

    const { isOpen, displayType } = this.state;
    const iconButtonName = isOpen && iconOpenName ? iconOpenName : iconName;
    return (
      <StyledOuter ref={this.ref} className={className} id={id} style={style}>
        <IconButton
          color={color}
          hoverColor={hoverColor}
          clickColor={clickColor}
          size={size}
          iconName={iconButtonName}
          iconHoverName={iconHoverName}
          iconClickName={iconClickName}
          isFill={isFill}
          isDisabled={isDisabled}
          onClick={this.onIconButtonClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseOver={onMouseOver}
          onMouseOut={onMouseOut}
        />
        {displayType === "dropdown" ? (
          <DropDown
            directionX={directionX}
            directionY={directionY}
            open={isOpen}
            clickOutsideAction={this.clickOutsideAction}
            columnCount={columnCount}
          >
            {this.state.data.map(
              (item, index) =>
                item &&
                (item.label || item.icon || item.key) && (
                  <DropDownItem
                    {...item}
                    key={item.key || index}
                    onClick={this.onDropDownItemClick.bind(this, item)}
                  />
                )
            )}
          </DropDown>
        ) : (
          <>
            <Backdrop
              onClick={this.onClose}
              visible={isOpen}
              zIndex={310}
              isAside={true}
            />
            <Aside visible={isOpen} scale={false} zIndex={310}>
              <StyledContent>
                <StyledHeaderContent>
                  <Heading className="header" size="medium" truncate={true}>
                    {asideHeader}
                  </Heading>
                </StyledHeaderContent>
                <StyledBodyContent>
                  {this.state.data.map(
                    (item, index) =>
                      item &&
                      (item.label || item.icon || item.key) && (
                        <Link
                          className={`context-menu-button_link${
                            item.isHeader ? "-header" : ""
                          }`}
                          key={item.key || index}
                          fontSize={item.isHeader ? "15px" : "13px"}
                          noHover={item.isHeader}
                          fontWeight={600}
                          onClick={this.onDropDownItemClick.bind(this, item)}
                        >
                          {item.label}
                        </Link>
                      )
                  )}
                </StyledBodyContent>
              </StyledContent>
            </Aside>
          </>
        )}
      </StyledOuter>
    );
  }
}

ContextMenuButton.propTypes = {
  opened: PropTypes.bool,
  data: PropTypes.array,
  getData: PropTypes.func.isRequired,
  title: PropTypes.string,
  iconName: PropTypes.string,
  size: PropTypes.number,
  color: PropTypes.string,
  isDisabled: PropTypes.bool,

  hoverColor: PropTypes.string,
  clickColor: PropTypes.string,

  iconHoverName: PropTypes.string,
  iconClickName: PropTypes.string,
  iconOpenName: PropTypes.string,

  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  onMouseOver: PropTypes.func,
  onMouseOut: PropTypes.func,

  directionX: PropTypes.string,
  directionY: PropTypes.string,

  className: PropTypes.string,
  id: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  columnCount: PropTypes.number,
  displayType: PropTypes.string,
};

ContextMenuButton.defaultProps = {
  opened: false,
  data: [],
  title: "",
  iconName: "static/images/vertical-dots.react.svg",
  size: 16,
  isDisabled: false,
  directionX: "left",
  isFill: false,
  displayType: "dropdown",
};

export default ContextMenuButton;