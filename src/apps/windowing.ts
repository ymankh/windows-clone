export const toAppInstanceId = (appId: string, instanceKey: string) =>
  `${appId}:${instanceKey.replace(/\s+/g, "-").toLowerCase()}`;
