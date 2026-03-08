#!/bin/bash

# 1. Kill any existing emulator processes
echo "Stopping existing emulators..."
firebase emulators:stop

# 2. Start Emulators in the background
echo "Starting Emulators..."
firebase emulators:start --only auth,firestore,functions &

# 3. Wait for emulators to fully boot (crucial)
echo "Waiting for emulators to boot..."
sleep 15

# 4. Run the seed script
echo "Seeding data..."
npx ts-node seed.ts

# 5. Start Expo app
echo "Starting Expo..."
npx expo start --dev-client