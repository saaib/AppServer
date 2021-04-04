import React from "react";
import PropTypes from "prop-types";

import Text from "../text";
import { StyledBadge, StyledInner } from "./styled-badge";

const Badge = (props) => {
  //console.log("Badge render");

  const onClick = (e) => {
    if (!props.onClick) return;

    e.preventDefault();
    e.stopPropagation();
    props.onClick(e);
  };

  const {
    fontSize,
    color,
    fontWeight,
    backgroundColor,
    borderRadius,
    padding,
    maxWidth,
  } = props;

  return (
    <StyledBadge {...props} onClick={onClick}>
      <StyledInner
        backgroundColor={backgroundColor}
        borderRadius={borderRadius}
        padding={padding}
        maxWidth={maxWidth}
      >
        <Text fontWeight={fontWeight} color={color} fontSize={fontSize}>
          {props.label}
        </Text>
      </StyledInner>
    </StyledBadge>
  );
};

Badge.propTypes = {
  /** Value */
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** CSS background-color */
  backgroundColor: PropTypes.string,
  /** CSS color */
  color: PropTypes.string,
  /** CSS font-size */
  fontSize: PropTypes.string,
  /** CSS font-weight */
  fontWeight: PropTypes.number,
  /** CSS border-radius */
  borderRadius: PropTypes.string,
  /** CSS padding */
  padding: PropTypes.string,
  /** CSS max-width */
  maxWidth: PropTypes.string,
  /** onClick event */
  onClick: PropTypes.func,
  /** Accepts class */
  className: PropTypes.string,
  /** Accepts id */
  id: PropTypes.string,
  /** Accepts css style */
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

Badge.defaultProps = {
  label: 0,
  backgroundColor: "#ED7309",
  color: "#FFFFFF",
  fontSize: "11px",
  fontWeight: 800,
  borderRadius: "11px",
  padding: "0 5px",
  maxWidth: "50px",
};

export default Badge;
