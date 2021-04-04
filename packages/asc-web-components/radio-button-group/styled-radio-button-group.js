import React from "react";
import styled, { css } from "styled-components";

// eslint-disable-next-line react/prop-types, no-unused-vars
const ClearDiv = ({ orientation, width, ...props }) => <div {...props} />;

const StyledDiv = styled(ClearDiv)`
  ${(props) =>
    (props.orientation === "horizontal" &&
      css`
        display: flex;
      `) ||
    (props.orientation === "vertical" &&
      css`
        display: block;
      `)};

  width: ${(props) => props.width};
`;

export default StyledDiv;
