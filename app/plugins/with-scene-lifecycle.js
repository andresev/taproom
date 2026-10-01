/**
 * Adopts the UIKit scene-based life cycle, which the iOS 27 SDK (Xcode 27)
 * requires: without it the app aborts at launch with "UIScene life cycle is
 * required for apps built with this SDK".
 *
 * Expo SDK 57's native template still creates its window in AppDelegate. SDK 58
 * ships this in the template itself — delete this plugin (and its entry in
 * app.json) when upgrading.
 */
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE = `
// @generated with-scene-lifecycle
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate
    else { return }

    // A cold start from a deep link arrives here rather than in AppDelegate's launchOptions.
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    appDelegate.reactNativeFactory?.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
  }

  // Linking API
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  // Universal Links
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

// The window + startReactNative block the SDK 57 template puts in didFinishLaunching.
const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?launchOptions: launchOptions\)\s*#endif\n/;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });

  return withAppDelegate(config, (config) => {
    let src = config.modResults.contents;
    if (src.includes('@generated with-scene-lifecycle')) return config;
    if (!WINDOW_BLOCK.test(src)) {
      throw new Error(
        'with-scene-lifecycle: AppDelegate.swift no longer matches the SDK 57 template; this plugin is probably obsolete.'
      );
    }
    src = src.replace(
      WINDOW_BLOCK,
      '    // The window is created and React Native is started by SceneDelegate.\n'
    );
    config.modResults.contents = src + SCENE_DELEGATE;
    return config;
  });
};
