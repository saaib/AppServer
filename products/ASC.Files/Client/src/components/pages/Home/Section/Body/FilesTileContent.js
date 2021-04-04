import React from "react";
import { withRouter } from "react-router";
import { Trans, withTranslation } from "react-i18next";
import styled from "styled-components";
import Badge from "@appserver/components/badge";
import Link from "@appserver/components/link";
import Text from "@appserver/components/text";
import { markAsRead } from "@appserver/common/api/files";
import { FileAction, AppServerConfig } from "@appserver/common/constants";
import toastr from "studio/toastr";
import { getTitleWithoutExst } from "../../../../../helpers/files-helpers";
import { NewFilesPanel } from "../../../../panels";
import EditingWrapperComponent from "./EditingWrapperComponent";
import TileContent from "./TileContent";
import { isMobile } from "react-device-detect";
import { inject, observer } from "mobx-react";
import CheckIcon from "../../../../../../public/images/check.react.svg";
import CrossIcon from "../../../../../../../../../public/images/cross.react.svg";
import config from "../../../../../../package.json";
import { combineUrl } from "@appserver/common/utils";

const SimpleFilesTileContent = styled(TileContent)`
  .rowMainContainer {
    height: auto;
    max-width: 100%;
    align-self: flex-end;

    a {
      word-break: break-word;
    }
  }

  .mainIcons {
    align-self: flex-end;
  }

  .badge-ext {
    margin-left: -8px;
    margin-right: 8px;
  }

  .badge {
    margin-right: 8px;
  }

  .badges {
    display: flex;
    align-items: center;
  }

  .share-icon {
    margin-top: -4px;
    padding-right: 8px;
  }

  @media (max-width: 1024px) {
    display: inline-flex;
    height: auto;

    & > div {
      margin-top: 0;
    }
  }
`;

const okIcon = (
  <CheckIcon
    className="edit-ok-icon"
    size="scale"
    isfill={true}
    color="#A3A9AE"
  />
);

const cancelIcon = (
  <CrossIcon
    className="edit-cancel-icon"
    size="scale"
    isfill={true}
    color="#A3A9AE"
  />
);

class FilesTileContent extends React.PureComponent {
  constructor(props) {
    super(props);
    let titleWithoutExt = getTitleWithoutExst(props.item);

    if (props.fileAction.id === -1) {
      titleWithoutExt = this.getDefaultName(props.fileAction.extension);
    }

    this.state = {
      itemTitle: titleWithoutExt,
      editingId: props.fileAction.id,
      showNewFilesPanel: false,
      newFolderId: [],
      newItems: props.item.new,
      //loading: false
    };
  }

  completeAction = (e) => {
    //this.setState({ loading: false }, () =>)
    this.props.onEditComplete(e);
  };

  updateItem = (e) => {
    const {
      fileAction,
      updateFile,
      renameFolder,
      item,
      setIsLoading,
    } = this.props;

    const { itemTitle } = this.state;
    const originalTitle = getTitleWithoutExst(item);

    setIsLoading(true);
    if (originalTitle === itemTitle) return this.completeAction(e);

    item.fileExst
      ? updateFile(fileAction.id, itemTitle)
          .then(() => this.completeAction(e))
          .finally(() => setIsLoading(false))
      : renameFolder(fileAction.id, itemTitle)
          .then(() => this.completeAction(e))
          .finally(() => setIsLoading(false));
  };

  createItem = (e) => {
    const { createFile, item, setIsLoading, createFolder } = this.props;
    const { itemTitle } = this.state;

    setIsLoading(true);

    if (itemTitle.trim() === "") return this.completeAction();

    !item.fileExst
      ? createFolder(item.parentId, itemTitle)
          .then(() => this.completeAction(e))
          .finally(() => {
            toastr.success(
              <Trans i18nKey="FolderCreated" ns="Home">
                New folder {{ itemTitle }} is created
              </Trans>
            );
            return setIsLoading(false);
          })
      : createFile(item.parentId, `${itemTitle}.${item.fileExst}`)
          .then(() => this.completeAction(e))
          .finally(() => {
            const exst = item.fileExst;
            toastr.success(
              <Trans i18nKey="FileCreated" ns="Home">
                New file {{ itemTitle }}.{{ exst }} is created
              </Trans>
            );
            return setIsLoading(false);
          });
  };

  componentDidUpdate(prevProps) {
    const { fileAction } = this.props;
    if (fileAction) {
      if (fileAction.id !== prevProps.fileAction.id) {
        this.setState({ editingId: fileAction.id });
      }
    }
  }

  renameTitle = (e) => {
    this.setState({ itemTitle: e.target.value });
  };

  cancelUpdateItem = (e) => {
    //this.setState({ loading: false });
    this.completeAction(e);
  };

  onClickUpdateItem = () => {
    this.props.fileAction.type === FileAction.Create
      ? this.createItem()
      : this.updateItem();
  };

  onKeyUpUpdateItem = (e) => {
    if (e.keyCode === 13) {
      this.props.fileAction.type === FileAction.Create
        ? this.createItem()
        : this.updateItem();
    }

    if (e.keyCode === 27) return this.cancelUpdateItem();
  };

  onFilesClick = () => {
    const { id, fileExst, viewUrl, providerKey } = this.props.item;
    const {
      filter,
      parentFolder,
      setIsLoading,
      onMediaFileClick,
      fetchFiles,
      canWebEdit,
      openDocEditor,
      isVideo,
      isImage,
      isSound,
      expandedKeys,
      addExpandedKeys,
    } = this.props;
    if (!fileExst) {
      setIsLoading(true);

      if (!expandedKeys.includes(parentFolder + "")) {
        addExpandedKeys(parentFolder + "");
      }

      fetchFiles(id, filter)
        .catch((err) => {
          toastr.error(err);
          setIsLoading(false);
        })
        .finally(() => setIsLoading(false));
    } else {
      if (canWebEdit) {
        return openDocEditor(id, providerKey);
      }

      const isOpenMedia = isImage || isSound || isVideo;

      if (isOpenMedia) {
        onMediaFileClick(id);
        return;
      }

      return window.open(viewUrl, "_blank");
    }
  };

  onMobileRowClick = (e) => {
    if (!isMobile) return;

    this.onFilesClick();
  };

  getStatusByDate = () => {
    const { culture, t, item, sectionWidth } = this.props;
    const { created, updated, version, fileExst } = item;

    const title =
      version > 1
        ? t("TitleModified")
        : fileExst
        ? t("TitleUploaded")
        : t("TitleCreated");

    const date = fileExst ? updated : created;
    const dateLabel = new Date(date).toLocaleString(culture);
    const mobile = (sectionWidth && sectionWidth <= 375) || isMobile;

    return mobile ? dateLabel : `${title}: ${dateLabel}`;
  };

  getDefaultName = (format) => {
    const { t } = this.props;

    switch (format) {
      case "docx":
        return t("NewDocument");
      case "xlsx":
        return t("NewSpreadsheet");
      case "pptx":
        return t("NewPresentation");
      default:
        return t("NewFolder");
    }
  };

  onShowVersionHistory = (e) => {
    const { homepage, history } = this.props;
    const fileId = e.currentTarget.dataset.id;

    history.push(
      combineUrl(AppServerConfig.proxyURL, homepage, `/${fileId}/history`)
    );
  };

  onBadgeClick = () => {
    const { showNewFilesPanel } = this.state;
    const {
      item,
      treeFolders,
      setTreeFolders,
      rootFolderId,
      newItems,
      filter,
      fetchFiles,
    } = this.props;
    if (item.fileExst) {
      markAsRead([], [item.id])
        .then(() => {
          const data = treeFolders;
          const dataItem = data.find((x) => x.id === rootFolderId);
          dataItem.newItems = newItems ? dataItem.newItems - 1 : 0; //////newItems
          setTreeFolders(data);
          fetchFiles(this.props.selectedFolderId, filter.clone());
        })
        .catch((err) => toastr.error(err));
    } else {
      const newFolderId = this.props.selectedFolderPathParts;
      newFolderId.push(item.id);
      this.setState({
        showNewFilesPanel: !showNewFilesPanel,
        newFolderId,
      });
    }
  };

  onShowNewFilesPanel = () => {
    const { showNewFilesPanel } = this.state;
    this.setState({ showNewFilesPanel: !showNewFilesPanel });
  };

  render() {
    const { item, fileAction, isTrashFolder, folders } = this.props;
    const {
      itemTitle,
      editingId,
      showNewFilesPanel,
      newItems,
      newFolderId,
    } = this.state;
    const { fileExst, id } = item;

    const titleWithoutExt = getTitleWithoutExst(item);

    const isEdit = id === editingId && fileExst === fileAction.extension;
    const linkStyles = isTrashFolder
      ? { noHover: true }
      : { onClick: this.onFilesClick };
    const showNew = item.new && item.new > 0;

    return isEdit ? (
      <EditingWrapperComponent
        itemTitle={itemTitle}
        okIcon={okIcon}
        cancelIcon={cancelIcon}
        renameTitle={this.renameTitle}
        onKeyUpUpdateItem={this.onKeyUpUpdateItem}
        onClickUpdateItem={this.onClickUpdateItem}
        cancelUpdateItem={this.cancelUpdateItem}
        itemId={id}
      />
    ) : (
      <>
        {showNewFilesPanel && (
          <NewFilesPanel
            visible={showNewFilesPanel}
            onClose={this.onShowNewFilesPanel}
            folderId={newFolderId}
            folders={folders}
          />
        )}
        <SimpleFilesTileContent
          sideColor="#333"
          isFile={fileExst}
          onClick={this.onMobileRowClick}
          disableSideInfo
        >
          <Link
            containerWidth="100%"
            type="page"
            title={titleWithoutExt}
            fontWeight="bold"
            fontSize="15px"
            {...linkStyles}
            color="#333"
            isTextOverflow
          >
            {titleWithoutExt}
          </Link>
          <>
            {fileExst ? (
              <div className="badges">
                <Text
                  className="badge-ext"
                  as="span"
                  color="#A3A9AE"
                  fontSize="15px"
                  fontWeight={600}
                  title={fileExst}
                  truncate={true}
                >
                  {fileExst}
                </Text>
              </div>
            ) : (
              <div className="badges">
                {!!showNew && (
                  <Badge
                    className="badge-version"
                    backgroundColor="#ED7309"
                    borderRadius="11px"
                    color="#FFFFFF"
                    fontSize="10px"
                    fontWeight={800}
                    label={newItems}
                    maxWidth="50px"
                    onClick={this.onBadgeClick}
                    padding="0 5px"
                    data-id={id}
                  />
                )}
              </div>
            )}
          </>
        </SimpleFilesTileContent>
      </>
    );
  }
}

export default inject(
  (
    { auth, filesStore, formatsStore, treeFoldersStore, selectedFolderStore },
    { item }
  ) => {
    const { culture } = auth.settingsStore;
    const {
      iconFormatsStore,
      mediaViewersFormatsStore,
      docserviceStore,
    } = formatsStore;
    const {
      folders,
      fetchFiles,
      filter,
      newRowItems,
      createFile,
      updateFile,
      renameFolder,
      createFolder,
      setIsLoading,
      isLoading,
      dragging,
    } = filesStore;

    const {
      treeFolders,
      setTreeFolders,
      isRecycleBinFolder,
      expandedKeys,
      addExpandedKeys,
    } = treeFoldersStore;

    const { type, extension, id } = filesStore.fileActionStore;

    const fileAction = { type, extension, id };

    const canWebEdit = docserviceStore.canWebEdit(item.fileExst);
    const isVideo = mediaViewersFormatsStore.isVideo(item.fileExst);
    const isImage = iconFormatsStore.isImage(item.fileExst);
    const isSound = iconFormatsStore.isSound(item.fileExst);

    return {
      culture,
      homepage: config.homepage,
      fileAction,
      folders,
      rootFolderId: selectedFolderStore.pathParts,
      selectedFolderId: selectedFolderStore.id,
      selectedFolderPathParts: selectedFolderStore.pathParts,
      newItems: selectedFolderStore.new,
      parentFolder: selectedFolderStore.parentId,
      isLoading,
      treeFolders,
      isTrashFolder: isRecycleBinFolder,
      filter,
      dragging,
      canWebEdit,
      isVideo,
      isImage,
      isSound,
      newRowItems,
      expandedKeys,

      setIsLoading,
      fetchFiles,
      setTreeFolders,
      createFile,
      createFolder,
      updateFile,
      renameFolder,
      addExpandedKeys,
    };
  }
)(withRouter(withTranslation("Home")(observer(FilesTileContent))));
