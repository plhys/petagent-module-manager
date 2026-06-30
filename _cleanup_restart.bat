@echo off
ping 127.0.0.1 -n 3 >nul
rmdir /s /q "d:\aicodework\hermes-offline\petagnet\dist-v2\win-unpacked" 2>nul
del "%~f0" 2>nul