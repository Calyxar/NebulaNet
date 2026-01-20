import { Audio } from "expo-av";
import { useEffect, useState } from "react";

export function useSound() {
  const [sound, setSound] = useState<Audio.Sound>();

  async function loadSound() {
    const { sound } = await Audio.Sound.createAsync(
      require("../assets/sounds/mixkit_sci_fi_click_900.wav"),
    );
    setSound(sound);
  }

  async function playSound() {
    if (sound) {
      await sound.replayAsync();
    }
  }

  useEffect(() => {
    loadSound();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]); // ESLint wants 'sound' in dependency array

  return {
    playSound,
  };
}
