import { useState, useEffect, useRef } from "react";
import { ThemeProvider } from "styled-components";
import { defaultTheme, themesOptions } from "./typingtest/style/theme";
import { GlobalStyles } from "./typingtest/style/global";
import TypeBox from "./typingtest/components/features/TypeBox/TypeBox";

import Logo from "./typingtest/components/common/Logo";

import SentenceBox from "./typingtest/components/features/SentenceBox/SentenceBox";
import MusicPlayerSnackbar from "./typingtest/components/features/MusicPlayer/MusicPlayerSnackbar";
import FooterMenu from "./typingtest/components/common/FooterMenu";
import FreeTypingBox from "./typingtest/components/features/FreeTypingBox";
import { GAME_MODE, GAME_MODE_DEFAULT, GAME_MODE_SENTENCE } from "./typingtest/constants/Constants";
import useLocalPersistState from "./typingtest/hooks/useLocalPersistState";
import DefaultKeyboard from "./typingtest/components/features/Keyboard/DefaultKeyboard";
import WordsCard from "./typingtest/components/features/WordsCard/WordsCard";
import { SOUND_MODE, soundOptions, DEFAULT_SOUND_TYPE, DEFAULT_SOUND_TYPE_KEY } from "./typingtest/components/features/sound/sound";
import DynamicBackground from "./typingtest/components/common/DynamicBackground";

function TypingTrainer() {
  // localStorage persist theme setting
  const [theme, setTheme] = useState(() => {
    const stickyTheme = window.localStorage.getItem("theme");

    if (!stickyTheme) return defaultTheme;

    try {
      const localTheme = JSON.parse(stickyTheme);

      const foundTheme = themesOptions.find((e) => e.label === localTheme?.label);

      return foundTheme ? foundTheme.value : defaultTheme;
    } catch (error) {
      console.error("Invalid theme in localStorage:", error);
      localStorage.removeItem("theme");
      return defaultTheme;
    }
  });

  // local persist game mode setting
  const [soundMode, setSoundMode] = useLocalPersistState(false, SOUND_MODE);

  const [soundType, setSoundType] = useLocalPersistState(DEFAULT_SOUND_TYPE, DEFAULT_SOUND_TYPE_KEY);

  // local persist game mode setting
  const [gameMode, setGameMode] = useLocalPersistState(GAME_MODE_DEFAULT, GAME_MODE);

  const handleGameModeChange = (currGameMode) => {
    setGameMode(currGameMode);
  };

  // localStorage persist focusedMode setting
  const [isFocusedMode, setIsFocusedMode] = useState(localStorage.getItem("focused-mode") === "true");

  // musicMode setting
  const [isMusicMode, setIsMusicMode] = useState(false);

  // ultraZenMode setting
  const [isUltraZenMode, setIsUltraZenMode] = useState(localStorage.getItem("ultra-zen-mode") === "true");

  // coffeeMode setting
  const [isCoffeeMode, setIsCoffeeMode] = useState(false);

  // trainer mode setting
  const [isTrainerMode, setIsTrainerMode] = useState(false);

  // words card mode
  const [isWordsCardMode, setIsWordsCardMode] = useLocalPersistState(false, "IsInWordsCardMode");

  const isWordGameMode = gameMode === GAME_MODE_DEFAULT && !isCoffeeMode && !isTrainerMode && !isWordsCardMode;
  const isSentenceGameMode = gameMode === GAME_MODE_SENTENCE && !isCoffeeMode && !isTrainerMode && !isWordsCardMode;

  const handleThemeChange = (e) => {
    window.localStorage.setItem("theme", JSON.stringify(e.value));
    setTheme(e.value);
  };

  const handleSoundTypeChange = (e) => {
    setSoundType(e.label);
  };

  const toggleFocusedMode = () => {
    setIsFocusedMode(!isFocusedMode);
  };

  const toggleSoundMode = () => {
    setSoundMode(!soundMode);
  };

  const toggleMusicMode = () => {
    setIsMusicMode(!isMusicMode);
  };

  const toggleUltraZenMode = () => {
    setIsUltraZenMode(!isUltraZenMode);
  };

  const toggleCoffeeMode = () => {
    setIsCoffeeMode(!isCoffeeMode);
    setIsTrainerMode(false);
    setIsWordsCardMode(false);
  };

  const toggleTrainerMode = () => {
    setIsTrainerMode(!isTrainerMode);
    setIsCoffeeMode(false);
    setIsWordsCardMode(false);
  };

  const toggleWordsCardMode = () => {
    setIsTrainerMode(false);
    setIsCoffeeMode(false);
    setIsWordsCardMode(!isWordsCardMode);
  };

  useEffect(() => {
    localStorage.setItem("focused-mode", isFocusedMode);
  }, [isFocusedMode]);

  useEffect(() => {
    localStorage.setItem("ultra-zen-mode", isUltraZenMode);
  }, [isUltraZenMode]);

  const textInputRef = useRef(null);
  const focusTextInput = () => {
    textInputRef.current && textInputRef.current.focus();
  };

  const textAreaRef = useRef(null);
  const focusTextArea = () => {
    textAreaRef.current && textAreaRef.current.focus();
  };

  const sentenceInputRef = useRef(null);
  const focusSentenceInput = () => {
    sentenceInputRef.current && sentenceInputRef.current.focus();
  };

  useEffect(() => {
    if (isWordGameMode) {
      focusTextInput();
      return;
    }
    if (isSentenceGameMode) {
      focusSentenceInput();
      return;
    }
    if (isCoffeeMode) {
      focusTextArea();
      return;
    }
    return;
  }, [theme, isFocusedMode, isMusicMode, isCoffeeMode, isWordGameMode, isSentenceGameMode, soundMode, soundType]);

  return (
    <ThemeProvider theme={theme}>
      <>
        <DynamicBackground theme={theme}></DynamicBackground>
        <div className="canvas">
          <GlobalStyles />
          <Logo isFocusedMode={isFocusedMode} isMusicMode={isMusicMode}></Logo>
          {isWordGameMode && <TypeBox isUltraZenMode={isUltraZenMode} textInputRef={textInputRef} isFocusedMode={isFocusedMode} soundMode={soundMode} theme={theme} soundType={soundType} key="type-box" handleInputFocus={() => focusTextInput()}></TypeBox>}
          {isSentenceGameMode && <SentenceBox sentenceInputRef={sentenceInputRef} isFocusedMode={isFocusedMode} soundMode={soundMode} soundType={soundType} key="sentence-box" handleInputFocus={() => focusSentenceInput()}></SentenceBox>}
          {isCoffeeMode && !isTrainerMode && !isWordsCardMode && <FreeTypingBox textAreaRef={textAreaRef} soundMode={soundMode} soundType={soundType} />}
          {isTrainerMode && !isCoffeeMode && !isWordsCardMode && <DefaultKeyboard soundMode={soundMode} soundType={soundType}></DefaultKeyboard>}
          {isWordsCardMode && !isCoffeeMode && !isTrainerMode && <WordsCard soundMode={soundMode} soundType={soundType}></WordsCard>}
          <div className="bottomBar">
            <FooterMenu isWordGameMode={isWordGameMode} themesOptions={themesOptions} theme={theme} soundMode={soundMode} toggleSoundMode={toggleSoundMode} soundOptions={soundOptions} soundType={soundType} toggleUltraZenMode={toggleUltraZenMode} handleSoundTypeChange={handleSoundTypeChange} handleThemeChange={handleThemeChange} toggleFocusedMode={toggleFocusedMode} toggleMusicMode={toggleMusicMode} toggleCoffeeMode={toggleCoffeeMode} isCoffeeMode={isCoffeeMode} isMusicMode={isMusicMode} isUltraZenMode={isUltraZenMode} isFocusedMode={isFocusedMode} gameMode={gameMode} handleGameModeChange={handleGameModeChange} isTrainerMode={isTrainerMode} toggleTrainerMode={toggleTrainerMode} isWordsCardMode={isWordsCardMode} toggleWordsCardMode={toggleWordsCardMode}></FooterMenu>
          </div>
          <MusicPlayerSnackbar isMusicMode={isMusicMode} isFocusedMode={isFocusedMode} onMouseLeave={() => focusTextInput()}></MusicPlayerSnackbar>
        </div>
      </>
    </ThemeProvider>
  );
}

export default TypingTrainer;
