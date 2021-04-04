import React from "react";
//import PropTypes from "prop-types";
import { withRouter } from "react-router";
import { isMobile } from "react-device-detect";
import axios from "axios";
import toastr from "studio/toastr";
import PageLayout from "@appserver/common/components/PageLayout";
import { showLoader, hideLoader } from "@appserver/common/utils";
import FilesFilter from "@appserver/common/api/files/filter";
import { getGroup } from "@appserver/common/api/groups";
import { getUserById } from "@appserver/common/api/people";
import { withTranslation, Trans } from "react-i18next";
import {
  ArticleBodyContent,
  ArticleHeaderContent,
  ArticleMainButtonContent,
} from "../../Article";
import {
  SectionBodyContent,
  SectionFilterContent,
  SectionHeaderContent,
  SectionPagingContent,
} from "./Section";

import { ConvertDialog } from "../../dialogs";
import MediaViewer from "./MediaViewer";
import DragTooltip from "../../DragTooltip";
import { observer, inject } from "mobx-react";
import config from "../../../../package.json";

class PureHome extends React.Component {
  componentDidMount() {
    const { fetchFiles, homepage, setIsLoading, setFirstLoad } = this.props;

    const reg = new RegExp(`${homepage}((/?)$|/filter)`, "gm"); //TODO: Always find?
    const match = window.location.pathname.match(reg);
    let filterObj = null;

    if (match && match.length > 0) {
      filterObj = FilesFilter.getFilter(window.location);

      if (!filterObj) {
        filterObj = FilesFilter.getDefault();
        const folderId = filterObj.folder;
        setIsLoading(true);
        fetchFiles(folderId, filterObj).finally(() => {
          setIsLoading(false);
          setFirstLoad(false);
        });

        return;
      }
    }

    if (!filterObj) return;

    let dataObj = { filter: filterObj };

    if (filterObj && filterObj.authorType) {
      const authorType = filterObj.authorType;
      const indexOfUnderscore = authorType.indexOf("_");
      const type = authorType.slice(0, indexOfUnderscore);
      const itemId = authorType.slice(indexOfUnderscore + 1);

      if (itemId) {
        dataObj = {
          type,
          itemId,
          filter: filterObj,
        };
      } else {
        filterObj.authorType = null;
        dataObj = { filter: filterObj };
      }
    }

    if (!dataObj) return;

    const { filter, itemId, type } = dataObj;
    const newFilter = filter ? filter.clone() : FilesFilter.getDefault();
    const requests = [Promise.resolve(newFilter)];

    if (type === "group") {
      requests.push(getGroup(itemId));
    } else if (type === "user") {
      requests.push(getUserById(itemId));
    }

    setIsLoading(true);

    axios
      .all(requests)
      .catch((err) => {
        Promise.resolve(FilesFilter.getDefault());
        console.warn("Filter restored by default", err);
      })
      .then((data) => {
        const filter = data[0];
        const result = data[1];
        if (result) {
          const type = result.displayName ? "user" : "group";
          const selectedItem = {
            key: result.id,
            label: type === "user" ? result.displayName : result.name,
            type,
          };
          filter.selectedItem = selectedItem;
        }

        if (filter) {
          const folderId = filter.folder;
          //console.log("filter", filter);
          return fetchFiles(folderId, filter);
        }

        return Promise.resolve();
      })
      .finally(() => {
        setIsLoading(false);
        setFirstLoad(false);
      });
  }

  onDrop = (files, uploadToFolder) => {
    const {
      t,
      currentFolderId,
      startUpload,
      setDragging,
      dragging,
    } = this.props;
    const folderId = uploadToFolder ? uploadToFolder : currentFolderId;

    dragging && setDragging(false);
    startUpload(files, folderId, t);
  };

  showOperationToast = (type, qty, title) => {
    switch (type) {
      case "move":
        if (qty > 1) {
          return toastr.success(
            <Trans i18nKey="MoveItems" ns="Home">
              {{ qty }} elements has been moved
            </Trans>
          );
        }
        return toastr.success(
          <Trans i18nKey="MoveItem" ns="Home">
            {{ title }} moved
          </Trans>
        );
      case "duplicate":
        if (qty > 1) {
          return toastr.success(
            <Trans i18nKey="CopyItems" ns="Home">
              {{ qty }} elements copied
            </Trans>
          );
        }
        return toastr.success(
          <Trans i18nKey="CopyItem" ns="Home">
            {{ title }} copied
          </Trans>
        );
      default:
        break;
    }
  };

  showUploadPanel = () => {
    this.props.setUploadPanelVisible(!this.props.uploadPanelVisible);
  };
  componentDidUpdate(prevProps) {
    const {
      isLoading,
      isProgressFinished,
      secondaryProgressDataStoreIcon,
      selectionLength,
      selectionTitle,
    } = this.props;
    if (isLoading !== prevProps.isLoading) {
      if (isLoading) {
        showLoader();
      } else {
        hideLoader();
      }
    }
    if (this.props.isHeaderVisible !== prevProps.isHeaderVisible) {
      this.props.setHeaderVisible(this.props.isHeaderVisible);
    }
    if (
      isProgressFinished &&
      isProgressFinished !== prevProps.isProgressFinished
    ) {
      this.showOperationToast(
        secondaryProgressDataStoreIcon,
        selectionLength,
        selectionTitle
      );
    }
  }

  render() {
    //console.log("Home render");
    const {
      viewAs,
      convertDialogVisible,
      fileActionId,
      firstLoad,
      isHeaderVisible,

      primaryProgressDataVisible,
      primaryProgressDataPercent,
      primaryProgressDataIcon,
      primaryProgressDataAlert,

      secondaryProgressDataStoreVisible,
      secondaryProgressDataStorePercent,
      secondaryProgressDataStoreIcon,
      secondaryProgressDataStoreAlert,

      isLoading,
    } = this.props;

    return (
      <>
        {convertDialogVisible && (
          <ConvertDialog visible={convertDialogVisible} />
        )}

        <MediaViewer />
        <DragTooltip />
        <PageLayout
          withBodyScroll
          withBodyAutoFocus={!isMobile}
          uploadFiles
          onDrop={this.onDrop}
          setSelections={this.props.setSelections}
          onMouseMove={this.onMouseMove}
          showPrimaryProgressBar={primaryProgressDataVisible}
          primaryProgressBarValue={primaryProgressDataPercent}
          primaryProgressBarIcon={primaryProgressDataIcon}
          showPrimaryButtonAlert={primaryProgressDataAlert}
          showSecondaryProgressBar={secondaryProgressDataStoreVisible}
          secondaryProgressBarValue={secondaryProgressDataStorePercent}
          secondaryProgressBarIcon={secondaryProgressDataStoreIcon}
          showSecondaryButtonAlert={secondaryProgressDataStoreAlert}
          viewAs={viewAs}
          hideAside={
            !!fileActionId ||
            primaryProgressDataVisible ||
            secondaryProgressDataStoreVisible
          }
          isLoaded={!firstLoad}
          isHeaderVisible={isHeaderVisible}
          onOpenUploadPanel={this.showUploadPanel}
          isLoading={isLoading}
        >
          <PageLayout.ArticleHeader>
            <ArticleHeaderContent />
          </PageLayout.ArticleHeader>

          <PageLayout.ArticleMainButton>
            <ArticleMainButtonContent />
          </PageLayout.ArticleMainButton>

          <PageLayout.ArticleBody>
            <ArticleBodyContent onTreeDrop={this.onDrop} />
          </PageLayout.ArticleBody>
          <PageLayout.SectionHeader>
            <SectionHeaderContent />
          </PageLayout.SectionHeader>

          <PageLayout.SectionFilter>
            <SectionFilterContent />
          </PageLayout.SectionFilter>

          <PageLayout.SectionBody>
            <SectionBodyContent />
          </PageLayout.SectionBody>

          <PageLayout.SectionPaging>
            <SectionPagingContent />
          </PageLayout.SectionPaging>
        </PageLayout>
      </>
    );
  }
}

const Home = withTranslation("Home")(PureHome);

export default inject(
  ({
    auth,
    filesStore,
    uploadDataStore,
    dialogsStore,
    selectedFolderStore,
  }) => {
    const {
      secondaryProgressDataStore,
      primaryProgressDataStore,
    } = uploadDataStore;
    const {
      firstLoad,
      setFirstLoad,
      fetchFiles,
      filter,
      fileActionStore,
      selection,
      setSelections,
      dragging,
      setDragging,
      setIsLoading,
      isLoading,
      viewAs,
    } = filesStore;

    const { id } = fileActionStore;

    const {
      visible: primaryProgressDataVisible,
      percent: primaryProgressDataPercent,
      icon: primaryProgressDataIcon,
      alert: primaryProgressDataAlert,
    } = primaryProgressDataStore;

    const {
      visible: secondaryProgressDataStoreVisible,
      percent: secondaryProgressDataStorePercent,
      icon: secondaryProgressDataStoreIcon,
      alert: secondaryProgressDataStoreAlert,
      isSecondaryProgressFinished: isProgressFinished,
    } = secondaryProgressDataStore;

    const { convertDialogVisible } = dialogsStore;

    const { setUploadPanelVisible, startUpload } = uploadDataStore;

    const selectionLength = isProgressFinished ? selection.length : null;
    const selectionTitle = isProgressFinished
      ? filesStore.selectionTitle
      : null;

    return {
      homepage: config.homepage,
      firstLoad,
      dragging,
      fileActionId: id,
      currentFolderId: selectedFolderStore.id,
      isLoading,
      filter,
      viewAs,

      primaryProgressDataVisible,
      primaryProgressDataPercent,
      primaryProgressDataIcon,
      primaryProgressDataAlert,

      secondaryProgressDataStoreVisible,
      secondaryProgressDataStorePercent,
      secondaryProgressDataStoreIcon,
      secondaryProgressDataStoreAlert,

      convertDialogVisible,
      selectionLength,
      isProgressFinished,
      selectionTitle,

      setFirstLoad,
      setDragging,
      setIsLoading,
      fetchFiles,
      setUploadPanelVisible,
      setSelections,
      startUpload,
      isHeaderVisible: auth.settingsStore.isHeaderVisible,
      setHeaderVisible: auth.settingsStore.setHeaderVisible,
    };
  }
)(withRouter(observer(Home)));
