import GREWordsInterpretations from "../assets/Vocab/GREWords.json";
import TOEFLWordsInterpretations from "../assets/Vocab/TOEFLWords.json";
import CSSWordsInterpretations from "../assets/Vocab/CSSWords.json";
import HTMLWordsInterpretations from "../assets/Vocab/HTMLWords.json"

const GRE_WORDS = GREWordsInterpretations;
const TOEFL_WORDS = TOEFLWordsInterpretations;
const CSS_WORDS = CSSWordsInterpretations;
const HTML_WORDS = HTMLWordsInterpretations;

const GRE_WORDS_CATALOG = {
  a: [0, 502],
  b: [503, 742],
  c: [743, 1382],
  d: [1383, 1836],
  e: [1837, 2171],
  f: [2172, 2436],
  g: [2437, 2637],
  h: [2638, 2813],
  i: [2814, 3231],
  j: [3232, 3275],
  k: [3276, 3294],
  l: [3295, 3471],
  m: [3472, 3771],
  n: [3772, 3858],
  o: [3859, 4021],
  p: [4022, 4576],
  q: [4577, 4605],
  r: [4606, 4954],
  s: [4955, 5584],
  t: [5585, 5834],
  u: [5835, 5959],
  v: [5960, 6095],
  w: [6096, 6176],
  x: [6177, 6178],
  y: [6179, 6186],
  z: [6187, 6192],
};

const TOEFL_WORDS_CATALOG = {
  a: [0, 288],
  b: [289, 414],
  c: [415, 741],
  d: [742, 998],
  e: [999, 1209],
  f: [1210, 1342],
  g: [1343, 1427],
  h: [1428, 1507],
  i: [1508, 1727],
  j: [1728, 1743],
  k: [1744, 1748],
  l: [1749, 1812],
  m: [1813, 1909],
  n: [1910, 1943],
  o: [1944, 2004],
  p: [2005, 2183],
  q: [2184, 2194],
  r: [2195, 2350],
  s: [2351, 2627],
  t: [2628, 2738],
  u: [2739, 2772],
  v: [2773, 2829],
  w: [2830, 2860],
  x: [4508, 4508],
  y: [2861, 2864],
  z: [4513, 4515],
};

const CSS_WORDS_CATALOG = {
  a: [0, 15],
  b: [16, 47],
  c: [48, 57],
  d: [58],
  f: [59, 72]
};

const HTML_WORDS_CATALOG = {
  a: [0, 6],
  b: [7, 14],
  c: [15, 20],
  d: [21, 30],
  e: [31, 32],
  f: [33, 37],
  h: [38, 47],
  i: [48, 52],
  k: [53],
  l: [54, 57],
  m: [58, 62],
  n: [63, 64],
  o: [65, 69],
  p: [70, 75],
  q: [76],
  r: [77, 79],
  s: [80, 93],
  t: [94, 105],
  u: [106, 107],
  v: [108, 109],
  w: [110]
};

const DICTIONARY_SOURCE_CATALOG = {
  // GRE: GRE_WORDS_CATALOG,
  // TOEFL: TOEFL_WORDS_CATALOG,
  CSS: CSS_WORDS_CATALOG,
  HTML: HTML_WORDS_CATALOG
};

const VOCAB_DICTIONARIES = {
  // GRE: GRE_WORDS,
  // TOEFL: TOEFL_WORDS,
  CSS: CSS_WORDS,
  HTML: HTML_WORDS
};

const VOCAB_ORDER_OPTIONS = ["random", "alphabet"];

export {
  GRE_WORDS,
  GRE_WORDS_CATALOG,
  DICTIONARY_SOURCE_CATALOG,
  VOCAB_ORDER_OPTIONS,
  VOCAB_DICTIONARIES,
};
