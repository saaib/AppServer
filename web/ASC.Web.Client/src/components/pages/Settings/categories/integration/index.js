import React, { lazy, Suspense } from "react";
import { Route, Switch } from "react-router-dom";
import { withRouter } from "react-router";
import Loader from "@appserver/components/loader";
import { combineUrl } from "@appserver/common/utils";
import AppServerConfig from "@appserver/common/constants/AppServerConfig";

const ThirdPartyServices = lazy(() => import("./thirdPartyServicesSettings"));

const PROXY_BASE_URL = combineUrl(
  AppServerConfig.proxyURL,
  "/settings/integration"
);

const Integration = ({ match }) => {
  return (
    <Suspense
      fallback={<Loader className="pageLoader" type="rombs" size="40px" />}
    >
      <Switch>
        <Route
          exact
          path={[
            combineUrl(PROXY_BASE_URL, "/third-party-services"),
            combineUrl(AppServerConfig.proxyURL, "/integration"),
            match.path,
          ]}
          component={ThirdPartyServices}
        />
      </Switch>
    </Suspense>
  );
};

export default withRouter(Integration);
