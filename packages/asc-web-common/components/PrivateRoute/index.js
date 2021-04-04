/* eslint-disable react/prop-types */
import React, { useEffect } from "react";
import { Redirect, Route } from "react-router-dom";
//import Loader from "@appserver/components/loader";
import PageLayout from "../PageLayout";
// import Error401 from "studio/Error401";
// import Error404 from "studio/Error404";
import AppLoader from "../AppLoader";
import { inject, observer } from "mobx-react";
import { isMe } from "../../utils";
import combineUrl from "../../utils/combineUrl";
import { AppServerConfig } from "../../constants";

const PrivateRoute = ({ component: Component, ...rest }) => {
  const {
    isAdmin,
    isAuthenticated,
    isLoaded,
    restricted,
    allowForMe,
    user,
    computedMatch,
    setModuleInfo,
    modules,
    homepage,
    wizardCompleted,
  } = rest;

  const { userId } = computedMatch.params;

  const renderComponent = (props) => {
    if (isLoaded && !isAuthenticated) {
      console.log("PrivateRoute render Redirect to login", rest);
      return (
        <Redirect
          to={{
            pathname: combineUrl(
              AppServerConfig.proxyURL,
              wizardCompleted ? "/login" : "/wizard"
            ),
            state: { from: props.location },
          }}
        />
      );
    }

    if (!isLoaded) {
      return <AppLoader />;
    }

    // const userLoaded = !isEmpty(user);
    // if (!userLoaded) {
    //   return <Component {...props} />;
    // }

    // if (!userLoaded) {
    //   console.log("PrivateRoute render Loader", rest);
    //   return (
    //     <PageLayout>
    //       <PageLayout.SectionBody>
    //         <Loader className="pageLoader" type="rombs" size="40px" />
    //       </PageLayout.SectionBody>
    //     </PageLayout>
    //   );
    // }

    if (
      !restricted ||
      isAdmin ||
      (allowForMe && userId && isMe(user, userId))
    ) {
      // console.log(
      //   "PrivateRoute render Component",
      //   rest,
      //   Component.name || Component.displayName
      // );
      return <Component {...props} {...rest} />;
    }

    if (restricted) {
      console.log("PrivateRoute render Error401", rest);
      return (
        <Redirect
          to={{
            pathname: "/error401",
            state: { from: props.location },
          }}
        />
      );
    }

    console.log("PrivateRoute render Error404", rest);
    return (
      <Redirect
        to={{
          pathname: "/error404",
          state: { from: props.location },
        }}
      />
    );
  };

  useEffect(() => {
    const currentModule = modules.find((m) => {
      if (
        computedMatch.path !== "/" &&
        m.link.indexOf(computedMatch.path) !== -1
      ) {
        return true;
      }
    });

    if (currentModule && homepage !== computedMatch.path) {
      const { id } = currentModule;

      setModuleInfo(currentModule.origLink || currentModule.link, id);
    }
  }, [computedMatch.path]);

  //console.log("PrivateRoute render", rest);
  return <Route {...rest} render={renderComponent} />;
};

export default inject(({ auth }) => {
  const {
    userStore,
    isAuthenticated,
    isLoaded,
    isAdmin,
    settingsStore,
    moduleStore,
  } = auth;
  const { user } = userStore;
  const { setModuleInfo, homepage } = settingsStore;
  const { modules } = moduleStore;
  const { wizardCompleted } = settingsStore;

  return {
    modules,
    user,
    isAuthenticated,
    isAdmin,
    isLoaded,
    setModuleInfo,
    homepage,
    wizardCompleted,
    //getUser: store.userStore.getCurrentUser,
  };
})(observer(PrivateRoute));
