# Implementation Plan - Fix Gradle Sync Error (Corrupted Cache)

The project is failing to sync due to a corrupted Gradle cache, specifically related to the Instrumentation Analysis (`instrumentation-hierarchy.bin` missing or unreadable). This is a common issue with Gradle 9.5 and newer versions of the Android Gradle Plugin (AGP) when a previous build was interrupted or when there is a mismatch in cached transformations.

## User Review Required

> [!IMPORTANT]
> This fix requires stopping all Gradle daemons. Any ongoing Gradle tasks will be interrupted.
> If the automated fix fails, you may need to manually delete the `.gradle` folder and restart Android Studio to release file locks.

## Proposed Changes

### Build System Cleanup

The strategy is to force Gradle to re-generate its cache by stopping all daemons and removing corrupted local/global cache artifacts.

1. **Stop Gradle Daemons:** Run `./gradlew --stop` to ensure no processes are locking the cache files.
2. **Clean Project-Local Cache:** Delete the `.gradle` directory in the project root.
3. **Trigger Re-Sync:** Perform a fresh Gradle sync.

## Verification Plan

### Automated Tests
- Run `./gradlew clean` to ensure the build lifecycle can initialize.
- Trigger an IDE Gradle Sync.

### Manual Verification
- Verify that the error `Could not deserialize analysis from a file` no longer appears in the Build output.
- Check if the project structure is correctly resolved in Android Studio.
