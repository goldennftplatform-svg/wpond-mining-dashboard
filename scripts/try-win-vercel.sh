#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/PreSafu/Desktop/MDB
# Use Windows vercel.cmd without popping a new PowerShell window
cmd.exe /c "vercel whoami" || true
# Try deploy from staged public via windows vercel
STAGE_WIN='C:\Users\PreSafu\AppData\Local\Temp\wpond-dash-deploy'
rm -rf /mnt/c/Users/PreSafu/AppData/Local/Temp/wpond-dash-deploy
mkdir -p /mnt/c/Users/PreSafu/AppData/Local/Temp/wpond-dash-deploy
cp -a dashboard/public/. /mnt/c/Users/PreSafu/AppData/Local/Temp/wpond-dash-deploy/
mkdir -p /mnt/c/Users/PreSafu/AppData/Local/Temp/wpond-dash-deploy/.vercel
cp .vercel/project.json /mnt/c/Users/PreSafu/AppData/Local/Temp/wpond-dash-deploy/.vercel/
cmd.exe /c "cd /d C:\Users\PreSafu\AppData\Local\Temp\wpond-dash-deploy && vercel deploy --prod --yes"
