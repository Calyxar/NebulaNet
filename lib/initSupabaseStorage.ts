// /lib/initSupabaseStorage.ts
import { supabase } from "./supabase";

export const initializeStorageBuckets = async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const existingBuckets = buckets?.map((b) => b.name) || [];

    const requiredBuckets = [
      {
        name: "chat-media",
        public: true,
        allowedMimeTypes: ["image/*", "video/*"],
      },
      { name: "voice-messages", public: true, allowedMimeTypes: ["audio/*"] },
      { name: "documents", public: true, allowedMimeTypes: ["*/*"] },
    ];

    for (const bucket of requiredBuckets) {
      if (!existingBuckets.includes(bucket.name)) {
        await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          allowedMimeTypes: bucket.allowedMimeTypes,
          fileSizeLimit: 52428800, // 50MB
        });
        console.log(`✅ Created bucket: ${bucket.name}`);
      }
    }

    console.log("✅ Storage buckets initialized");
  } catch (error) {
    console.error("❌ Error initializing storage buckets:", error);
  }
};

// Call this in your app initialization
// initializeStorageBuckets();
