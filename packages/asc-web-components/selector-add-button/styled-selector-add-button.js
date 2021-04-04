import styled from "styled-components";
import Base from "../themes/base";

const StyledButton = styled.div`
  display: inline-block;
  background: ${(props) => props.theme.selectorAddButton.background};
  border: ${(props) => props.theme.selectorAddButton.border};
  box-sizing: ${(props) => props.theme.selectorAddButton.boxSizing};
  border-radius: ${(props) => props.theme.selectorAddButton.boxSizing};
  height: ${(props) => props.theme.selectorAddButton.height};
  width: ${(props) => props.theme.selectorAddButton.width};
  padding: ${(props) => props.theme.selectorAddButton.padding};

  cursor: ${(props) => (!props.isDisabled ? "pointer" : "default")};

  &:hover {
    path {
      ${(props) =>
        !props.isDisabled &&
        `
    fill: ${props.theme.selectorAddButton.color};
    `}
    }
  }

  &:active {
    ${(props) =>
      !props.isDisabled &&
      `background-color: ${props.theme.selectorAddButton.activeBackground};`}
  }
`;

StyledButton.defaultProps = { theme: Base };

export default StyledButton;
