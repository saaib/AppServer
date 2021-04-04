import React from "react";
import { withTranslation } from "react-i18next";
import styled from "styled-components";
import { Trans } from "react-i18next";
import FieldContainer from "@appserver/components/field-container";
import Text from "@appserver/components/text";
import ComboBox from "@appserver/components/combobox";
import Loader from "@appserver/components/loader";
import toastr from "@appserver/components/toast/toastr";
import Link from "@appserver/components/link";
import SaveCancelButtons from "@appserver/components/save-cancel-buttons";
import { saveToSessionStorage, getFromSessionStorage } from "../../utils";
import { setDocumentTitle } from "../../../../../helpers/utils";
import { inject, observer } from "mobx-react";

const mapCulturesToArray = (cultures, t) => {
  return cultures.map((culture) => {
    return { key: culture, label: t(`Culture_${culture}`) };
  });
};

const mapTimezonesToArray = (timezones) => {
  return timezones.map((timezone) => {
    return { key: timezone.id, label: timezone.displayName };
  });
};

const findSelectedItemByKey = (items, selectedItemKey) => {
  return items.find((item) => item.key === selectedItemKey);
};

const StyledComponent = styled.div`
  .margin-top {
    margin-top: 20px;
  }

  .margin-left {
    margin-left: 20px;
  }

  .settings-block {
    margin-bottom: 70px;
  }

  .field-container-width {
    max-width: 500px;
  }

  .combo-button-label {
    max-width: 100%;
  }
`;

let languageFromSessionStorage = "";
let timezoneFromSessionStorage = "";

const settingNames = ["language", "timezone"];

class LanguageAndTimeZone extends React.Component {
  constructor(props) {
    super(props);

    const {
      portalLanguage,
      portalTimeZoneId,
      rawCultures,
      rawTimezones,
      /*organizationName,*/
      t,
    } = props;
    const languages = mapCulturesToArray(rawCultures, t);
    const timezones = mapTimezonesToArray(rawTimezones);
    const language = findSelectedItemByKey(
      languages,
      portalLanguage || languages[0]
    );
    const timezone = findSelectedItemByKey(
      timezones,
      portalTimeZoneId || timezones[0]
    );

    languageFromSessionStorage = getFromSessionStorage("language");
    timezoneFromSessionStorage = getFromSessionStorage("timezone");

    setDocumentTitle(t("Customization"));

    this.state = {
      isLoadedData: false,
      isLoading: false,
      timezones,
      timezone: timezoneFromSessionStorage || timezone,
      timezoneDefault: timezone,
      languages,
      language: languageFromSessionStorage || language,
      languageDefault: language,
      isLoadingGreetingSave: false,
      isLoadingGreetingRestore: false,
      hasChanged: false,
      showReminder: false,
    };
  }

  componentDidMount() {
    const {
      getPortalCultures,
      portalLanguage,
      portalTimeZoneId,
      t,
      getPortalTimezones,
    } = this.props;
    const { timezones, languages, isLoadedData, showReminder } = this.state;

    if (
      (languageFromSessionStorage || timezoneFromSessionStorage) &&
      !showReminder
    ) {
      this.setState({
        showReminder: true,
      });
    }

    if (!timezones.length || !languages.length) {
      let languages;
      getPortalCultures()
        .then(() => {
          languages = mapCulturesToArray(this.props.rawCultures, t);
        })
        .then(() => getPortalTimezones())
        .then(() => {
          const timezones = mapTimezonesToArray(this.props.rawTimezones);

          const language =
            languageFromSessionStorage ||
            findSelectedItemByKey(languages, portalLanguage) ||
            languages[0];
          const timezone =
            timezoneFromSessionStorage ||
            findSelectedItemByKey(timezones, portalTimeZoneId) ||
            timezones[0];

          const languageDefault =
            findSelectedItemByKey(languages, portalLanguage) || languages[0];
          const timezoneDefault =
            findSelectedItemByKey(timezones, portalTimeZoneId) || timezones[0];

          this.setState({
            languages,
            language,
            timezones,
            timezone,
            languageDefault,
            timezoneDefault,
          });

          if (!timezoneDefault) {
            this.setState({
              timezoneDefault: timezone,
            });
          }
          if (!languageDefault) {
            this.setState({
              languageDefault: language,
            });
          }
        });
    }
    if (timezones.length && languages.length && !isLoadedData) {
      this.setState({ isLoadedData: true });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      timezones,
      languages,
      timezoneDefault,
      languageDefault,
    } = this.state;
    const { i18n, language, nameSchemaId, getCurrentCustomSchema } = this.props;

    if (timezones.length && languages.length && !prevState.isLoadedData) {
      this.setState({ isLoadedData: true });
    }
    if (language !== prevProps.language) {
      i18n
        .changeLanguage(language)
        .then((t) => {
          const newLocaleLanguages = mapCulturesToArray(
            this.props.rawCultures,
            t
          );
          const newLocaleSelectedLanguage =
            findSelectedItemByKey(
              newLocaleLanguages,
              this.state.language.key
            ) || newLocaleLanguages[0];
          this.setState({
            languages: newLocaleLanguages,
            language: languageFromSessionStorage || newLocaleSelectedLanguage,
          });
        })
        //.then(() => getModules(clientStore.dispatch))
        .then(() => getCurrentCustomSchema(nameSchemaId));
    }
    if (timezoneDefault && languageDefault) {
      this.checkChanges();
    }
  }

  onLanguageSelect = (language) => {
    this.setState({ language });
    if (this.settingIsEqualInitialValue("language", language)) {
      saveToSessionStorage("language", "");
    } else {
      saveToSessionStorage("language", language);
    }
    this.checkChanges();
  };

  onTimezoneSelect = (timezone) => {
    this.setState({ timezone });
    if (this.settingIsEqualInitialValue("timezone", timezone)) {
      saveToSessionStorage("timezone", "");
    } else {
      saveToSessionStorage("timezone", timezone);
    }

    this.checkChanges();
  };

  onSaveLngTZSettings = () => {
    const { t, setLanguageAndTime, i18n } = this.props;
    const { language, timezone } = this.state;
    this.setState({ isLoading: true }, function () {
      setLanguageAndTime(language.key, timezone.key)
        .then(() => i18n.changeLanguage(language.key))
        .then(() => toastr.success(t("SuccessfullySaveSettingsMessage")))
        .catch((error) => toastr.error(error))
        .finally(() => this.setState({ isLoading: false }));
    });

    this.setState({
      showReminder: false,
      timezoneDefault: this.state.timezone,
      languageDefault: this.state.language,
    });
  };

  onCancelClick = () => {
    settingNames.forEach((settingName) => {
      const valueFromSessionStorage = getFromSessionStorage(settingName);

      if (
        valueFromSessionStorage &&
        !this.settingIsEqualInitialValue(settingName, valueFromSessionStorage)
      ) {
        const defaultValue = this.state[settingName + "Default"];

        this.setState({ [settingName]: defaultValue });
        saveToSessionStorage(settingName, "");
      }
    });

    this.setState({
      showReminder: false,
    });

    this.checkChanges();
  };

  settingIsEqualInitialValue = (settingName, value) => {
    const defaultValue = JSON.stringify(this.state[settingName + "Default"]);
    const currentValue = JSON.stringify(value);
    return defaultValue === currentValue;
  };

  checkChanges = () => {
    let hasChanged = false;

    settingNames.forEach((settingName) => {
      const valueFromSessionStorage = getFromSessionStorage(settingName);
      if (
        valueFromSessionStorage &&
        !this.settingIsEqualInitialValue(settingName, valueFromSessionStorage)
      )
        hasChanged = true;
    });

    if (hasChanged !== this.state.hasChanged) {
      this.setState({
        hasChanged: hasChanged,
      });
    }
  };

  render() {
    const { t } = this.props;
    const {
      isLoadedData,
      languages,
      language,
      isLoading,
      timezones,
      timezone,
      hasChanged,
      showReminder,
    } = this.state;
    const supportEmail = "documentation@onlyoffice.com";
    const tooltipLanguage = (
      <Text fontSize="13px">
        <Trans i18nKey="NotFoundLanguage" ns="Settings">
          "In case you cannot find your language in the list of the available
          ones, feel free to write to us at
          <Link href={`mailto:${supportEmail}`} isHovered={true}>
            {{ supportEmail }}
          </Link>{" "}
          to take part in the translation and get up to 1 year free of charge."
        </Trans>{" "}
        <Link
          isHovered={true}
          href="https://helpcenter.onlyoffice.com/ru/guides/become-translator.aspx"
        >
          {t("LearnMore")}
        </Link>
      </Text>
    );

    return !isLoadedData ? (
      <Loader className="pageLoader" type="rombs" size="40px" />
    ) : (
      <>
        <StyledComponent>
          <div className="settings-block">
            <FieldContainer
              id="fieldContainerLanguage"
              className="field-container-width"
              labelText={`${t("Language")}:`}
              tooltipContent={tooltipLanguage}
              helpButtonHeaderContent={t("Language")}
              isVertical={true}
            >
              <ComboBox
                id="comboBoxLanguage"
                options={languages}
                selectedOption={language}
                onSelect={this.onLanguageSelect}
                isDisabled={isLoading}
                noBorder={false}
                scaled={true}
                scaledOptions={true}
                dropDownMaxHeight={300}
                className="dropdown-item-width"
              />
            </FieldContainer>

            <FieldContainer
              id="fieldContainerTimezone"
              className="field-container-width"
              labelText={`${t("TimeZone")}:`}
              isVertical={true}
            >
              <ComboBox
                id="comboBoxTimezone"
                options={timezones}
                selectedOption={timezone}
                onSelect={this.onTimezoneSelect}
                isDisabled={isLoading}
                noBorder={false}
                scaled={true}
                scaledOptions={true}
                dropDownMaxHeight={300}
                className="dropdown-item-width"
              />
            </FieldContainer>
          </div>
          {hasChanged && (
            <SaveCancelButtons
              onSaveClick={this.onSaveLngTZSettings}
              onCancelClick={this.onCancelClick}
              showReminder={showReminder}
              reminderTest={t("YouHaveUnsavedChanges")}
              saveButtonLabel={t("SaveButton")}
              cancelButtonLabel={t("CancelButton")}
            />
          )}
        </StyledComponent>
      </>
    );
  }
}

export default inject(({ auth, setup }) => {
  const {
    culture,
    timezone,
    timezones,
    cultures,
    nameSchemaId,
    organizationName,
    greetingSettings,
    getPortalCultures,
    getPortalTimezones,
    getCurrentCustomSchema,
  } = auth.settingsStore;

  const { setLanguageAndTime } = setup;

  return {
    portalLanguage: culture,
    portalTimeZoneId: timezone,
    language: culture,
    rawTimezones: timezones,
    rawCultures: cultures,
    greetingSettings,
    nameSchemaId,
    organizationName,
    getPortalCultures,
    setLanguageAndTime,
    getCurrentCustomSchema,
    getPortalTimezones,
  };
})(withTranslation("Settings")(observer(LanguageAndTimeZone)));
