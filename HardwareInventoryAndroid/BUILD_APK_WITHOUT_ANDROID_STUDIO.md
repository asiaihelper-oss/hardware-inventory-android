# BUILD THE APK WITHOUT ANDROID STUDIO

You can generate the APK online using GitHub Actions.

## 1. Create a GitHub account

Go to GitHub and create a free account if you do not have one.

## 2. Create a repository

1. Click **New repository**.
2. Repository name: `hardware-inventory-android`
3. Choose **Private** if this is for company use.
4. Click **Create repository**.

## 3. Upload the project

1. Extract this ZIP file.
2. Open the extracted `HardwareInventoryAndroid` folder.
3. In your GitHub repository, click **uploading an existing file**.
4. Drag all files and folders from inside `HardwareInventoryAndroid`.
5. Commit the files.

Important: The `.github` folder may be hidden in Windows. Make sure it is included when uploading.

## 4. Build the APK

1. Open the repository's **Actions** tab.
2. Select **Build Android APK**.
3. Click **Run workflow**.
4. Wait for the build to finish.
5. Open the completed workflow.
6. Under **Artifacts**, download `Hardware-Inventory-APK`.
7. Extract the downloaded ZIP.
8. Install `app-debug.apk` on your Android phone.

## Install on Android

1. Transfer `app-debug.apk` to your phone.
2. Open the file.
3. Allow installation from the browser or file manager when prompted.
4. Tap **Install**.

## Current storage behavior

The application works offline and stores records on the Android device. Export CSV backups regularly because clearing the app's data or uninstalling it can remove local records.
