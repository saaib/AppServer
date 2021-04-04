import React from "react";
import PropTypes from "prop-types";
import ErrorContainer from "@appserver/common/components/ErrorContainer";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "./i18n";
const Error520 = ({ match }) => {
  const { t } = useTranslation();
  const { error } = (match && match.params) || {};

  return <ErrorContainer headerText={t("Error520Text")} bodyText={error} />;
};

Error520.propTypes = {
  match: PropTypes.object,
};

export default () => (
  <I18nextProvider i18n={i18n}>
    <Error520 />
  </I18nextProvider>
);
