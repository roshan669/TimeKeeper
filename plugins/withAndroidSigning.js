const {
  withAppBuildGradle,
  withGradleProperties,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withAndroidSigning = (config, props) => {
  // 1. Add properties to gradle.properties
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) =>
        ![
          "MYAPP_UPLOAD_STORE_FILE",
          "MYAPP_UPLOAD_STORE_PASSWORD",
          "MYAPP_UPLOAD_KEY_ALIAS",
          "MYAPP_UPLOAD_KEY_PASSWORD",
        ].includes(item.key)
    );

    config.modResults.push(
      {
        type: "property",
        key: "MYAPP_UPLOAD_STORE_FILE",
        value: props.storeFile,
      },
      {
        type: "property",
        key: "MYAPP_UPLOAD_STORE_PASSWORD",
        value: props.storePassword,
      },
      {
        type: "property",
        key: "MYAPP_UPLOAD_KEY_ALIAS",
        value: props.keyAlias,
      },
      {
        type: "property",
        key: "MYAPP_UPLOAD_KEY_PASSWORD",
        value: props.keyPassword,
      }
    );
    return config;
  });

  // 2. Update android/app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents = addSigningConfig(config.modResults.contents);
    }
    return config;
  });

  // 3. Copy keystore file to android/app/
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const source = path.join(config.modRequest.projectRoot, props.storeFile);
      const destination = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        props.storeFile
      );

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
      } else {
        console.warn(
          `Warning: Keystore file not found at ${source}. Skipping copy.`
        );
      }
      return config;
    },
  ]);

  return config;
};

function addSigningConfig(buildGradle) {
  // Add the signing config for release if not present
  if (!buildGradle.includes("signingConfigs.release")) {
    const signingConfigBlock = `
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    `;
    // Insert inside signingConfigs { ... }
    // We look for the closing brace of debug { ... } inside signingConfigs
    // Or just append to the start of signingConfigs
    buildGradle = buildGradle.replace(
      /signingConfigs\s?\{/,
      `signingConfigs {\n${signingConfigBlock}`
    );
  }

  // Update release build type to use release signing config
  // We specifically target the release block
  const releaseBlockRegex = /buildTypes\s?\{[\s\S]*?release\s?\{[\s\S]*?\}/;
  const match = buildGradle.match(releaseBlockRegex);

  if (match) {
    const releaseBlock = match[0];
    if (releaseBlock.includes("signingConfig signingConfigs.debug")) {
      const newReleaseBlock = releaseBlock.replace(
        "signingConfig signingConfigs.debug",
        "signingConfig signingConfigs.release"
      );
      buildGradle = buildGradle.replace(releaseBlock, newReleaseBlock);
    }
  }

  return buildGradle;
}

module.exports = withAndroidSigning;
