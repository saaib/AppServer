import React from "react";
import PropTypes from "prop-types";
import { withRouter } from "react-router";
import Backdrop from "@appserver/components/backdrop";
import Link from "@appserver/components/link";
import Heading from "@appserver/components/heading";
import Aside from "@appserver/components/aside";
import Row from "@appserver/components/row";
import Box from "@appserver/components/box";
import RowContainer from "@appserver/components/row-container";
import Button from "@appserver/components/button";
import { withTranslation } from "react-i18next";
import { getNewFiles, markAsRead } from "@appserver/common/api/files";
import toastr from "studio/toastr";
import { ReactSVG } from "react-svg";
import {
  StyledAsidePanel,
  StyledContent,
  StyledHeaderContent,
  StyledBody,
  StyledFooter,
} from "../StyledPanels";
import { inject, observer } from "mobx-react";
import { combineUrl } from "@appserver/common/utils";
import { AppServerConfig } from "@appserver/common/constants";
import config from "../../../../package.json";
class NewFilesPanelComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = { files: [] };
  }

  componentDidMount() {
    const { folderId, setIsLoading } = this.props;
    setIsLoading(true);
    getNewFiles(folderId[folderId.length - 1])
      .then((files) => this.setState({ files }))
      .catch((err) => toastr.error(err))
      .finally(() => setIsLoading(false));
  }

  getItemIcon = (item, isEdit) => {
    const extension = item.fileExst;
    const icon = extension
      ? this.props.getFileIcon(extension, 24)
      : this.props.getFolderIcon(item.providerKey, 24);

    return (
      <ReactSVG
        beforeInjection={(svg) => {
          svg.setAttribute("style", "margin-top: 4px");
          isEdit && svg.setAttribute("style", "margin-left: 24px");
        }}
        src={icon}
        loading={this.svgLoader}
      />
    );
  };

  onMarkAsRead = () => {
    const { folderId, onClose } = this.props;
    const markAsReadFiles = true;

    const folderIds = [];
    const fileIds = [];
    const itemsIds = [];

    for (let item of this.state.files) {
      itemsIds.push(`${item.id}`);
      if (item.fileExst) {
        fileIds.push(item.id);
      } else {
        folderIds.push(item.id);
      }
    }

    markAsRead(folderIds, fileIds)
      .then(() => {
        this.setNewFilesCount(folderId, markAsReadFiles);
        this.props.setNewRowItems(itemsIds);
      })
      .catch((err) => toastr.error(err))
      .finally(() => onClose());
  };

  onNewFilesClick = (item) => {
    const { onClose, /*setIsLoading,*/ folderId, markAsRead } = this.props;
    const folderIds = [];
    const fileId = [];
    const isFile = item.fileExst;

    isFile ? fileId.push(item.id) : folderIds.push(item.id);

    markAsRead(folderIds, fileId)
      .then(() => {
        this.setNewFilesCount(folderId, false, item);
        this.onFilesClick(item);
      })
      .catch((err) => toastr.error(err))
      .finally(() => {
        !isFile && onClose();
      });
  };

  onFilesClick = (item) => {
    console.log("ITEM", item);
    return;
    const { id, fileExst, viewUrl, fileType, providerKey } = item;
    const {
      filter,
      setMediaViewerData,
      fetchFiles,
      addFileToRecentlyViewed,
    } = this.props;

    if (!fileExst) {
      fetchFiles(id, filter).catch((err) => toastr.error(err));
    } else {
      const canEdit = [5, 6, 7].includes(fileType); //TODO: maybe dirty
      const isMedia = [2, 3, 4].includes(fileType);

      if (canEdit && providerKey) {
        return addFileToRecentlyViewed(id)
          .then(() => console.log("Pushed to recently viewed"))
          .catch((e) => console.error(e))
          .finally(
            window.open(
              combineUrl(
                AppServerConfig.proxyURL,
                config.homepage,
                `/doceditor?fileId=${id}`
              ),
              "_blank"
            )
          );
      }

      if (isMedia) {
        //const mediaItem = { visible: true, id };
        //setMediaViewerData(mediaItem);
        return;
      }

      return window.open(viewUrl, "_blank");
    }
  };

  setNewFilesCount = (folderPath, markAsReadAll, item) => {
    const { treeFolders, setTreeFolders, folders, files } = this.props;

    const data = treeFolders;
    let dataItem;

    const loop = (index, newData) => {
      dataItem = newData.find((x) => x.id === folderPath[index]);
      if (index === folderPath.length - 1) {
        const rootItem = data.find((x) => x.id === folderPath[0]);
        const newFilesCounter = dataItem.newItems
          ? dataItem.newItems
          : dataItem.new;
        rootItem.newItems = markAsReadAll
          ? rootItem.newItems - newFilesCounter
          : rootItem.newItems - 1;
        dataItem.newItems = markAsReadAll ? 0 : newFilesCounter - 1;
        this.props.setNewRowItems([`${item.id}`]);
        return;
      } else {
        loop(index + 1, dataItem.folders);
      }
    };

    if (folderPath.length > 1) {
      loop(0, data);
    } else {
      dataItem = data.find((x) => x.id === +folderPath[0]);
      dataItem.newItems = markAsReadAll ? 0 : dataItem.newItems - 1;

      if (item && item.fileExst) {
        const fileItem = files.find((x) => x.id === item.id && x.fileExst);
        if (fileItem) {
          fileItem.new = markAsReadAll ? 0 : fileItem.new - 1;
        } else {
          const filesFolder = folders.find((x) => x.id === item.folderId);
          if (filesFolder) {
            filesFolder.new = markAsReadAll ? 0 : filesFolder.new - 1;
          }
        }
        this.props.setNewRowItems([`${item.id}`]);
      } else if (item && !item.fileExst) {
        const folderItem = folders.find((x) => x.id === item.id && !x.fileExst);
        if (folderItem) {
          folderItem.new = markAsReadAll ? 0 : folderItem.new - 1;
        }
      }
    }

    setTreeFolders(data);
  };

  render() {
    //console.log("NewFiles panel render");
    const { t, visible, onClose } = this.props;
    const { files } = this.state;
    const zIndex = 310;

    return (
      <StyledAsidePanel visible={visible}>
        <Backdrop
          onClick={onClose}
          visible={visible}
          zIndex={zIndex}
          isAside={true}
        />
        <Aside className="header_aside-panel" visible={visible}>
          <StyledContent>
            <StyledHeaderContent>
              <Heading
                className="files-operations-header"
                size="medium"
                truncate
              >
                {t("NewFiles")}
              </Heading>
            </StyledHeaderContent>
            <StyledBody className="files-operations-body">
              <RowContainer useReactWindow>
                {files.map((file) => {
                  const element = this.getItemIcon(file);
                  return (
                    <Row key={file.id} element={element}>
                      <Box
                        onClick={this.onNewFilesClick.bind(this, file)}
                        marginProp="auto 0"
                      >
                        <Link
                          containerWidth="100%"
                          type="page"
                          fontWeight="bold"
                          color="#333"
                          isTextOverflow
                          truncate
                          title={file.title}
                          fontSize="14px"
                          className="files-new-link"
                        >
                          {file.title}
                        </Link>
                      </Box>
                    </Row>
                  );
                })}
              </RowContainer>
            </StyledBody>
            <StyledFooter>
              <Button
                label={t("MarkAsRead")}
                size="big"
                primary
                onClick={this.onMarkAsRead}
              />
              <Button
                className="sharing_panel-button"
                label={t("CloseButton")}
                size="big"
                onClick={onClose}
              />
            </StyledFooter>
          </StyledContent>
        </Aside>
      </StyledAsidePanel>
    );
  }
}

NewFilesPanelComponent.propTypes = {
  onClose: PropTypes.func,
  visible: PropTypes.bool,
};

const NewFilesPanel = withTranslation("NewFilesPanel")(NewFilesPanelComponent);

export default inject(
  ({
    filesStore,
    mediaViewerDataStore,
    treeFoldersStore,
    formatsStore,
    filesActionsStore,
  }) => {
    const {
      files,
      folders,
      fetchFiles,
      filter,
      addFileToRecentlyViewed,
      setNewRowItems,
      setIsLoading,
    } = filesStore;
    const { treeFolders, setTreeFolders } = treeFoldersStore;
    const { setMediaViewerData } = mediaViewerDataStore;
    const { getFileIcon, getFolderIcon } = formatsStore.iconFormatsStore;
    const { markAsRead } = filesActionsStore;

    return {
      files,
      folders,
      treeFolders,
      filter,

      setIsLoading,
      fetchFiles,
      setTreeFolders,
      setMediaViewerData,
      addFileToRecentlyViewed,
      setNewRowItems,
      getFileIcon,
      getFolderIcon,
      markAsRead,
    };
  }
)(withRouter(observer(NewFilesPanel)));
