# 1. Kill any existing emulator processes to prevent port conflicts
Write-Host "Stopping existing emulators..." -ForegroundColor Yellow
taskkill /F /IM java.exe /T 2>$null

# 2. Get local IP address (Windows)
$ip = (Test-Connection -ComputerName $env:computername -Count 1).IPV4Address.IPAddressToString
Write-Host "Computer IP Address: $ip" -ForegroundColor Cyan

# 3. Start Emulators in the background
Write-Host "Starting Emulators..." -ForegroundColor Green
Start-Process -FilePath "firebase" -ArgumentList "emulators:start" -NoNewWindow

# 4. Wait for emulators to boot
Write-Host "Waiting for emulators to boot..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 5. Run the seed script
Write-Host "Seeding data..." -ForegroundColor Green
npx ts-node seed.ts

# 6. Start Expo app
Write-Host "Starting Expo..." -ForegroundColor Green
npx expo start --dev-client