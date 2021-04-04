import React from "react";
import { withRouter } from "react-router";
import styled from "styled-components";
import Badge from "@appserver/components/badge";
import { inject, observer } from "mobx-react";
import FileActionsConvertEditDocIcon from "../../../../../../public/images/file.actions.convert.edit.doc.react.svg";
import FileActionsLockedIcon from "../../../../../../public/images/file.actions.locked.react.svg";
import AccessEditIcon from "../../../../../../public/images/access.edit.react.svg";
import FileActionsConvertIcon from "../../../../../../public/images/access.edit.react.svg";
import commonIconsStyles from "@appserver/components/utils/common-icons-style";

const StyledBadgesFileTile = styled.div`
  display: flex;
  align-self: start;
  align-items: center;
  position: relative;
  margin: -5px;

  & > svg,
  & > div {
    margin: 5px;
  }
`;
const StyledFileActionsConvertEditDocIcon = styled(
  FileActionsConvertEditDocIcon
)`
  ${commonIconsStyles}
  path {
    fill: ${(props) => props.color};
  }
`;
const StyledFileActionsLockedIcon = styled(FileActionsLockedIcon)`
  ${commonIconsStyles}
  path {
    fill: ${(props) => props.color};
  }
`;
const StyledAccessEditIcon = styled(AccessEditIcon)`
  ${commonIconsStyles}
  path {
    fill: ${(props) => props.color};
  }
`;
const StyledFileActionsConvertIcon = styled(FileActionsConvertIcon)`
  ${commonIconsStyles}
  path {
    fill: ${(props) => props.color};
  }
`;
class BadgesFileTile extends React.PureComponent {
  render() {
    const { item, canConvert, canWebEdit } = this.props;
    const { fileStatus, id, versionGroup } = item;

    return (
      <StyledBadgesFileTile>
        {canConvert && (
          <StyledFileActionsConvertIcon
            className="badge"
            size="small"
            color="#A3A9AE"
          />
        )}
        {canWebEdit && (
          <StyledAccessEditIcon
            className="badge"
            size="small"
            color="#A3A9AE"
          />
        )}
        {fileStatus === 1 && (
          <StyledFileActionsConvertEditDocIcon
            className="badge"
            size="small"
            color="#3B72A7"
          />
        )}
        {false && (
          <StyledFileActionsLockedIcon
            className="badge"
            size="small"
            color="#3B72A7"
          />
        )}
        {versionGroup > 1 && (
          <Badge
            className="badge-version"
            backgroundColor="#A3A9AE"
            borderRadius="11px"
            color="#FFFFFF"
            fontSize="10px"
            fontWeight={800}
            label={`Ver.${versionGroup}`}
            maxWidth="50px"
            onClick={this.onShowVersionHistory}
            padding="0 5px"
            data-id={id}
          />
        )}
        {fileStatus === 2 && (
          <Badge
            className="badge-version"
            backgroundColor="#ED7309"
            borderRadius="11px"
            color="#FFFFFF"
            fontSize="10px"
            fontWeight={800}
            label={`New`}
            maxWidth="50px"
            onClick={this.onBadgeClick}
            padding="0 5px"
            data-id={id}
          />
        )}
      </StyledBadgesFileTile>
    );
  }
}

export default inject(({ formatsStore }, { item }) => {
  const { docserviceStore } = formatsStore;

  const canWebEdit = docserviceStore.canWebEdit(item.fileExst);
  const canConvert = docserviceStore.canConvert(item.fileExst);

  return {
    canWebEdit,
    canConvert,
  };
})(withRouter(observer(BadgesFileTile)));
