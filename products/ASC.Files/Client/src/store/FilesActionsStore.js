import { makeAutoObservable } from "mobx";

import {
  removeFiles,
  getProgress,
  copyToFolder,
  deleteFile,
  deleteFolder,
  moveToFolder,
  finalizeVersion,
  lockFile,
  downloadFiles,
  markAsRead,
} from "@appserver/common/api/files";
import { FileAction } from "@appserver/common/constants";
import { TIMEOUT } from "../helpers/constants";
import { loopTreeFolders } from "../helpers/files-helpers";

class FilesActionStore {
  authStore;
  uploadDataStore;
  treeFoldersStore;
  filesStore;
  selectedFolderStore;
  settingsStore;
  dialogsStore;

  constructor(
    authStore,
    uploadDataStore,
    treeFoldersStore,
    filesStore,
    selectedFolderStore,
    settingsStore,
    dialogsStore
  ) {
    makeAutoObservable(this);
    this.authStore = authStore;
    this.uploadDataStore = uploadDataStore;
    this.treeFoldersStore = treeFoldersStore;
    this.filesStore = filesStore;
    this.selectedFolderStore = selectedFolderStore;
    this.settingsStore = settingsStore;
    this.dialogsStore = dialogsStore;
  }

  deleteAction = (translations) => {
    const { isRecycleBinFolder, isPrivacyFolder } = this.treeFoldersStore;
    const { selection } = this.filesStore;
    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;

    const deleteAfter = true; //Delete after finished TODO: get from settings
    const immediately = isRecycleBinFolder || isPrivacyFolder ? true : false; //Don't move to the Recycle Bin

    const folderIds = [];
    const fileIds = [];

    let i = 0;
    while (selection.length !== i) {
      if (selection[i].fileExst) {
        fileIds.push(selection[i].id);
      } else {
        folderIds.push(selection[i].id);
      }
      i++;
    }

    if (folderIds.length || fileIds.length) {
      setSecondaryProgressBarData({
        icon: "trash",
        visible: true,
        label: translations.deleteOperation,
        percent: 0,
        alert: false,
      });

      return removeFiles(folderIds, fileIds, deleteAfter, immediately)
        .then((res) => {
          const id = res[0] && res[0].id ? res[0].id : null;
          this.loopDeleteOperation(id, translations);
        })
        .catch((err) => {
          setSecondaryProgressBarData({
            visible: true,
            alert: true,
          });
          setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
        });
    }
  };

  loopDeleteOperation = (id, translations) => {
    const { filter, fetchFiles } = this.filesStore;
    const { isRecycleBinFolder, setTreeFolders } = this.treeFoldersStore;
    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;

    const successMessage = isRecycleBinFolder
      ? translations.deleteFromTrash
      : translations.deleteSelectedElem;

    getProgress()
      .then((res) => {
        const currentProcess = res.find((x) => x.id === id);
        if (currentProcess && currentProcess.progress !== 100) {
          setSecondaryProgressBarData({
            icon: "trash",
            percent: currentProcess.progress,
            label: translations.deleteOperation,
            visible: true,
            alert: false,
          });
          setTimeout(() => this.loopDeleteOperation(id, translations), 1000);
        } else {
          setSecondaryProgressBarData({
            icon: "trash",
            percent: 100,
            label: translations.deleteOperation,
            visible: true,
            alert: false,
          });
          setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
          fetchFiles(this.selectedFolderStore.id, filter).then((data) => {
            if (!isRecycleBinFolder) {
              const path = data.selectedFolder.pathParts.slice(0);
              const newTreeFolders = this.treeFoldersStore.treeFolders;
              const folders = data.selectedFolder.folders;
              const foldersCount = data.selectedFolder.foldersCount;
              loopTreeFolders(path, newTreeFolders, folders, foldersCount);
              setTreeFolders(newTreeFolders);
            }
          });
        }
      })
      .catch((err) => {
        setSecondaryProgressBarData({
          visible: true,
          alert: true,
        });
        setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
      });
  };

  getDownloadProgress = (data, label) => {
    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;
    const url = data.url;

    return getProgress()
      .then((res) => {
        const currentItem = res.find((x) => x.id === data.id);
        if (!url) {
          setSecondaryProgressBarData({
            icon: "file",
            visible: true,
            percent: currentItem.progress,
            label,
            alert: false,
          });
          setTimeout(() => this.getDownloadProgress(currentItem, label), 1000);
        } else {
          setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
          return (window.location.href = url);
        }
      })
      .catch((err) => {
        setSecondaryProgressBarData({
          visible: true,
          alert: true,
        });
        setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
      });
  };

  downloadAction = (label) => {
    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;
    const { selection } = this.filesStore;
    const fileIds = [];
    const folderIds = [];
    const items = [];

    if (selection.length === 1 && selection[0].fileExst) {
      window.open(selection[0].viewUrl, "_blank");
      return Promise.resolve();
    }

    for (let item of selection) {
      if (item.fileExst) {
        fileIds.push(item.id);
        items.push({ id: item.id, fileExst: item.fileExst });
      } else {
        folderIds.push(item.id);
        items.push({ id: item.id });
      }
    }

    setSecondaryProgressBarData({
      icon: "file",
      visible: true,
      percent: 0,
      label,
      alert: false,
    });

    return downloadFiles(fileIds, folderIds)
      .then((res) => {
        this.getDownloadProgress(res[0], label);
      })
      .catch((err) => {
        setSecondaryProgressBarData({
          visible: true,
          alert: true,
        });
        setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
      });
  };

  editCompleteAction = (id, selectedItem) => {
    const {
      filter,
      folders,
      files,
      fileActionStore,
      fetchFiles,
      setIsLoading,
    } = this.filesStore;
    const { type, setAction } = fileActionStore;
    const { treeFolders, setTreeFolders } = this.treeFoldersStore;

    const items = [...folders, ...files];
    const item = items.find((o) => o.id === id && !o.fileExst); //TODO: maybe need files find and folders find, not at one function?
    if (type === FileAction.Create || type === FileAction.Rename) {
      setIsLoading(true);
      fetchFiles(this.selectedFolderStore.id, filter)
        .then((data) => {
          const newItem = (item && item.id) === -1 ? null : item; //TODO: not add new folders?
          if (!selectedItem.fileExst) {
            const path = data.selectedFolder.pathParts;
            const newTreeFolders = treeFolders;
            const folders = data.selectedFolder.folders;
            loopTreeFolders(path, newTreeFolders, folders, null, newItem);
            setTreeFolders(newTreeFolders);
          }
        })
        .finally(() => {
          setAction({ type: null, id: null, extension: null });
          setIsLoading(false);
          type === FileAction.Rename && this.onSelectItem(selectedItem);
        });
    }
  };

  onSelectItem = (item) => {
    const { setSelection, selected, setSelected } = this.filesStore;
    selected === "close" && setSelected("none");
    setSelection([item]);
  };

  copyToAction = (
    destFolderId,
    folderIds,
    fileIds,
    conflictResolveType,
    deleteAfter
  ) => {
    const { loopFilesOperations } = this.uploadDataStore;
    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;

    return copyToFolder(
      destFolderId,
      folderIds,
      fileIds,
      conflictResolveType,
      deleteAfter
    )
      .then((res) => {
        const id = res[0] && res[0].id ? res[0].id : null;
        loopFilesOperations(id, destFolderId, true);
      })
      .catch((err) => {
        setSecondaryProgressBarData({
          visible: true,
          alert: true,
        });
        //toastr.error(err);
        setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
      });
  };

  moveToAction = (
    destFolderId,
    folderIds,
    fileIds,
    conflictResolveType,
    deleteAfter
  ) => {
    const { loopFilesOperations } = this.uploadDataStore;
    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;

    return moveToFolder(
      destFolderId,
      folderIds,
      fileIds,
      conflictResolveType,
      deleteAfter
    )
      .then((res) => {
        const id = res[0] && res[0].id ? res[0].id : null;
        loopFilesOperations(id, destFolderId, false);
      })
      .catch((err) => {
        setSecondaryProgressBarData({
          visible: true,
          alert: true,
        });
        //toastr.error(err);
        setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
      });
  };

  deleteFileAction = (fileId, currentFolderId, translations) => {
    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;

    setSecondaryProgressBarData({
      icon: "trash",
      visible: true,
      percent: 0,
      label: translations.deleteOperation,
      alert: false,
    });
    return deleteFile(fileId)
      .then((res) => {
        const id = res[0] && res[0].id ? res[0].id : null;
        this.loopDeleteProgress(id, currentFolderId, false, translations);
      })
      .catch((err) => {
        setSecondaryProgressBarData({
          visible: true,
          alert: true,
        });
        setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
      });
  };

  deleteFolderAction = (folderId, currentFolderId, translations) => {
    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;

    setSecondaryProgressBarData({
      icon: "trash",
      visible: true,
      percent: 0,
      label: translations.deleteOperation,
      alert: false,
    });
    return deleteFolder(folderId, currentFolderId)
      .then((res) => {
        const id = res[0] && res[0].id ? res[0].id : null;
        this.loopDeleteProgress(id, currentFolderId, true, translations);
      })
      .catch((err) => {
        setSecondaryProgressBarData({
          visible: true,
          alert: true,
        });
        setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
      });
  };

  loopDeleteProgress = (id, folderId, isFolder, translations) => {
    const { filter, fetchFiles } = this.filesStore;
    const {
      treeFolders,
      isRecycleBinFolder,
      setTreeFolders,
    } = this.treeFoldersStore;
    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;

    getProgress().then((res) => {
      const deleteProgress = res.find((x) => x.id === id);
      if (deleteProgress && deleteProgress.progress !== 100) {
        setSecondaryProgressBarData({
          icon: "trash",
          visible: true,
          percent: deleteProgress.progress,
          label: translations.deleteOperation,
          alert: false,
        });
        setTimeout(
          () => this.loopDeleteProgress(id, folderId, isFolder, translations),
          1000
        );
      } else {
        setSecondaryProgressBarData({
          icon: "trash",
          visible: true,
          percent: 100,
          label: translations.deleteOperation,
          alert: false,
        });
        fetchFiles(folderId, filter)
          .then((data) => {
            if (!isRecycleBinFolder && isFolder) {
              const path = data.selectedFolder.pathParts.slice(0);
              const newTreeFolders = treeFolders;
              const folders = data.selectedFolder.folders;
              const foldersCount = data.selectedFolder.foldersCount;
              loopTreeFolders(path, newTreeFolders, folders, foldersCount);
              setTreeFolders(newTreeFolders);
            }
          })
          .catch((err) => {
            setSecondaryProgressBarData({
              visible: true,
              alert: true,
            });
            setTimeout(() => clearSecondaryProgressData(), TIMEOUT);
          })
          .finally(() =>
            setTimeout(() => clearSecondaryProgressData(), TIMEOUT)
          );
      }
    });
  };

  lockFileAction = (id, locked) => {
    const { setFile } = this.filesStore;
    return lockFile(id, locked).then((res) => setFile(res));
  };

  finalizeVersionAction = (id) => {
    const { fetchFiles, setIsLoading } = this.filesStore;

    setIsLoading(true);

    return finalizeVersion(id, 0, false)
      .then(() => {
        fetchFiles(this.selectedFolderStore.id, this.filesStore.filter);
      })
      .finally(() => setIsLoading(false));
  };

  duplicateAction = (item, label) => {
    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;

    const folderIds = [];
    const fileIds = [];
    item.fileExst ? fileIds.push(item.id) : folderIds.push(item.id);
    const conflictResolveType = 2; //Skip = 0, Overwrite = 1, Duplicate = 2 //TODO: get from settings
    const deleteAfter = false; //TODO: get from settings

    setSecondaryProgressBarData({
      icon: "duplicate",
      visible: true,
      percent: 0,
      label,
      alert: false,
    });

    return this.copyToAction(
      this.selectedFolderStore.id,
      folderIds,
      fileIds,
      conflictResolveType,
      deleteAfter
    );
  };

  setFavoriteAction = (action, id) => {
    const {
      markItemAsFavorite,
      removeItemFromFavorite,
      fetchFavoritesFolder,
      getFileInfo,
      setSelected,
    } = this.filesStore;
    //let data = selection.map(item => item.id)
    switch (action) {
      case "mark":
        return markItemAsFavorite([id]).then(() => getFileInfo(id));

      case "remove":
        return removeItemFromFavorite([id])
          .then(() => {
            return this.treeFoldersStore.isFavoritesFolder
              ? fetchFavoritesFolder(this.selectedFolderStore.id)
              : getFileInfo(id);
          })
          .then(() => setSelected("close"));
      default:
        return;
    }
  };

  selectRowAction = (checked, file) => {
    const { selected, setSelected, selectFile, deselectFile } = this.filesStore;
    selected === "close" && setSelected("none");
    if (checked) {
      selectFile(file);
    } else {
      deselectFile(file);
    }
  };

  openLocationAction = (locationId, isFolder) => {
    const locationFilter = isFolder ? this.filesStore.filter : null;

    return this.filesStore.fetchFiles(locationId, locationFilter).then(() =>
      //isFolder ? null : this.selectRowAction(!checked, item)
      isFolder ? null : this.selectRowAction(false, item)
    );
  };

  setThirdpartyInfo = (providerKey) => {
    const { setConnectDialogVisible, setConnectItem } = this.dialogsStore;
    const { providers, capabilities } = this.settingsStore.thirdPartyStore;
    const provider = providers.find((x) => x.provider_key === providerKey);
    const capabilityItem = capabilities.find((x) => x[0] === providerKey);
    const capability = {
      title: capabilityItem ? capabilityItem[0] : provider.customer_title,
      link: capabilityItem ? capabilityItem[1] : " ",
    };

    setConnectDialogVisible(true);
    setConnectItem({ ...provider, ...capability });
  };

  markAsRead = (folderIds, fileId) => {
    return markAsRead(folderIds, fileId);
  };

  moveDragItems = (destFolderId, label) => {
    const folderIds = [];
    const fileIds = [];
    const conflictResolveType = 0; //Skip = 0, Overwrite = 1, Duplicate = 2 TODO: get from settings
    const deleteAfter = true;

    const { selection } = this.filesStore;
    const { isRootFolder } = this.selectedFolderStore;
    const { isShareFolder, isCommonFolder } = this.treeFoldersStore;
    const {
      setThirdPartyMoveDialogVisible,
      setDestFolderId,
    } = this.dialogsStore;

    const {
      setSecondaryProgressBarData,
      clearSecondaryProgressData,
    } = this.uploadDataStore.secondaryProgressDataStore;

    for (let item of selection) {
      if (item.providerKey && !isRootFolder) {
        setDestFolderId(destFolderId);
        return setThirdPartyMoveDialogVisible(true);
      }

      if (item.fileExst) {
        fileIds.push(item.id);
      } else {
        if (item.providerKey && isRootFolder) continue;
        folderIds.push(item.id);
      }
    }

    if (!folderIds.length && !fileIds.length) return;

    setSecondaryProgressBarData({
      icon: "move",
      visible: true,
      percent: 0,
      label,
      alert: false,
    });

    if (this.authStore.isAdmin) {
      if (isShareFolder) {
        this.copyToAction(
          destFolderId,
          folderIds,
          fileIds,
          conflictResolveType,
          deleteAfter
        );
      } else {
        this.moveToAction(
          destFolderId,
          folderIds,
          fileIds,
          conflictResolveType,
          deleteAfter
        );
      }
    } else {
      if (isShareFolder || isCommonFolder) {
        this.copyToAction(
          destFolderId,
          folderIds,
          fileIds,
          conflictResolveType,
          deleteAfter
        );
      } else {
        this.moveToAction(
          destFolderId,
          folderIds,
          fileIds,
          conflictResolveType,
          deleteAfter
        );
      }
    }
  };
}

export default FilesActionStore;
