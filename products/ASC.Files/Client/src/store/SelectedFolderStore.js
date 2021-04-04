import { makeObservable, action, observable, computed } from "mobx";

class SelectedFolderStore {
  folders = null;
  parentId = null;
  filesCount = null;
  foldersCount = null;
  isShareable = null;
  new = null;
  id = null;
  title = null;
  access = null;
  shared = null;
  created = null;
  createdBy = null;
  updated = null;
  updatedBy = null;
  rootFolderType = null;
  pathParts = null;
  providerItem = null;

  constructor() {
    makeObservable(this, {
      folders: observable,
      parentId: observable,
      filesCount: observable,
      foldersCount: observable,
      isShareable: observable,
      new: observable,
      id: observable,
      title: observable,
      access: observable,
      shared: observable,
      created: observable,
      createdBy: observable,
      updated: observable,
      updatedBy: observable,
      rootFolderType: observable,
      pathParts: observable,
      providerItem: observable,

      isRootFolder: computed,

      setSelectedFolder: action,
    });
  }

  get isRootFolder() {
    return this.pathParts && this.pathParts.length <= 1;
  }

  setSelectedFolder = (selectedFolder) => {
    if (!selectedFolder) {
      const newStore = new SelectedFolderStore();

      const selectedFolderItems = Object.keys(newStore);
      for (let key of selectedFolderItems) {
        if (key in this) {
          this[key] = newStore[key];
        }
      }
    } else {
      const selectedFolderItems = Object.keys(selectedFolder);

      for (let key of selectedFolderItems) {
        if (key in this) {
          this[key] = selectedFolder[key];
        }
      }
    }
  };
}

export default new SelectedFolderStore();
