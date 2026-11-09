# NUKRON Custom NSIS Setup Wizard Integration
# Coordinates the native WPF Optical Glass Setup Wizard (build/NukronSetupUI.exe)
# with the electron-builder NSIS installation lifecycle while preserving
# silent (/S) installs, uninstallers, and electron-updater in-app updates.

!ifndef BUILD_UNINSTALLER
  Var /GLOBAL nukronCustomUiActive
!endif

!macro customInit
  !ifndef BUILD_UNINSTALLER
    ${If} ${Silent}
      StrCpy $nukronCustomUiActive "0"
    ${Else}
      StrCpy $nukronCustomUiActive "1"
      InitPluginsDir

      # Extract the NUKRON Optical Glass Setup Wizard binary into $PLUGINSDIR
      File "/oname=$PLUGINSDIR\NukronSetupUI.exe" "${PROJECT_DIR}\build\NukronSetupUI.exe"

      # Populate initial telemetry and defaults for the wizard
      WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "DefaultDir" "$INSTDIR"
      WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "Version" "${VERSION}"
      WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "ProductName" "${PRODUCT_NAME}"
      WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "AppFilename" "${APP_FILENAME}"
      WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "AppExe" "${APP_EXECUTABLE_FILENAME}"
      WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "AppDataDir" "$APPDATA\${APP_FILENAME}"

      SectionGetSize ${INSTALL_SECTION_ID} $0
      WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "EstimatedSizeKB" "$0"

      StrCpy $1 "0"
      !ifndef INSTALL_MODE_PER_ALL_USERS
        ${If} $hasPerUserInstallation == "1"
          StrCpy $1 "1"
        ${EndIf}
        ${If} $hasPerMachineInstallation == "1"
          StrCpy $1 "1"
        ${EndIf}
      !endif
      ${If} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
        StrCpy $1 "1"
      ${EndIf}
      WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "IsUpgrade" "$1"

      ReadRegStr $2 SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" DisplayVersion
      WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "ExistingVersion" "$2"

      ReadRegStr $3 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" NoDesktopShortcut
      ${If} $3 == "true"
        WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "DesktopShortcutDefault" "0"
      ${Else}
        WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "DesktopShortcutDefault" "1"
      ${EndIf}

      ReadRegStr $4 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.${PRODUCT_NAME}"
      ${If} $4 != ""
        WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "LaunchAtStartupDefault" "1"
      ${Else}
        WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "LaunchAtStartupDefault" "0"
      ${EndIf}

      System::Call 'kernel32::GetCurrentProcessId() i .r5'
      WriteINIStr "$PLUGINSDIR\ui-init.ini" "Init" "ParentPid" "$5"

      # Launch the branded NUKRON Setup Wizard (Steps 1 -> 2 -> 3)
      Exec '"$PLUGINSDIR\NukronSetupUI.exe" "$PLUGINSDIR"'

      # Wait until the user clicks "Install NUKRON" on Step 3 (or cancels)
      ${Do}
        ${If} ${FileExists} "$PLUGINSDIR\ui-start.flag"
          ${Break}
        ${EndIf}
        ${If} ${FileExists} "$PLUGINSDIR\ui-cancel.flag"
          Quit
        ${EndIf}
        Sleep 80
      ${Loop}

      # Apply user-selected installation directory and switch NSIS engine to background mode
      # so Section "install" runs while NukronSetupUI.exe displays Step 4 (Progress Screen).
      ReadINIStr $0 "$PLUGINSDIR\ui-choice.ini" "Setup" "InstallDir"
      ${If} $0 != ""
        StrCpy $INSTDIR "$0"
      ${EndIf}

      SetSilent silent
    ${EndIf}
  !endif
!macroend

!macro customInstall
  !ifndef BUILD_UNINSTALLER
    ${If} $nukronCustomUiActive == "1"
      # 1. Apply Desktop Shortcut preference from Step 3
      ReadINIStr $0 "$PLUGINSDIR\ui-choice.ini" "Setup" "DesktopShortcut"
      ${If} $0 == "0"
        Delete "$newDesktopLink"
        Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
        WriteRegStr SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" NoDesktopShortcut "true"
      ${ElseIf} $0 == "1"
        DeleteRegValue SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" NoDesktopShortcut
        ${IfNot} ${FileExists} "$newDesktopLink"
          CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
          ClearErrors
          WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
        ${EndIf}
      ${EndIf}

      # 2. Apply Start Menu Shortcut preference from Step 3
      ReadINIStr $0 "$PLUGINSDIR\ui-choice.ini" "Setup" "StartMenuShortcut"
      ${If} $0 == "0"
        Delete "$newStartMenuLink"
        !ifdef MENU_FILENAME
          RMDir "$SMPROGRAMS\${MENU_FILENAME}"
        !endif
      ${EndIf}

      # 3. Apply Launch at Windows Startup preference from Step 3
      ReadINIStr $0 "$PLUGINSDIR\ui-choice.ini" "Setup" "LaunchAtStartup"
      ${If} $0 == "1"
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.${PRODUCT_NAME}" '"$appExe" "--hidden"'
      ${ElseIf} $0 == "0"
        DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.${PRODUCT_NAME}"
      ${EndIf}

      # Refresh Windows shell icons
      System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'

      # Signal NukronSetupUI.exe that installation is 100% complete -> transitions to Step 5
      FileOpen $0 "$PLUGINSDIR\ui-done.flag" w
      FileWrite $0 "DONE"
      FileClose $0

      # Wait for user to finish Step 5 (Completion Screen)
      ${Do}
        ${If} ${FileExists} "$PLUGINSDIR\ui-exit.flag"
          ${Break}
        ${EndIf}
        ${If} ${FileExists} "$PLUGINSDIR\ui-cancel.flag"
          ${Break}
        ${EndIf}
        Sleep 80
      ${Loop}

      ReadINIStr $0 "$PLUGINSDIR\ui-exit.ini" "Result" "LaunchApp"
      Sleep 250

      ${If} $0 == "1"
        ${StdUtils.ExecShellAsUser} $1 "$appExe" "open" ""
      ${EndIf}
    ${EndIf}
  !endif
!macroend

