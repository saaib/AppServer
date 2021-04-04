import React from "react";
import PropTypes from "prop-types";
import IconButton from "@appserver/components/icon-button";
import { StyledViewSelector } from "../StyledFilterInput";

class ViewSelector extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      viewAs: props.viewAs,
    };
  }

  onClickViewSelector = (item) => {
    this.props.onClickViewSelector && this.props.onClickViewSelector(item);
  };

  render() {
    const { isDisabled, viewAs } = this.props;

    return (
      <StyledViewSelector isDisabled={isDisabled}>
        <IconButton
          className={`view-selector-button ${viewAs === "row" ? "active" : ""}`}
          color={viewAs === "row" ? "#ffffff" : "#A3A9AE"}
          hoverColor={"#ffffff"}
          clickColor={"#ffffff"}
          iconName={"/static/images/filter.view.selector.row.react.svg"}
          isDisabled={isDisabled}
          isFill={true}
          onClick={this.onClickViewSelector}
          size={16}
          id="rowSelectorButton"
        />

        <IconButton
          className={`view-selector-button ${
            viewAs === "tile" ? "active" : ""
          }`}
          color={viewAs === "tile" ? "#ffffff" : "#A3A9AE"}
          hoverColor={"#ffffff"}
          clickColor={"#ffffff"}
          iconName={"/static/images/filter.view.selector.tile.react.svg"}
          isDisabled={isDisabled}
          isFill={true}
          onClick={this.onClickViewSelector}
          size={16}
          id="tileSelectorButton"
        />
      </StyledViewSelector>
    );
  }
}
ViewSelector.propTypes = {
  isDisabled: PropTypes.bool,
  viewAs: PropTypes.string,
  onClickViewSelector: PropTypes.func,
};

ViewSelector.defaultProps = {
  isDisabled: false,
};

export default ViewSelector;
