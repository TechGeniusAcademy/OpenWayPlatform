import { FaPlus, FaFire } from "react-icons/fa";
import { TiPlusOutline } from "react-icons/ti";
import { FaFireExtinguisher } from "react-icons/fa6";
import { BiPulse } from "react-icons/bi";
import { HiMiniSlash } from "react-icons/hi2";

const DEFAULT_WORDS_COUNT = 200;
const COUNT_DOWN_90 = 90;
const COUNT_DOWN_60 = 60;
const COUNT_DOWN_30 = 30;
const COUNT_DOWN_15 = 15;
const DEFAULT_COUNT_DOWN = COUNT_DOWN_60;

const DEFAULT_DIFFICULTY = <FaFireExtinguisher />;
const HARD_DIFFICULTY = <FaFire />;
const NUMBER_ADDON = <TiPlusOutline />;
const SYMBOL_ADDON = <FaPlus />;

const RESTART_BUTTON_TOOLTIP_TITLE = "[Tab] + [Enter] для быстрого перезапуска";
const REDO_BUTTON_TOOLTIP_TITLE = "[Tab] + [Space] для быстрого повтора";
const RESTART_BUTTON_TOOLTIP_TITLE_WORDSCARD =
  "[Tab] + [Enter] для быстрого перезапуска главы";

const SELECT_ONE_OR_MORE_CHAPTERS =
  "Откройте для выбора одной или нескольких глав. Выберите главы в зоне набора текста.";

const RECITE_MODE_TITLE = "Скрыть слово (режим диктанта)";
const VOCAB_MODE = "Обучение печати по карточкам слов (режим словаря)";
const SELECTIVE_MODE = "Выборочная практика по выбранным клавишам (режим выбора)";

const DEFAULT_DIFFICULTY_TOOLTIP_TITLE =
  "Обычный режим генерирует случайные слова из 1000 самых часто используемых слов английского языка.";

const HARD_DIFFICULTY_TOOLTIP_TITLE =
  "Сложный режим генерирует случайные слова из блогов, поэтому вы можете встретить более длинные и редко используемые слова.";

const NUMBER_ADDON_TOOLTIP_TITLE =
  "Числовой режим генерирует слова, содержащие случайные цифры.";

const SYMBOL_ADDON_TOOLTIP_TITLE =
  "В символьном режиме генерируется слово, содержащее случайный символ.";

const CHAR_TOOLTIP_TITLE =
  "правильно/неправильно/пропущено/лишнее\n лишние символы учитываются даже при удалении.";

const SENTENCE_CHAR_TOOLTIP_TITLE =
  "правильно/неправильно/лишнее\n";

const ENGLISH_MODE_TOOLTIP_TITLE = "Режим английского языка";
const CHINESE_MODE_TOOLTIP_TITLE = "Режим китайской транскрипции (пиньинь)";

const DEFAULT_DIFFICULTY_TOOLTIP_TITLE_CHINESE =
  "Обычный режим генерирует случайные слова из 5000 самых часто используемых слов китайского языка.";

const HARD_DIFFICULTY_TOOLTIP_TITLE_CHINESE =
  "Сложный режим генерирует случайные слова из 1500 самых популярных китайских идиом.";

const GITHUB_TOOLTIP_TITLE =
  "Уважаемые пользователи:\n Для предложений по функциям или сообщений об ошибках создайте issue в репозитории GitHub.\n Будем рады вашему вкладу через fork.\n Если вам нравится проект, поставьте звезду.\n Спасибо!\n";

const SUPPORT_TOOLTIP_TITLE =
  "Помогите поддерживать работу сайта своей поддержкой :)\n Буду благодарен за вашу помощь!\n";

const AUTHOR = "Автор: @Muyang Guo\n";
const GITHUB_REPO_LINK = "Проект: @Github\n";

const FOCUS_MODE = "Режим концентрации";
const ULTRA_ZEN_MODE = "Ультра-дзен режим";

const MUSIC_MODE =
  "Плеер Spotify. Для использования полного функционала необходимо сначала войти в аккаунт Spotify.";

const FREE_MODE =
  "Свободный режим набора\nПечатайте что угодно без давления — время кофе!\n";

const ENGLISH_MODE = "ENGLISH_MODE";
const CHINESE_MODE = "CHINESE_MODE";

const GAME_MODE = "GAME_MODE";
const GAME_MODE_DEFAULT = "WORD_MODE";
const GAME_MODE_SENTENCE = "SENTENCE_MODE";

const WORD_MODE_LABEL = "слова";
const SENTENCE_MODE_LABEL = "предложения";

const TRAINER_MODE = "Режим тренировки клавиатуры QWERTY";

const DEFAULT_SENTENCES_COUNT = 5;
const TEN_SENTENCES_COUNT = 10;
const FIFTEEN_SENTENCES_COUNT = 15;

const ENGLISH_SENTENCE_MODE_TOOLTIP_TITLE = "Режим английских предложений";
const CHINESE_SENTENCE_MODE_TOOLTIP_TITLE = "Режим китайских предложений";

const WORDS_CARD_MODE = "Режим карточек слов — учитесь во время печати!";

const PACING_CARET = <HiMiniSlash />;
const PACING_PULSE = <BiPulse />;

const PACING_CARET_TOOLTIP =
  'Набирайте слово с курсором "|" — символ за символом.';

const PACING_PULSE_TOOLTIP =
  'Набирайте слово с импульсом "____" — помогает улучшить WPM и выработать привычку быстрого темпа печати.';

const NUMBER_ADDON_KEY = "number";
const SYMBOL_ADDON_KEY = "symbol";

export {
  DEFAULT_WORDS_COUNT,
  DEFAULT_COUNT_DOWN,
  COUNT_DOWN_60,
  COUNT_DOWN_30,
  COUNT_DOWN_15,
  COUNT_DOWN_90,
  DEFAULT_DIFFICULTY,
  HARD_DIFFICULTY,
  NUMBER_ADDON,
  SYMBOL_ADDON,
  DEFAULT_DIFFICULTY_TOOLTIP_TITLE,
  HARD_DIFFICULTY_TOOLTIP_TITLE,
  NUMBER_ADDON_TOOLTIP_TITLE,
  SYMBOL_ADDON_TOOLTIP_TITLE,
  CHAR_TOOLTIP_TITLE,
  SENTENCE_CHAR_TOOLTIP_TITLE,
  GITHUB_TOOLTIP_TITLE,
  SUPPORT_TOOLTIP_TITLE,
  FOCUS_MODE,
  MUSIC_MODE,
  ENGLISH_MODE,
  CHINESE_MODE,
  RESTART_BUTTON_TOOLTIP_TITLE,
  REDO_BUTTON_TOOLTIP_TITLE,
  ENGLISH_MODE_TOOLTIP_TITLE,
  CHINESE_MODE_TOOLTIP_TITLE,
  DEFAULT_DIFFICULTY_TOOLTIP_TITLE_CHINESE,
  HARD_DIFFICULTY_TOOLTIP_TITLE_CHINESE,
  FREE_MODE,
  GAME_MODE,
  GAME_MODE_DEFAULT,
  GAME_MODE_SENTENCE,
  WORD_MODE_LABEL,
  SENTENCE_MODE_LABEL,
  DEFAULT_SENTENCES_COUNT,
  TEN_SENTENCES_COUNT,
  FIFTEEN_SENTENCES_COUNT,
  ENGLISH_SENTENCE_MODE_TOOLTIP_TITLE,
  CHINESE_SENTENCE_MODE_TOOLTIP_TITLE,
  AUTHOR,
  GITHUB_REPO_LINK,
  TRAINER_MODE,
  WORDS_CARD_MODE,
  RESTART_BUTTON_TOOLTIP_TITLE_WORDSCARD,
  SELECT_ONE_OR_MORE_CHAPTERS,
  RECITE_MODE_TITLE,
  PACING_CARET,
  PACING_PULSE,
  PACING_CARET_TOOLTIP,
  PACING_PULSE_TOOLTIP,
  NUMBER_ADDON_KEY,
  SYMBOL_ADDON_KEY,
  ULTRA_ZEN_MODE,
  VOCAB_MODE,
  SELECTIVE_MODE
};
