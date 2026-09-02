@echo off
set "NODE=C:\Users\RafaelGalbarroBarba\AppData\Local\cursor\resources\app\resources\helpers\node.exe"
set "ROOT=C:\Users\RafaelGalbarroBarba\Projects\ForgeOS_App_Factory\ForgeOS_App_Factory_v0_1"
if /I "%~1"=="run" if /I "%~2"=="investment:dev" (
  "%NODE%" "%ROOT%\scripts\investment-dev.js"
  exit /b %ERRORLEVEL%
)
echo Unsupported npm shim: %*
exit /b 1
