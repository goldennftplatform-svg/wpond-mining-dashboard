@echo off
echo Starting wPOND Mining Tracker Daily Update...
echo Date: %date% Time: %time%

cd /d "C:\Users\nick\Desktop\CALLinSOL"

echo Running incremental update...
node schedule-updates.js update

echo Daily update completed.
pause 