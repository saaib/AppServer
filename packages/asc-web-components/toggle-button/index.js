import React, { Component } from "react";
import PropTypes from "prop-types";
import { ToggleButtonContainer, HiddenInput } from "./styled-toggle-button";
import { ToggleButtonIcon, ToggleButtonCheckedIcon } from "./svg";
import Text from "../text";
import globalColors from "../utils/globalColors";

const ToggleIcon = ({ isChecked }) => {
  return (
    <>
      {isChecked ? (
        <ToggleButtonCheckedIcon className="toggle-button" />
      ) : (
        <ToggleButtonIcon className="toggle-button" />
      )}
    </>
  );
};

class ToggleButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: props.isChecked,
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.isChecked !== prevProps.isChecked) {
      this.setState({ checked: this.props.isChecked });
    }
  }

  render() {
    const { isDisabled, label, onChange, id, className, style } = this.props;
    const { gray } = globalColors;
    const colorProps = isDisabled ? { color: gray } : {};

    //console.log("ToggleButton render");

    return (
      <ToggleButtonContainer
        id={id}
        className={className}
        style={style}
        isDisabled={isDisabled}
      >
        <HiddenInput
          type="checkbox"
          checked={this.state.checked}
          disabled={isDisabled}
          onChange={onChange}
        />
        <ToggleIcon isChecked={this.state.checked} />
        {label && (
          <Text className="toggle-button-text" as="span" {...colorProps}>
            {label}
          </Text>
        )}
      </ToggleButtonContainer>
    );
  }
}

ToggleButton.propTypes = {
  /** The checked property sets the checked state of a ToggleButton. */
  isChecked: PropTypes.bool.isRequired,
  /** Disables the ToggleButton */
  isDisabled: PropTypes.bool,
  /** Will be triggered whenever an ToggleButton is clicked */
  onChange: PropTypes.func.isRequired,
  /** Label of the input  */
  label: PropTypes.string,
  /** Set component id */
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Class name */
  className: PropTypes.string,
  /** Accepts css style */
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

ToggleIcon.propTypes = {
  isChecked: PropTypes.bool,
};

export default ToggleButton;
