import toastr from "@appserver/components/toast/toastr";
import isEmpty from "lodash/isEmpty";
import omit from "lodash/omit";

export const desktopConstants = Object.freeze({
  domain: window.location.origin,
  provider: "AppServer",
  guid: "{FFF0E1EB-13DB-4678-B67D-FF0A41DBBCEF}",
});

export function regDesktop(
  user,
  isEncryption,
  keys,
  setEncryptionKeys,
  isEditor,
  getEncryptionAccess
) {
  const data = {
    displayName: user.displayName,
    email: user.email,
    domain: desktopConstants.domain,
    provider: desktopConstants.provider,
    userId: user.id,
  };

  let extendedData;

  if (isEncryption) {
    extendedData = {
      ...data,
      encryptionKeys: {
        cryptoEngineId: desktopConstants.guid,
      },
    };

    if (!isEmpty(keys)) {
      const filteredKeys = omit(keys, ["userId"]);
      extendedData = {
        ...extendedData,
        encryptionKeys: { ...extendedData.encryptionKeys, ...filteredKeys },
      };
    }
  } else {
    extendedData = { ...data };
  }

  window.AscDesktopEditor.execCommand(
    "portal:login",
    JSON.stringify(extendedData)
  );

  if (isEncryption) {
    window.cloudCryptoCommand = (type, params, callback) => {
      switch (type) {
        case "encryptionKeys": {
          setEncryptionKeys(params);
          break;
        }
        case "relogin": {
          toastr.info("Encryption keys must be re-entered");
          //relogin();
          break;
        }
        case "getsharingkeys":
          if (!isEditor || typeof getEncryptionAccess !== "function") {
            callback({});
            return;
          }
          getEncryptionAccess(callback);
          break;
        default:
          break;
      }
    };
  }

  window.onSystemMessage = (e) => {
    let message = e.opMessage;
    switch (e.type) {
      case "operation":
        if (!message) {
          switch (e.opType) {
            case 0:
              message = "Preparing file for encryption";
              break;
            case 1:
              message = "Encrypting file";
              break;
            default:
              message = "Loading...";
          }
        }
        toastr.info(message);
        break;
      default:
        break;
    }
  };
}

export function relogin() {
  setTimeout(() => {
    const data = {
      domain: desktopConstants.domain,
      onsuccess: "reload",
    };
    window.AscDesktopEditor.execCommand("portal:logout", JSON.stringify(data));
  }, 1000);
}

export function checkPwd() {
  const data = {
    domain: desktopConstants.domain,
    emailInput: "login",
    pwdInput: "password",
  };
  window.AscDesktopEditor.execCommand("portal:checkpwd", JSON.stringify(data));
}

export function logout() {
  const data = {
    domain: desktopConstants.domain,
  };
  window.AscDesktopEditor.execCommand("portal:logout", JSON.stringify(data));
}
