import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// 1. Initialize Admin SDK for Emulator
initializeApp({
  projectId: "nebulanet-production",
});

const db = getFirestore();
const auth = getAuth();

async function seedData() {
  console.log("Starting Seeding...");

  // 2. Define Dummy Users
  const user1Email = "test1@nebulanet.com";
  const user1Id = "test-user-1";
  const user2Email = "test2@nebulanet.com";
  const user2Id = "test-user-2";

  // 3. Create Users in Auth Emulator
  await auth.createUser({
    uid: user1Id,
    email: user1Email,
    password: "password123",
    emailVerified: true,
  });

  await auth.createUser({
    uid: user2Id,
    email: user2Email,
    password: "password123",
    emailVerified: true,
  });

  // 4. Create Firestore Profiles
  await db.collection("profiles").doc(user1Id).set({
    username: "testuser1",
    username_lc: "testuser1",
    full_name: "Test User One",
    follower_count: 0,
    following_count: 0,
    created_at: new Date(),
  });

  await db.collection("profiles").doc(user2Id).set({
    username: "testuser2",
    username_lc: "testuser2",
    full_name: "Test User Two",
    follower_count: 0,
    following_count: 0,
    created_at: new Date(),
  });

  // 5. Simulate User 1 following User 2
  await db.collection("follows").add({
    follower_id: user1Id,
    following_id: user2Id,
    created_at: FieldValue.serverTimestamp(),
  });

  // 6. Update Counts (Denormalization for performance)
  await db
    .collection("profiles")
    .doc(user1Id)
    .update({
      following_count: FieldValue.increment(1),
    });

  await db
    .collection("profiles")
    .doc(user2Id)
    .update({
      follower_count: FieldValue.increment(1),
    });

  console.log("Seeding Complete! Auth, Firestore, and Follows populated.");
}

seedData();
