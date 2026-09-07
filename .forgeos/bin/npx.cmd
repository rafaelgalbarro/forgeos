@echo off
setlocal
set "PATH=C:\Users\RafaelGalbarroBarba\AppData\Local\cursor\resources\app\resources\helpers;%PATH%"
if /I "%~1"=="next" (
  call "C:\Users\RafaelGalbarroBarba\Projects\ForgeOS_App_Factory\ForgeOS_App_Factory_v0_1\node_modules\.bin\next.cmd" %2 %3 %4 %5 %6 %7 %8 %9
  exit /b %ERRORLEVEL%
)
echo Unsupported npx shim args: %*
exit /b 1
