/**
 * iOS PushKit (VoIP push) + CallKit — tətbiq tam bağlı olanda gələn zəng sistem zəng ekranında görünsün.
 * iOS 13+ tələbi: VoIP push gələn kimi zəng CallKit-ə DƏRHAL bildirilməlidir — bu, native AppDelegate-də olur.
 *
 * Etdikləri:
 *  1) Bridging header-ə RNCallKeep və RNVoipPushNotificationManager (Obj-C) əlavə edir
 *  2) AppDelegate.swift: `import PushKit`, açılışda VoIP qeydiyyatı, PKPushRegistryDelegate genişlənməsi
 * Push payload (backend/src/services/apns.ts): { uuid, callId, callerName, hasVideo }
 *
 * Söndürmək: app.json → ["./plugins/withVoipPush", { "enabled": false }]
 * Qeyd: EAS ilə iOS build-də yoxlanılmalıdır (Xcode olmadan burada kompilyasiya edilə bilməz).
 */
const { withAppDelegate, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARK = '// simo-voip';

function withBridgingHeader(config) {
  return withDangerousMod(config, ['ios', async (cfg) => {
    const dir = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName);
    const header = fs.readdirSync(dir).find((f) => f.endsWith('-Bridging-Header.h'));
    if (!header) return cfg;
    const p = path.join(dir, header);
    let src = fs.readFileSync(p, 'utf8');
    if (!src.includes('RNCallKeep.h')) {
      src += '\n#import <RNCallKeep/RNCallKeep.h>\n#import <RNVoipPushNotification/RNVoipPushNotificationManager.h>\n';
      fs.writeFileSync(p, src);
    }
    return cfg;
  }]);
}

function withVoipAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') return cfg;
    let src = cfg.modResults.contents;
    if (src.includes(MARK)) return cfg;
    src = src.replace(/import Expo\n/, `import Expo\nimport PushKit ${MARK}\n`);
    // Açılışda VoIP qeydiyyatı (super.application(...didFinishLaunchingWithOptions) qaytarılmazdan əvvəl)
    src = src.replace(
      /(\n\s*)return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
      `$1RNVoipPushNotificationManager.voipRegistration() ${MARK}$1return super.application(application, didFinishLaunchingWithOptions: launchOptions)`,
    );
    src += `
${MARK}: PushKit — gələn zəng tətbiq bağlı olanda da CallKit ekranında görünür
extension AppDelegate: PKPushRegistryDelegate {
  public func pushRegistry(_ registry: PKPushRegistry, didUpdate credentials: PKPushCredentials, for type: PKPushType) {
    RNVoipPushNotificationManager.didUpdate(credentials, forType: type.rawValue)
  }

  public func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {}

  public func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    let d = payload.dictionaryPayload
    let uuid = (d["uuid"] as? String) ?? UUID().uuidString
    let name = (d["callerName"] as? String) ?? "Simo"
    let hasVideo = (d["hasVideo"] as? Bool) ?? false
    RNVoipPushNotificationManager.addCompletionHandler(uuid, completionHandler: completion)
    RNVoipPushNotificationManager.didReceiveIncomingPush(with: payload, forType: type.rawValue)
    RNCallKeep.reportNewIncomingCall(uuid, handle: name, handleType: "generic", hasVideo: hasVideo, localizedCallerName: name, supportsHolding: false, supportsDTMF: false, supportsGrouping: false, supportsUngrouping: false, fromPushKit: true, payload: d, withCompletionHandler: nil)
  }
}
`;
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withVoipPush(config, props = {}) {
  if (props.enabled === false) return config;
  return withVoipAppDelegate(withBridgingHeader(config));
};
