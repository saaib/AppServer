import PropTypes from "prop-types";
import React from "react";

import Checkbox from "../checkbox";
import ContextMenuButton from "../context-menu-button";
import ContextMenu from "../context-menu";
import {
  StyledOptionButton,
  StyledContentElement,
  StyledElement,
  StyledCheckbox,
  StyledContent,
  StyledRow,
} from "./styled-row";

class Row extends React.Component {
  constructor(props) {
    super(props);

    this.cm = React.createRef();
    this.row = React.createRef();
  }

  render() {
    const {
      checked,
      children,
      contentElement,
      contextButtonSpacerWidth,
      contextOptions,
      data,
      element,
      indeterminate,
      onSelect,
      rowContextClick,
      sectionWidth,
    } = this.props;

    const renderCheckbox = Object.prototype.hasOwnProperty.call(
      this.props,
      "checked"
    );

    const renderElement = Object.prototype.hasOwnProperty.call(
      this.props,
      "element"
    );

    const renderContentElement =
      Object.prototype.hasOwnProperty.call(this.props, "contentElement") &&
      sectionWidth > 500;

    const renderContext =
      Object.prototype.hasOwnProperty.call(this.props, "contextOptions") &&
      contextOptions.length > 0;

    const changeCheckbox = (e) => {
      onSelect && onSelect(e.target.checked, data);
    };

    const getOptions = () => {
      rowContextClick && rowContextClick();
      return contextOptions;
    };

    const onContextMenu = (e) => {
      rowContextClick && rowContextClick();
      if (!this.cm.current.menuRef.current) {
        this.row.current.click(e); //TODO: need fix context menu to global
      }
      this.cm.current.show(e);
    };

    return (
      <StyledRow ref={this.row} {...this.props} onContextMenu={onContextMenu}>
        {renderCheckbox && (
          <StyledCheckbox>
            <Checkbox
              isChecked={checked}
              isIndeterminate={indeterminate}
              onChange={changeCheckbox}
            />
          </StyledCheckbox>
        )}
        {renderElement && (
          <StyledElement className="styled-element">{element}</StyledElement>
        )}
        <StyledContent className="row_content">{children}</StyledContent>
        <StyledOptionButton
          className="row_context-menu-wrapper"
          spacerWidth={contextButtonSpacerWidth}
        >
          {renderContentElement && (
            <StyledContentElement>{contentElement}</StyledContentElement>
          )}
          {renderContext ? (
            <ContextMenuButton
              color="#A3A9AE"
              hoverColor="#657077"
              className="expandButton"
              getData={getOptions}
              directionX="right"
            />
          ) : (
            <div className="expandButton"> </div>
          )}
          <ContextMenu model={contextOptions} ref={this.cm}></ContextMenu>
        </StyledOptionButton>
      </StyledRow>
    );
  }
}

Row.propTypes = {
  /** Required to host the Checkbox component. Its location is fixed and it is always the first.
   * If there is no value, the occupied space is distributed among the other child elements. */
  checked: PropTypes.bool,
  children: PropTypes.element,
  /** Accepts class */
  className: PropTypes.string,
  contentElement: PropTypes.any,
  /** Required for the width task of the ContextMenuButton component. */
  contextButtonSpacerWidth: PropTypes.string,
  /** Required to host the ContextMenuButton component. It is always located near the right border of the container,
   * regardless of the contents of the child elements. If there is no value, the occupied space is distributed among the other child elements. */
  contextOptions: PropTypes.array,
  /** Current row item information. */
  data: PropTypes.object,
  /** Required to host some component. It has a fixed order of location, if the Checkbox component is specified,
   * then it follows, otherwise it occupies the first position. If there is no value, the occupied space is distributed among the other child elements. */
  element: PropTypes.element,
  /** Accepts id  */
  id: PropTypes.string,
  /** If true, this state is shown as a rectangle in the checkbox */
  indeterminate: PropTypes.bool,
  /** when selecting row element. Returns data value. */
  onSelect: PropTypes.func,
  rowContextClick: PropTypes.func,
  /** Accepts css style  */
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  sectionWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

Row.defaultProps = {
  contextButtonSpacerWidth: "26px",
};

export default Row;
