const NAVER_MAPS_SDK_URL =
  "https://oapi.map.naver.com/openapi/v3/maps.js";
const NAVER_MAPS_SCRIPT_ID = "naver-maps-sdk";
const NAVER_MAPS_SCRIPT_STATE = "naverMapsState";

export const NAVER_MAP_AUTH_FAILURE_EVENT =
  "sinwol-safety-map:naver-auth-failure";

let sdkPromise: Promise<void> | null = null;
let authFailureError: Error | null = null;

function isNaverMapsReady(): boolean {
  return typeof naver !== "undefined" && typeof naver.maps.Map === "function";
}

function createSdkError(message: string): Error {
  return new Error(message);
}

function installAuthFailureHandler(): void {
  window.navermap_authFailure = () => {
    authFailureError = createSdkError(
      "NAVER Maps authentication failed. Check the key and Web Service URL configuration.",
    );
    window.dispatchEvent(new Event(NAVER_MAP_AUTH_FAILURE_EVENT));
  };
}

export function getNaverMapAuthFailureError(): Error | null {
  return authFailureError;
}

export function loadNaverMaps(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(
      createSdkError("NAVER Maps SDK can only be loaded in a browser."),
    );
  }

  const keyId = process.env.NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID?.trim();

  if (keyId === undefined || keyId.length === 0) {
    return Promise.reject(
      createSdkError("NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID is not configured."),
    );
  }

  installAuthFailureHandler();

  if (authFailureError !== null) {
    return Promise.reject(authFailureError);
  }

  if (isNaverMapsReady()) {
    return Promise.resolve();
  }

  if (sdkPromise !== null) {
    return sdkPromise;
  }

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(
      NAVER_MAPS_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");

    const cleanupListeners = () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
      window.removeEventListener(
        NAVER_MAP_AUTH_FAILURE_EVENT,
        handleAuthFailure,
      );
    };

    const fail = (error: Error) => {
      cleanupListeners();
      script.dataset[NAVER_MAPS_SCRIPT_STATE] = "error";
      reject(error);
    };

    const handleLoad = () => {
      if (authFailureError !== null) {
        fail(authFailureError);
        return;
      }

      if (!isNaverMapsReady()) {
        fail(createSdkError("NAVER Maps SDK loaded without the Maps API."));
        return;
      }

      cleanupListeners();
      script.dataset[NAVER_MAPS_SCRIPT_STATE] = "loaded";
      resolve();
    };

    const handleError = () => {
      fail(createSdkError("NAVER Maps SDK failed to load."));
    };

    const handleAuthFailure = () => {
      fail(
        authFailureError ??
          createSdkError("NAVER Maps authentication failed."),
      );
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    window.addEventListener(
      NAVER_MAP_AUTH_FAILURE_EVENT,
      handleAuthFailure,
      { once: true },
    );

    if (existingScript !== null) {
      const state = existingScript.dataset[NAVER_MAPS_SCRIPT_STATE];

      if (state === "loaded") {
        queueMicrotask(handleLoad);
      } else if (state === "error") {
        queueMicrotask(handleError);
      }

      return;
    }

    script.id = NAVER_MAPS_SCRIPT_ID;
    script.async = true;
    script.src = `${NAVER_MAPS_SDK_URL}?ncpKeyId=${encodeURIComponent(keyId)}`;
    document.head.append(script);
  });

  return sdkPromise;
}
