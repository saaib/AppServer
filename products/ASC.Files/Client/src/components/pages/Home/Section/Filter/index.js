import React from "react";
import find from "lodash/find";
import result from "lodash/result";
import { withTranslation } from "react-i18next";
import { withRouter } from "react-router";
import { FilterType } from "@appserver/common/constants";
import Loaders from "@appserver/common/components/Loaders";
import FilterInput from "@appserver/common/components/FilterInput";
import { withLayoutSize } from "@appserver/common/utils";
//import equal from "fast-deep-equal/react";
import { isMobileOnly } from "react-device-detect";
import { inject, observer } from "mobx-react";

const getFilterType = (filterValues) => {
  const filterType = result(
    find(filterValues, (value) => {
      return value.group === "filter-filterType";
    }),
    "key"
  );

  return filterType ? +filterType : null;
};

const getAuthorType = (filterValues) => {
  const authorType = result(
    find(filterValues, (value) => {
      return value.group === "filter-author";
    }),
    "key"
  );

  return authorType ? authorType : null;
};

const getSelectedItem = (filterValues, type) => {
  const selectedItem = filterValues.find((item) => item.key === type);
  return selectedItem || null;
};

const getSearchParams = (filterValues) => {
  const searchParams = result(
    find(filterValues, (value) => {
      return value.group === "filter-folders";
    }),
    "key"
  );

  return searchParams || "true";
};

class SectionFilterContent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isReady: false,
    };
  }

  onFilter = (data) => {
    const { setIsLoading, filter, selectedFolderId, fetchFiles } = this.props;

    const filterType = getFilterType(data.filterValues) || null;
    const search = data.inputValue || "";
    const sortBy = data.sortId;
    const sortOrder =
      data.sortDirection === "desc" ? "descending" : "ascending";
    const authorType = getAuthorType(data.filterValues);
    const withSubfolders = getSearchParams(data.filterValues);

    const selectedItem = authorType
      ? getSelectedItem(data.filterValues, authorType)
      : null;
    const selectedFilterItem = {};
    if (selectedItem) {
      selectedFilterItem.key = selectedItem.selectedItem.key;
      selectedFilterItem.label = selectedItem.selectedItem.label;
      selectedFilterItem.type = selectedItem.typeSelector;
    }

    const newFilter = filter.clone();
    newFilter.page = 0;
    newFilter.sortBy = sortBy;
    newFilter.sortOrder = sortOrder;
    newFilter.filterType = filterType;
    newFilter.search = search;
    newFilter.authorType = authorType;
    newFilter.withSubfolders = withSubfolders;
    newFilter.selectedItem = selectedFilterItem;

    setIsLoading(true);
    fetchFiles(selectedFolderId, newFilter).finally(() => setIsLoading(false));
  };

  onChangeViewAs = (view) => {
    this.props.setViewAs(view);
  };

  getData = () => {
    const { t, customNames, user, filter } = this.props;
    const { selectedItem } = filter;
    const { usersCaption, groupsCaption } = customNames;

    const options = [
      {
        key: "filter-filterType",
        group: "filter-filterType",
        label: t("Type"),
        isHeader: true,
      },
      {
        key: FilterType.FoldersOnly.toString(),
        group: "filter-filterType",
        label: t("Folders"),
      },
      {
        key: FilterType.DocumentsOnly.toString(),
        group: "filter-filterType",
        label: t("Documents"),
      },
      {
        key: FilterType.PresentationsOnly.toString(),
        group: "filter-filterType",
        label: t("Presentations"),
      },
      {
        key: FilterType.SpreadsheetsOnly.toString(),
        group: "filter-filterType",
        label: t("Spreadsheets"),
      },
      {
        key: FilterType.ImagesOnly.toString(),
        group: "filter-filterType",
        label: t("Images"),
      },
      {
        key: FilterType.MediaOnly.toString(),
        group: "filter-filterType",
        label: t("Media"),
      },
      {
        key: FilterType.ArchiveOnly.toString(),
        group: "filter-filterType",
        label: t("Archives"),
      },
      {
        key: FilterType.FilesOnly.toString(),
        group: "filter-filterType",
        label: t("AllFiles"),
      },
    ];

    const filterOptions = [
      ...options,
      {
        key: "filter-author",
        group: "filter-author",
        label: t("Author"),
        isHeader: true,
      },
      {
        key: "user",
        group: "filter-author",
        label: usersCaption,
        isSelector: true,
        defaultOptionLabel: t("DefaultOptionLabel"),
        defaultSelectLabel: t("LblSelect"),
        groupsCaption,
        defaultOption: user,
        selectedItem,
      },
      {
        key: "group",
        group: "filter-author",
        label: groupsCaption,
        defaultSelectLabel: t("LblSelect"),
        isSelector: true,
        selectedItem,
      },
      {
        key: "filter-folders",
        group: "filter-folders",
        label: t("Folders"),
        isHeader: true,
      },
      {
        key: "false",
        group: "filter-folders",
        label: t("NoSubfolders"),
      },
    ];

    //console.log("getData (filterOptions)", filterOptions);

    return filterOptions;
  };

  getSortData = () => {
    const { t } = this.props;

    const commonOptions = [
      { key: "DateAndTime", label: t("ByLastModifiedDate"), default: true },
      { key: "DateAndTimeCreation", label: t("ByCreationDate"), default: true },
      { key: "AZ", label: t("ByTitle"), default: true },
      { key: "Type", label: t("ByType"), default: true },
      { key: "Size", label: t("BySize"), default: true },
      { key: "Author", label: t("ByAuthor"), default: true },
    ];

    const viewSettings = [
      { key: "row", label: t("ViewList"), isSetting: true, default: true },
      { key: "tile", label: t("ViewTiles"), isSetting: true, default: true },
    ];
    //TODO: Need use mobile detect for better result
    return window.innerWidth < 460
      ? [...commonOptions, ...viewSettings]
      : commonOptions;
  };

  getSelectedFilterData = () => {
    const { filter } = this.props;
    const selectedFilterData = {
      filterValues: [],
      sortDirection: filter.sortOrder === "ascending" ? "asc" : "desc",
      sortId: filter.sortBy,
    };

    selectedFilterData.inputValue = filter.search;

    if (filter.filterType >= 0) {
      selectedFilterData.filterValues.push({
        key: `${filter.filterType}`,
        group: "filter-filterType",
      });
    }

    if (filter.authorType) {
      selectedFilterData.filterValues.push({
        key: `${filter.authorType}`,
        group: "filter-author",
      });
    }

    if (filter.withSubfolders === "false") {
      selectedFilterData.filterValues.push({
        key: filter.withSubfolders,
        group: "filter-folders",
      });
    }

    // if (filter.group) {
    //   selectedFilterData.filterValues.push({
    //     key: filter.group,
    //     group: "filter-group"
    //   });
    // }

    return selectedFilterData;
  };

  isTranslationsLoaded = () => {
    const { t, i18n } = this.props;

    const { store, services, language } = i18n;

    let translationIsLoaded = false;
    try {
      translationIsLoaded = store.hasResourceBundle(
        services.languageUtils.getLanguagePartFromCode(language),
        "Home"
      );
    } catch {
      translationIsLoaded = t("UserStatus") !== "UserStatus";
    }

    return translationIsLoaded;
  };

  render() {
    //console.log("Filter render");
    const selectedFilterData = this.getSelectedFilterData();
    const { t, firstLoad, sectionWidth } = this.props;
    const filterColumnCount =
      window.innerWidth < 500 ? {} : { filterColumnCount: 3 };

    return firstLoad && !this.isTranslationsLoaded() ? (
      <Loaders.Filter />
    ) : (
      <FilterInput
        sectionWidth={sectionWidth}
        getFilterData={this.getData}
        getSortData={this.getSortData}
        selectedFilterData={selectedFilterData}
        onFilter={this.onFilter}
        onChangeViewAs={this.onChangeViewAs}
        viewAs={false} // TODO: include viewSelector after adding method getThumbnail - this.props.viewAs
        directionAscLabel={t("DirectionAscLabel")}
        directionDescLabel={t("DirectionDescLabel")}
        placeholder={t("Search")}
        isReady={this.state.isReady}
        {...filterColumnCount}
        contextMenuHeader={t("AddFilter")}
        isMobile={isMobileOnly}
      />
    );
  }
}

export default inject(({ auth, filesStore, selectedFolderStore }) => {
  const {
    firstLoad,
    fetchFiles,
    filter,
    setIsLoading,
    setViewAs,
    viewAs,
  } = filesStore;

  const { user } = auth.userStore;
  const { customNames, culture } = auth.settingsStore;

  return {
    customNames,
    user,
    firstLoad,
    selectedFolderId: selectedFolderStore.id,
    selectedItem: filter.selectedItem,
    filter,
    viewAs,

    setIsLoading,
    fetchFiles,
    setViewAs,
  };
})(
  withRouter(
    withLayoutSize(withTranslation("Home")(observer(SectionFilterContent)))
  )
);
