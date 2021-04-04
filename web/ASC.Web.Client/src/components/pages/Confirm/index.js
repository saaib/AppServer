import React, { lazy } from "react";
import { Route, Switch } from "react-router-dom";
import ConfirmRoute from "../../../helpers/confirmRoute";

const ActivateUserForm = lazy(() => import("./sub-components/activateUser"));
const CreateUserForm = lazy(() => import("./sub-components/createUser"));
const ChangePasswordForm = lazy(() =>
  import("./sub-components/changePassword")
);
const ActivateEmailForm = lazy(() => import("./sub-components/activateEmail"));
const ChangeEmailForm = lazy(() => import("./sub-components/changeEmail"));
const ChangePhoneForm = lazy(() => import("./sub-components/changePhone"));
const ProfileRemoveForm = lazy(() => import("./sub-components/profileRemove"));
const ChangeOwnerForm = lazy(() => import("./sub-components/changeOwner"));

const Confirm = ({ match }) => {
  //console.log("Confirm render");
  return (
    <Switch>
      <ConfirmRoute
        forUnauthorized
        path={`${match.path}/LinkInvite`}
        component={CreateUserForm}
      />
      <ConfirmRoute
        forUnauthorized
        path={`${match.path}/Activation`}
        component={ActivateUserForm}
      />
      <ConfirmRoute
        exact
        path={`${match.path}/EmailActivation`}
        component={ActivateEmailForm}
      />
      <ConfirmRoute
        exact
        path={`${match.path}/EmailChange`}
        component={ChangeEmailForm}
      />
      <Route
        forUnauthorized
        path={`${match.path}/PasswordChange`}
        component={ChangePasswordForm}
      />
      <ConfirmRoute
        exact
        path={`${match.path}/ProfileRemove`}
        component={ProfileRemoveForm}
      />
      <Route
        exact
        path={`${match.path}/PhoneActivation`}
        component={ChangePhoneForm}
      />
      <ConfirmRoute
        exact
        path={`${match.path}/PortalOwnerChange`}
        component={ChangeOwnerForm}
      />
      {/* <Route component={Error404} /> */}
    </Switch>
  );
};

export default Confirm;
