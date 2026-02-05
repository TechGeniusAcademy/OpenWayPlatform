import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './LayoutGame.module.css';
import { 
  FaArrowLeft, FaPlay, FaCheck, FaTimes, FaStar, FaLock, FaCode, 
  FaExpand, FaCompress, FaTrophy, FaRuler, FaMousePointer, FaEye, FaEyeSlash,
  FaQuestionCircle, FaBook, FaKeyboard, FaTags, FaCrosshairs, FaSitemap,
  FaClone, FaPen, FaPalette, FaBoxes, FaImage, FaAdjust, FaFont, FaRocket
} from 'react-icons/fa';
import { BsLightningChargeFill } from 'react-icons/bs';
import api from '../utils/api';
import { toast } from 'react-toastify';
import emmet from 'emmet';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';

// Rainbow цвета для отступов
const INDENT_COLORS = [
  'rgba(255, 121, 198, 0.15)',
  'rgba(139, 233, 253, 0.15)',
  'rgba(80, 250, 123, 0.15)',
  'rgba(255, 184, 108, 0.15)',
  'rgba(189, 147, 249, 0.15)',
  'rgba(255, 255, 128, 0.15)',
];

// Компонент подсветки синтаксиса
const CodeHighlight = ({ code, language }) => {
  const highlighted = useMemo(() => {
    if (!code) return '';
    try {
      const lang = language === 'html' ? 'markup' : 'css';
      return Prism.highlight(code, Prism.languages[lang], lang);
    } catch (e) {
      return code;
    }
  }, [code, language]);

  // Разбиваем на строки для rainbow отступов
  const lines = code.split('\n');
  const highlightedLines = highlighted.split('\n');

  return (
    <div className={styles.highlightOverlay}>
      {lines.map((line, i) => {
        const spaces = line.match(/^(\s*)/)?.[1] || '';
        const indentLevel = Math.floor(spaces.length / 2);
        const bgColor = indentLevel > 0 ? INDENT_COLORS[indentLevel % INDENT_COLORS.length] : 'transparent';
        
        return (
          <div 
            key={i} 
            className={styles.highlightLine}
            style={{ background: bgColor }}
          >
            <span dangerouslySetInnerHTML={{ __html: highlightedLines[i] || '&nbsp;' }} />
          </div>
        );
      })}
    </div>
  );
};

function LayoutGame({ onBack }) {
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Редактор
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Emmet подсказки
  const [emmetSuggestion, setEmmetSuggestion] = useState(null);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const [activeEditor, setActiveEditor] = useState(null); // 'html' или 'css'
  const [showEmmetHelp, setShowEmmetHelp] = useState(false);
  
  // Инспектор
  const [inspectorEnabled, setInspectorEnabled] = useState(true);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [showTargetOverlay, setShowTargetOverlay] = useState(true);
  const [altPressed, setAltPressed] = useState(false);
  
  // Refs
  const targetFrameRef = useRef(null);
  const previewFrameRef = useRef(null);
  const htmlEditorRef = useRef(null);
  const cssEditorRef = useRef(null);
  const htmlHighlightRef = useRef(null);
  const cssHighlightRef = useRef(null);

  // Синхронизация скролла редактора и подсветки
  const syncScroll = useCallback((textareaRef, highlightRef) => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Получить аббревиатуру перед курсором (улучшенная версия как в VS Code)
  const getAbbreviation = useCallback((textarea) => {
    const cursorPos = textarea.selectionStart;
    const value = textarea.value;
    
    // Находим начало аббревиатуры - останавливаемся на пробелах, переносах, <, >, {, }, ;
    let abbrevStart = cursorPos;
    const stopChars = /[\s\n<>{};\(\)]/;
    
    while (abbrevStart > 0 && !stopChars.test(value[abbrevStart - 1])) {
      abbrevStart--;
    }
    
    const abbreviation = value.slice(abbrevStart, cursorPos);
    
    // Определяем контекст для CSS - внутри селектора { } или снаружи
    const textBefore = value.slice(0, cursorPos);
    let braceDepth = 0;
    for (let i = 0; i < textBefore.length; i++) {
      if (textBefore[i] === '{') braceDepth++;
      if (textBefore[i] === '}') braceDepth--;
    }
    const insideSelector = braceDepth > 0;
    
    return {
      abbreviation,
      start: abbrevStart,
      end: cursorPos,
      insideSelector
    };
  }, []);

  // Улучшенный Emmet как в VS Code
  const tryExpandEmmet = useCallback((abbreviation, isHtml, insideSelector = false) => {
    if (!abbreviation || abbreviation.length < 1) return null;
    
    // Быстрые сниппеты для HTML (мгновенное раскрытие)
    const htmlSnippets = {
      '!': '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  |\n</body>\n</html>',
      'html:5': '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  |\n</body>\n</html>',
      'link:css': '<link rel="stylesheet" href="style.css">',
      'script:src': '<script src="|"></script>',
      'a:link': '<a href="http://|"></a>',
      'a:mail': '<a href="mailto:|"></a>',
      'input:text': '<input type="text" name="|" id="">',
      'input:password': '<input type="password" name="|" id="">',
      'input:checkbox': '<input type="checkbox" name="|" id="">',
      'input:radio': '<input type="radio" name="|" id="">',
      'input:submit': '<input type="submit" value="|">',
      'input:button': '<input type="button" value="|">',
      'input:email': '<input type="email" name="|" id="">',
      'btn': '<button>|</button>',
      'btn:s': '<button type="submit">|</button>',
      'btn:r': '<button type="reset">|</button>',
      'form:get': '<form action="|" method="get"></form>',
      'form:post': '<form action="|" method="post"></form>',
      'img': '<img src="|" alt="">',
      'pic': '<picture>\n  <source srcset="|" type="image/webp">\n  <img src="" alt="">\n</picture>',
      'video': '<video src="|" controls></video>',
      'audio': '<audio src="|" controls></audio>',
      'iframe': '<iframe src="|" frameborder="0"></iframe>',
      'fig': '<figure>\n  |\n  <figcaption></figcaption>\n</figure>',
      'ol+': '<ol>\n  <li>|</li>\n</ol>',
      'ul+': '<ul>\n  <li>|</li>\n</ul>',
      'dl+': '<dl>\n  <dt>|</dt>\n  <dd></dd>\n</dl>',
      'table+': '<table>\n  <tr>\n    <td>|</td>\n  </tr>\n</table>',
      'tr+': '<tr>\n  <td>|</td>\n</tr>',
      'bq': '<blockquote>|</blockquote>',
      'hdr': '<header>|</header>',
      'ftr': '<footer>|</footer>',
      'mn': '<main>|</main>',
      'sect': '<section>|</section>',
      'art': '<article>|</article>',
      'asd': '<aside>|</aside>',
      'nav': '<nav>|</nav>',
      'c': '<!-- | -->',
      'cc:ie': '<!--[if IE]>|<![endif]-->',
    };

    // Быстрые CSS сниппеты
    const cssSnippets = {
      // Display
      'd': 'display: |;',
      'dn': 'display: none;',
      'db': 'display: block;',
      'dib': 'display: inline-block;',
      'di': 'display: inline;',
      'df': 'display: flex;',
      'dif': 'display: inline-flex;',
      'dg': 'display: grid;',
      'dig': 'display: inline-grid;',
      'dt': 'display: table;',
      'dtc': 'display: table-cell;',
      
      // Flexbox - все варианты сокращений
      'fxd': 'flex-direction: |;',
      'fd': 'flex-direction: |;',
      'fxdr': 'flex-direction: row;',
      'fdr': 'flex-direction: row;',
      'fxdc': 'flex-direction: column;',
      'fdc': 'flex-direction: column;',
      'fxdrr': 'flex-direction: row-reverse;',
      'fdrr': 'flex-direction: row-reverse;',
      'fxdcr': 'flex-direction: column-reverse;',
      'fdcr': 'flex-direction: column-reverse;',
      'fxw': 'flex-wrap: |;',
      'fw': 'flex-wrap: |;',
      'fww': 'flex-wrap: wrap;',
      'fwnw': 'flex-wrap: nowrap;',
      'fwwr': 'flex-wrap: wrap-reverse;',
      'fxf': 'flex-flow: |;',
      'ff': 'flex-flow: |;',
      
      // Justify/Align - все варианты
      'jc': 'justify-content: |;',
      'jcc': 'justify-content: center;',
      'jcsb': 'justify-content: space-between;',
      'jcsa': 'justify-content: space-around;',
      'jcse': 'justify-content: space-evenly;',
      'jcfs': 'justify-content: flex-start;',
      'jcfe': 'justify-content: flex-end;',
      'jcs': 'justify-content: start;',
      'jce': 'justify-content: end;',
      'ai': 'align-items: |;',
      'aic': 'align-items: center;',
      'aifs': 'align-items: flex-start;',
      'aife': 'align-items: flex-end;',
      'ais': 'align-items: stretch;',
      'aib': 'align-items: baseline;',
      'ac': 'align-content: |;',
      'acc': 'align-content: center;',
      'acfs': 'align-content: flex-start;',
      'acfe': 'align-content: flex-end;',
      'acsb': 'align-content: space-between;',
      'acsa': 'align-content: space-around;',
      'as': 'align-self: |;',
      'asc': 'align-self: center;',
      'asfs': 'align-self: flex-start;',
      'asfe': 'align-self: flex-end;',
      'ass': 'align-self: stretch;',
      'ji': 'justify-items: |;',
      'jic': 'justify-items: center;',
      'js': 'justify-self: |;',
      'jsc': 'justify-self: center;',
      'pi': 'place-items: |;',
      'pic': 'place-items: center;',
      'pc': 'place-content: |;',
      'pcc': 'place-content: center;',
      
      // Flex item
      'fx': 'flex: |;',
      'fx1': 'flex: 1;',
      'fx0': 'flex: 0;',
      'fxa': 'flex: auto;',
      'fxn': 'flex: none;',
      'fxg': 'flex-grow: |;',
      'fxg1': 'flex-grow: 1;',
      'fxg0': 'flex-grow: 0;',
      'fg': 'flex-grow: |;',
      'fg1': 'flex-grow: 1;',
      'fxs': 'flex-shrink: |;',
      'fxs0': 'flex-shrink: 0;',
      'fxs1': 'flex-shrink: 1;',
      'fs': 'flex-shrink: |;',
      'fxb': 'flex-basis: |;',
      'fxba': 'flex-basis: auto;',
      'fb': 'flex-basis: |;',
      'ord': 'order: |;',
      'ord0': 'order: 0;',
      'ord1': 'order: 1;',
      'ord-1': 'order: -1;',
      
      // Gap
      'g': 'gap: |;',
      'gap': 'gap: |;',
      'rg': 'row-gap: |;',
      'cg': 'column-gap: |;',
      
      // Grid
      'gtc': 'grid-template-columns: |;',
      'gtr': 'grid-template-rows: |;',
      'gta': 'grid-template-areas: |;',
      'gt': 'grid-template: |;',
      'ga': 'grid-area: |;',
      'gc': 'grid-column: |;',
      'gcs': 'grid-column-start: |;',
      'gce': 'grid-column-end: |;',
      'gr': 'grid-row: |;',
      'grs': 'grid-row-start: |;',
      'gre': 'grid-row-end: |;',
      'gg': 'grid-gap: |;',
      'gac': 'grid-auto-columns: |;',
      'gar': 'grid-auto-rows: |;',
      'gaf': 'grid-auto-flow: |;',
      'gafr': 'grid-auto-flow: row;',
      'gafc': 'grid-auto-flow: column;',
      'gafd': 'grid-auto-flow: dense;',
      
      // Position
      'pos': 'position: |;',
      'poss': 'position: static;',
      'posr': 'position: relative;',
      'posa': 'position: absolute;',
      'posf': 'position: fixed;',
      'post': 'position: sticky;',
      'rel': 'position: relative;',
      'abs': 'position: absolute;',
      'fix': 'position: fixed;',
      'sti': 'position: sticky;',
      't': 'top: |;',
      'r': 'right: |;',
      'b': 'bottom: |;',
      'l': 'left: |;',
      't0': 'top: 0;',
      'r0': 'right: 0;',
      'b0': 'bottom: 0;',
      'l0': 'left: 0;',
      'inset': 'inset: |;',
      'inset0': 'inset: 0;',
      'z': 'z-index: |;',
      'z1': 'z-index: 1;',
      'z10': 'z-index: 10;',
      'z100': 'z-index: 100;',
      'z999': 'z-index: 999;',
      'z-1': 'z-index: -1;',
      
      // Размеры
      'w': 'width: |;',
      'w100': 'width: 100%;',
      'w100p': 'width: 100%;',
      'w50': 'width: 50%;',
      'wf': 'width: 100%;',
      'wa': 'width: auto;',
      'wfc': 'width: fit-content;',
      'wmc': 'width: max-content;',
      'h': 'height: |;',
      'h100': 'height: 100%;',
      'h100p': 'height: 100%;',
      'h50': 'height: 50%;',
      'hf': 'height: 100%;',
      'ha': 'height: auto;',
      'h100vh': 'height: 100vh;',
      'hvh': 'height: 100vh;',
      'hfc': 'height: fit-content;',
      'maw': 'max-width: |;',
      'mxw': 'max-width: |;',
      'mah': 'max-height: |;',
      'mxh': 'max-height: |;',
      'miw': 'min-width: |;',
      'mnw': 'min-width: |;',
      'mih': 'min-height: |;',
      'mnh': 'min-height: |;',
      
      // Margin/Padding
      'm': 'margin: |;',
      'm0': 'margin: 0;',
      'ma': 'margin: auto;',
      'mt': 'margin-top: |;',
      'mr': 'margin-right: |;',
      'mb': 'margin-bottom: |;',
      'ml': 'margin-left: |;',
      'mt0': 'margin-top: 0;',
      'mr0': 'margin-right: 0;',
      'mb0': 'margin-bottom: 0;',
      'ml0': 'margin-left: 0;',
      'mta': 'margin-top: auto;',
      'mra': 'margin-right: auto;',
      'mba': 'margin-bottom: auto;',
      'mla': 'margin-left: auto;',
      'mx': 'margin-left: |; margin-right: |;',
      'my': 'margin-top: |; margin-bottom: |;',
      'mxa': 'margin-left: auto; margin-right: auto;',
      'mya': 'margin-top: auto; margin-bottom: auto;',
      'mi': 'margin-inline: |;',
      'mia': 'margin-inline: auto;',
      'mbl': 'margin-block: |;',
      'p': 'padding: |;',
      'p0': 'padding: 0;',
      'pt': 'padding-top: |;',
      'pr': 'padding-right: |;',
      'pb': 'padding-bottom: |;',
      'pl': 'padding-left: |;',
      'pt0': 'padding-top: 0;',
      'pr0': 'padding-right: 0;',
      'pb0': 'padding-bottom: 0;',
      'pl0': 'padding-left: 0;',
      'px': 'padding-left: |; padding-right: |;',
      'py': 'padding-top: |; padding-bottom: |;',
      'pil': 'padding-inline: |;',
      'pbl': 'padding-block: |;',
      
      // Typography
      'fz': 'font-size: |;',
      'ff': 'font-family: |;',
      'ffs': 'font-family: serif;',
      'ffss': 'font-family: sans-serif;',
      'fw': 'font-weight: |;',
      'fwb': 'font-weight: bold;',
      'fwn': 'font-weight: normal;',
      'fs': 'font-style: |;',
      'fsi': 'font-style: italic;',
      'lh': 'line-height: |;',
      'ls': 'letter-spacing: |;',
      'ta': 'text-align: |;',
      'tac': 'text-align: center;',
      'tal': 'text-align: left;',
      'tar': 'text-align: right;',
      'taj': 'text-align: justify;',
      'td': 'text-decoration: |;',
      'tdn': 'text-decoration: none;',
      'tdu': 'text-decoration: underline;',
      'tt': 'text-transform: |;',
      'ttu': 'text-transform: uppercase;',
      'ttl': 'text-transform: lowercase;',
      'ttc': 'text-transform: capitalize;',
      'whs': 'white-space: |;',
      'whsn': 'white-space: nowrap;',
      
      // Colors
      'c': 'color: |;',
      'bg': 'background: |;',
      'bgc': 'background-color: |;',
      'bgi': 'background-image: url(|);',
      'bgp': 'background-position: |;',
      'bgs': 'background-size: |;',
      'bgsc': 'background-size: cover;',
      'bgsct': 'background-size: contain;',
      'bgr': 'background-repeat: |;',
      'bgrn': 'background-repeat: no-repeat;',
      'op': 'opacity: |;',
      
      // Border
      'bd': 'border: |;',
      'bdn': 'border: none;',
      'bd1': 'border: 1px solid |;',
      'bdt': 'border-top: |;',
      'bdr': 'border-right: |;',
      'bdb': 'border-bottom: |;',
      'bdl': 'border-left: |;',
      'bdrs': 'border-radius: |;',
      'bdrs50': 'border-radius: 50%;',
      'bxsh': 'box-shadow: |;',
      'bxshn': 'box-shadow: none;',
      
      // Overflow
      'ov': 'overflow: |;',
      'ovh': 'overflow: hidden;',
      'ova': 'overflow: auto;',
      'ovs': 'overflow: scroll;',
      'ovv': 'overflow: visible;',
      'ovx': 'overflow-x: |;',
      'ovy': 'overflow-y: |;',
      
      // Cursor
      'cur': 'cursor: |;',
      'curp': 'cursor: pointer;',
      'curd': 'cursor: default;',
      'curn': 'cursor: not-allowed;',
      
      // Transition/Animation
      'trs': 'transition: |;',
      'trsall': 'transition: all 0.3s ease;',
      'anim': 'animation: |;',
      'trf': 'transform: |;',
      'trfr': 'transform: rotate(|deg);',
      'trfs': 'transform: scale(|);',
      'trft': 'transform: translate(|);',
      
      // Visibility
      'v': 'visibility: |;',
      'vh': 'visibility: hidden;',
      'vv': 'visibility: visible;',
      
      // Other
      'cnt': 'content: "|";',
      'ol': 'outline: |;',
      'oln': 'outline: none;',
      'rsz': 'resize: |;',
      'us': 'user-select: |;',
      'usn': 'user-select: none;',
      'pe': 'pointer-events: |;',
      'pen': 'pointer-events: none;',
      
      // Centering helpers
      'center': 'display: flex; justify-content: center; align-items: center;',
      'abs-center': 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);',
      'flex-center': 'display: flex; justify-content: center; align-items: center;',
      'grid-center': 'display: grid; place-items: center;',
      
      // Box sizing
      'bxz': 'box-sizing: |;',
      'bxzbb': 'box-sizing: border-box;',
      'bxzcb': 'box-sizing: content-box;',
      
      // Object fit
      'of': 'object-fit: |;',
      'ofc': 'object-fit: cover;',
      'ofct': 'object-fit: contain;',
      'off': 'object-fit: fill;',
      'ofn': 'object-fit: none;',
      'objp': 'object-position: |;',
      'objpc': 'object-position: center;',
      
      // Aspect ratio
      'ar': 'aspect-ratio: |;',
      'ar11': 'aspect-ratio: 1/1;',
      'ar169': 'aspect-ratio: 16/9;',
      'ar43': 'aspect-ratio: 4/3;',
      
      // Scroll
      'sb': 'scroll-behavior: |;',
      'sbs': 'scroll-behavior: smooth;',
      'oss': 'overflow-scroll: |;',
      'ws': 'word-spacing: |;',
      'wb': 'word-break: |;',
      'wbba': 'word-break: break-all;',
      'wbbw': 'word-break: break-word;',
      'ow': 'overflow-wrap: |;',
      'owbw': 'overflow-wrap: break-word;',
      'ww': 'overflow-wrap: break-word;',
      
      // Text overflow
      'to': 'text-overflow: |;',
      'toe': 'text-overflow: ellipsis;',
      'toc': 'text-overflow: clip;',
      
      // Vertical align
      'va': 'vertical-align: |;',
      'vat': 'vertical-align: top;',
      'vam': 'vertical-align: middle;',
      'vab': 'vertical-align: bottom;',
      'vabl': 'vertical-align: baseline;',
      
      // Float/Clear (legacy but still used)
      'fl': 'float: |;',
      'fll': 'float: left;',
      'flr': 'float: right;',
      'fln': 'float: none;',
      'cl': 'clear: |;',
      'clb': 'clear: both;',
      'cll': 'clear: left;',
      'clr': 'clear: right;',
      
      // List
      'lis': 'list-style: |;',
      'lisn': 'list-style: none;',
      'list': 'list-style-type: |;',
      'lisp': 'list-style-position: |;',
      
      // Table
      'tbl': 'table-layout: |;',
      'tblf': 'table-layout: fixed;',
      'tbla': 'table-layout: auto;',
      'bdc': 'border-collapse: |;',
      'bdcc': 'border-collapse: collapse;',
      'bdcs': 'border-collapse: separate;',
      
      // Filter
      'fil': 'filter: |;',
      'filb': 'filter: blur(|px);',
      'filbr': 'filter: brightness(|);',
      'filc': 'filter: contrast(|);',
      'filg': 'filter: grayscale(|);',
      
      // Backdrop filter
      'bf': 'backdrop-filter: |;',
      'bfb': 'backdrop-filter: blur(|px);',
      
      // Mix blend mode
      'mbm': 'mix-blend-mode: |;',
      'mbmm': 'mix-blend-mode: multiply;',
      'mbms': 'mix-blend-mode: screen;',
      'mbmo': 'mix-blend-mode: overlay;',
      
      // Isolation
      'iso': 'isolation: |;',
      'isoi': 'isolation: isolate;',
      
      // Clip path
      'cp': 'clip-path: |;',
      
      // Will change
      'wc': 'will-change: |;',
      'wct': 'will-change: transform;',
      'wco': 'will-change: opacity;',
      
      // Columns
      'col': 'columns: |;',
      'colc': 'column-count: |;',
      'colg': 'column-gap: |;',
      'colr': 'column-rule: |;',
      'colw': 'column-width: |;',
      
      // Border specific
      'bdw': 'border-width: |;',
      'bds': 'border-style: |;',
      'bdss': 'border-style: solid;',
      'bdsd': 'border-style: dashed;',
      'bdsdt': 'border-style: dotted;',
      'bdcol': 'border-color: |;',
      'bdtrs': 'border-top-right-radius: |;',
      'bdtls': 'border-top-left-radius: |;',
      'bdbrs': 'border-bottom-right-radius: |;',
      'bdbls': 'border-bottom-left-radius: |;',
      'br': 'border-radius: |;',
      'br50': 'border-radius: 50%;',
      
      // Accent color
      'accc': 'accent-color: |;',

      // Caret color
      'cc': 'caret-color: |;',
      
      // Appearance
      'app': 'appearance: |;',
      'appn': 'appearance: none;',
      
      // Writing mode
      'wm': 'writing-mode: |;',
      'wmvrl': 'writing-mode: vertical-rl;',
      'wmvlr': 'writing-mode: vertical-lr;',
      
      // Text shadow
      'tsh': 'text-shadow: |;',
      'tshn': 'text-shadow: none;',
      
      // Word wrap
      'wwrap': 'word-wrap: |;',
      'wwrapbw': 'word-wrap: break-word;',
      
      // Tab size
      'tbs': 'tab-size: |;',
      
      // Touch action
      'tcha': 'touch-action: |;',
      'tchan': 'touch-action: none;',
      'tcham': 'touch-action: manipulation;',
      
      // Scroll snap
      'sst': 'scroll-snap-type: |;',
      'ssa': 'scroll-snap-align: |;',
      
      // Container queries
      'ct': 'container-type: |;',
      'cti': 'container-type: inline-size;',
      'cn': 'container-name: |;',
      
      // Full property names (для тех кто не помнит сокращения)
      'display': 'display: |;',
      'flex': 'display: flex;',
      'grid': 'display: grid;',
      'flex-direction': 'flex-direction: |;',
      'flex-wrap': 'flex-wrap: |;',
      'justify-content': 'justify-content: |;',
      'align-items': 'align-items: |;',
      'align-content': 'align-content: |;',
      'position': 'position: |;',
      'top': 'top: |;',
      'right': 'right: |;',
      'bottom': 'bottom: |;',
      'left': 'left: |;',
      'z-index': 'z-index: |;',
      'width': 'width: |;',
      'height': 'height: |;',
      'max-width': 'max-width: |;',
      'max-height': 'max-height: |;',
      'min-width': 'min-width: |;',
      'min-height': 'min-height: |;',
      'margin': 'margin: |;',
      'padding': 'padding: |;',
      'font-size': 'font-size: |;',
      'font-weight': 'font-weight: |;',
      'font-family': 'font-family: |;',
      'line-height': 'line-height: |;',
      'text-align': 'text-align: |;',
      'color': 'color: |;',
      'background': 'background: |;',
      'background-color': 'background-color: |;',
      'border': 'border: |;',
      'border-radius': 'border-radius: |;',
      'box-shadow': 'box-shadow: |;',
      'overflow': 'overflow: |;',
      'cursor': 'cursor: |;',
      'transition': 'transition: |;',
      'transform': 'transform: |;',
      'opacity': 'opacity: |;',
      'visibility': 'visibility: |;',
      'outline': 'outline: |;',
      'content': 'content: |;',
      'filter': 'filter: |;',
      'clip-path': 'clip-path: |;',
      'animation': 'animation: |;',
      'flex-grow': 'flex-grow: |;',
      'flex-shrink': 'flex-shrink: |;',
      'flex-basis': 'flex-basis: |;',
      'order': 'order: |;',
      'white-space': 'white-space: |;',
      'text-decoration': 'text-decoration: |;',
      'text-transform': 'text-transform: |;',
      'letter-spacing': 'letter-spacing: |;',
      'object-fit': 'object-fit: |;',
      'aspect-ratio': 'aspect-ratio: |;',
      'user-select': 'user-select: |;',
      'pointer-events': 'pointer-events: |;',
      'scroll-behavior': 'scroll-behavior: |;',
      'backdrop-filter': 'backdrop-filter: |;',
      'border-top': 'border-top: |;',
      'border-right': 'border-right: |;',
      'border-bottom': 'border-bottom: |;',
      'border-left': 'border-left: |;',
      'margin-top': 'margin-top: |;',
      'margin-right': 'margin-right: |;',
      'margin-bottom': 'margin-bottom: |;',
      'margin-left': 'margin-left: |;',
      'padding-top': 'padding-top: |;',
      'padding-right': 'padding-right: |;',
      'padding-bottom': 'padding-bottom: |;',
      'padding-left': 'padding-left: |;',
      'grid-template-columns': 'grid-template-columns: |;',
      'grid-template-rows': 'grid-template-rows: |;',
      'grid-column': 'grid-column: |;',
      'grid-row': 'grid-row: |;',
      'align-self': 'align-self: |;',
      'justify-self': 'justify-self: |;',
      'place-items': 'place-items: |;',
      'place-content': 'place-content: |;',
    };

    if (isHtml) {
      // Проверяем быстрые сниппеты
      if (htmlSnippets[abbreviation]) {
        return htmlSnippets[abbreviation];
      }
      
      // Стандартный Emmet для HTML
      try {
        const expanded = emmet(abbreviation, {
          type: 'markup',
          options: {
            'output.indent': '  ',
            'output.newline': '\n',
            'output.selfClosingStyle': 'xhtml'
          }
        });
        
        if (expanded && expanded !== abbreviation && expanded.length > abbreviation.length) {
          return expanded;
        }
      } catch (err) {
        // Не удалось развернуть
      }
    } else {
      // CSS - проверяем сниппеты (всегда работают внутри селектора)
      if (cssSnippets[abbreviation]) {
        return cssSnippets[abbreviation];
      }
      
      // Числовые значения: m10 -> margin: 10px; p20 -> padding: 20px;
      const numericMatch = abbreviation.match(/^(m|p|mt|mr|mb|ml|pt|pr|pb|pl|w|h|t|r|b|l|fz|g|bdrs|lh)(-?\d+)$/);
      if (numericMatch) {
        const propMap = {
          'm': 'margin', 'p': 'padding',
          'mt': 'margin-top', 'mr': 'margin-right', 'mb': 'margin-bottom', 'ml': 'margin-left',
          'pt': 'padding-top', 'pr': 'padding-right', 'pb': 'padding-bottom', 'pl': 'padding-left',
          'w': 'width', 'h': 'height',
          't': 'top', 'r': 'right', 'b': 'bottom', 'l': 'left',
          'fz': 'font-size', 'g': 'gap', 'bdrs': 'border-radius', 'lh': 'line-height'
        };
        const prop = propMap[numericMatch[1]];
        const value = numericMatch[2];
        return `${prop}: ${value}px;`;
      }
      
      // Селекторы работают ТОЛЬКО если мы НЕ внутри { }
      if (!insideSelector) {
        // CSS селекторы: ТОЛЬКО .class, #id или явные HTML теги
        const htmlTags = ['html', 'body', 'div', 'span', 'p', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
          'header', 'footer', 'main', 'nav', 'section', 'article', 'aside', 'figure', 'figcaption',
          'form', 'input', 'button', 'label', 'select', 'option', 'textarea',
          'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
          'img', 'video', 'audio', 'canvas', 'svg', 'iframe',
          'strong', 'em', 'b', 'i', 'u', 'small', 'big', 'sub', 'sup', 'code', 'pre', 'blockquote',
          'br', 'hr'];
        
        // Для .class, #id
        if (/^[.#]/.test(abbreviation)) {
          const selectorMatch = abbreviation.match(/^([.#][a-zA-Z_-][a-zA-Z0-9_.-]*)$/);
          if (selectorMatch) {
            return `${selectorMatch[1]} {\n  |\n}`;
          }
        } else if (htmlTags.includes(abbreviation.toLowerCase())) {
          // Это HTML тег как селектор
          return `${abbreviation} {\n  |\n}`;
        }
      }
      
      // Стандартный Emmet для CSS (только внутри селектора)
      if (insideSelector) {
        try {
          const expanded = emmet(abbreviation, {
            type: 'stylesheet',
            options: {
              'output.indent': '  ',
              'output.newline': '\n'
            }
          });
          
          if (expanded && expanded !== abbreviation && expanded.length > abbreviation.length) {
            return expanded;
          }
        } catch (err) {
          // Не удалось развернуть
        }
      }
    }
    
    return null;
  }, []);

  // Обработчик ввода для показа подсказок
  const handleEditorInput = useCallback((e, isHtml) => {
    const textarea = e.target;
    const { abbreviation, insideSelector } = getAbbreviation(textarea);
    
    const expanded = tryExpandEmmet(abbreviation, isHtml, insideSelector);
    
    if (expanded) {
      // Вычисляем позицию подсказки относительно курсора
      const rect = textarea.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      
      // Находим позицию курсора в тексте
      const textBeforeCursor = textarea.value.substr(0, textarea.selectionStart);
      const lines = textBeforeCursor.split('\n');
      const currentLineIndex = lines.length - 1;
      const currentLineText = lines[currentLineIndex];
      
      // Позиция с учётом скролла
      const scrollTop = textarea.scrollTop;
      const top = rect.top + paddingTop + (currentLineIndex * lineHeight) - scrollTop + lineHeight + 5;
      const left = rect.left + paddingLeft + Math.min(currentLineText.length * 7.8, 150);
      
      setSuggestionPos({
        top: Math.min(top, window.innerHeight - 200), // не выходить за экран
        left: Math.min(left, window.innerWidth - 320)
      });
      
      setEmmetSuggestion({
        abbreviation,
        expanded,
        isHtml
      });
      setActiveEditor(isHtml ? 'html' : 'css');
    } else {
      setEmmetSuggestion(null);
    }
  }, [getAbbreviation, tryExpandEmmet]);

  // Применить подсказку (улучшенная версия с умным курсором)
  const applySuggestion = useCallback(() => {
    if (!emmetSuggestion) return;
    
    const textarea = activeEditor === 'html' ? htmlEditorRef.current : cssEditorRef.current;
    if (!textarea) return;
    
    const { abbreviation, expanded, isHtml } = emmetSuggestion;
    const { start, end } = getAbbreviation(textarea);
    const value = textarea.value;
    
    // Ищем позицию курсора (символ |) в развёрнутом тексте
    let finalExpanded = expanded;
    let cursorOffset = expanded.length;
    
    const cursorPos = expanded.indexOf('|');
    if (cursorPos !== -1) {
      // Убираем символ | и запоминаем позицию
      finalExpanded = expanded.slice(0, cursorPos) + expanded.slice(cursorPos + 1);
      cursorOffset = cursorPos;
    } else {
      // Если нет |, ставим курсор между открывающим и закрывающим тегами
      // Например: <div></div> -> курсор после >
      const emptyTagMatch = finalExpanded.match(/^<(\w+)[^>]*><\/\1>$/);
      if (emptyTagMatch) {
        cursorOffset = finalExpanded.indexOf('></') + 1;
      }
    }
    
    const newValue = value.slice(0, start) + finalExpanded + value.slice(end);
    
    if (isHtml) {
      setHtmlCode(newValue);
    } else {
      setCssCode(newValue);
    }
    
    // Установить курсор в правильную позицию
    setTimeout(() => {
      const newPos = start + cursorOffset;
      textarea.focus();
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
    }, 0);
    
    setEmmetSuggestion(null);
  }, [emmetSuggestion, activeEditor, getAbbreviation]);

  // Обработчик клавиш
  const handleEditorKeyDown = useCallback((e, isHtml) => {
    const textarea = e.target;
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    // Если есть подсказка и нажат Tab или Enter - применить
    if (emmetSuggestion && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault();
      applySuggestion();
      return;
    }
    
    // Escape - закрыть подсказку
    if (e.key === 'Escape') {
      setEmmetSuggestion(null);
      return;
    }
    
    // Enter - автоматический отступ
    if (e.key === 'Enter' && !emmetSuggestion) {
      e.preventDefault();
      
      // Находим текущую строку
      const textBeforeCursor = value.slice(0, cursorPos);
      const textAfterCursor = value.slice(cursorPos);
      const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      const currentLine = textBeforeCursor.slice(currentLineStart);
      
      // Определяем текущий отступ
      const indentMatch = currentLine.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : '';
      
      // Проверяем, находимся ли мы между открывающим и закрывающим тегом: ><
      const charBefore = textBeforeCursor.slice(-1);
      const charAfter = textAfterCursor[0];
      const betweenTags = charBefore === '>' && charAfter === '<';
      
      // Проверяем, заканчивается ли строка открывающим тегом (нужен дополнительный отступ)
      const endsWithOpenTag = /<[a-zA-Z][^\/]*>$/.test(textBeforeCursor.trim()) || 
                             /{\s*$/.test(textBeforeCursor); // CSS открывающая скобка
      
      let newText;
      let newCursorPos;
      
      if (betweenTags) {
        // Между тегами: добавляем новую строку с отступом и ещё одну для закрывающего тега
        const newIndent = currentIndent + '  ';
        newText = value.slice(0, cursorPos) + '\n' + newIndent + '\n' + currentIndent + value.slice(cursorPos);
        newCursorPos = cursorPos + 1 + newIndent.length;
      } else if (endsWithOpenTag) {
        // После открывающего тега - добавляем дополнительный отступ
        const newIndent = currentIndent + '  ';
        newText = value.slice(0, cursorPos) + '\n' + newIndent + value.slice(cursorPos);
        newCursorPos = cursorPos + 1 + newIndent.length;
      } else {
        // Обычный перенос - сохраняем текущий отступ
        newText = value.slice(0, cursorPos) + '\n' + currentIndent + value.slice(cursorPos);
        newCursorPos = cursorPos + 1 + currentIndent.length;
      }
      
      if (isHtml) {
        setHtmlCode(newText);
      } else {
        setCssCode(newText);
      }
      
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = newCursorPos;
        textarea.selectionEnd = newCursorPos;
      }, 0);
      
      return;
    }
    
    // Автоматическое закрытие скобок и кавычек
    const autoPairs = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`',
      '<': '>'
    };
    
    if (autoPairs[e.key] && !e.ctrlKey && !e.altKey) {
      // Для < проверяем, что это не закрывающий тег
      if (e.key === '<' && value[cursorPos] === '/') {
        return;
      }
      
      e.preventDefault();
      const closingChar = autoPairs[e.key];
      const newValue = value.slice(0, cursorPos) + e.key + closingChar + value.slice(cursorPos);
      
      if (isHtml) {
        setHtmlCode(newValue);
      } else {
        setCssCode(newValue);
      }
      
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = cursorPos + 1;
        textarea.selectionEnd = cursorPos + 1;
      }, 0);
      
      return;
    }
    
    // Backspace - удаление парных символов
    if (e.key === 'Backspace' && cursorPos > 0) {
      const charBefore = value[cursorPos - 1];
      const charAfter = value[cursorPos];
      const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`', '<': '>' };
      
      if (pairs[charBefore] === charAfter) {
        e.preventDefault();
        const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos + 1);
        
        if (isHtml) {
          setHtmlCode(newValue);
        } else {
          setCssCode(newValue);
        }
        
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = cursorPos - 1;
          textarea.selectionEnd = cursorPos - 1;
        }, 0);
        
        return;
      }
    }
    
    // Tab без подсказки - попробовать развернуть Emmet или вставить отступ
    if (e.key === 'Tab' && !emmetSuggestion) {
      const { abbreviation, start, end, insideSelector } = getAbbreviation(textarea);
      
      // Пробуем развернуть Emmet
      if (abbreviation && abbreviation.length >= 1) {
        const expanded = tryExpandEmmet(abbreviation, isHtml, insideSelector);
        
        if (expanded) {
          e.preventDefault();
          
          // Обработка курсора (символ |)
          let finalExpanded = expanded;
          let cursorOffset = expanded.length;
          
          const cursorPosInExpanded = expanded.indexOf('|');
          if (cursorPosInExpanded !== -1) {
            finalExpanded = expanded.slice(0, cursorPosInExpanded) + expanded.slice(cursorPosInExpanded + 1);
            cursorOffset = cursorPosInExpanded;
          } else {
            const emptyTagMatch = finalExpanded.match(/^<(\w+)[^>]*><\/\1>$/);
            if (emptyTagMatch) {
              cursorOffset = finalExpanded.indexOf('></') + 1;
            }
          }
          
          const newValue = value.slice(0, start) + finalExpanded + value.slice(end);
          
          if (isHtml) {
            setHtmlCode(newValue);
          } else {
            setCssCode(newValue);
          }
          
          setTimeout(() => {
            const newPos = start + cursorOffset;
            textarea.focus();
            textarea.selectionStart = newPos;
            textarea.selectionEnd = newPos;
          }, 0);
          
          setEmmetSuggestion(null);
          return;
        }
      }
      
      // Если Emmet не сработал - вставить отступ
      e.preventDefault();
      const newValue = value.slice(0, cursorPos) + '  ' + value.slice(cursorPos);
      
      if (isHtml) {
        setHtmlCode(newValue);
      } else {
        setCssCode(newValue);
      }
      
      setTimeout(() => {
        textarea.selectionStart = cursorPos + 2;
        textarea.selectionEnd = cursorPos + 2;
      }, 0);
    }
  }, [emmetSuggestion, applySuggestion, getAbbreviation, tryExpandEmmet]);

  useEffect(() => {
    loadLevels();
    loadStats();
  }, []);

  const loadLevels = async () => {
    try {
      const response = await api.get('/layout-game/levels');
      console.log('Loaded levels:', response.data);
      // Преобразуем completed в boolean
      const normalizedLevels = response.data.map(level => ({
        ...level,
        completed: level.completed === true || level.completed === 'true' || level.completed === 't'
      }));
      console.log('Normalized levels:', normalizedLevels);
      setLevels(normalizedLevels);
    } catch (error) {
      console.error('Ошибка загрузки уровней:', error);
      toast.error('Не удалось загрузить уровни');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/layout-game/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const selectLevel = async (level) => {
    try {
      const response = await api.get(`/layout-game/levels/${level.id}`);
      setSelectedLevel(response.data);
      setHtmlCode(`<div class="container">
  <!-- Ваша верстка здесь -->
  
</div>`);
      setCssCode(`/* Ваши стили здесь */
.container {
  
}
`);
      setLastResult(null);
      setSelectedElement(null);
      setHoveredElement(null);
    } catch (error) {
      console.error('Ошибка загрузки уровня:', error);
      toast.error('Не удалось загрузить уровень');
    }
  };

  // Обработка наведения на элемент в целевом макете
  const handleTargetMouseMove = useCallback((e) => {
    if (!inspectorEnabled || !targetFrameRef.current) return;
    
    const iframe = targetFrameRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;
    
    const rect = iframe.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const element = iframeDoc.elementFromPoint(x, y);
    if (element && element !== iframeDoc.body && element !== iframeDoc.documentElement) {
      const computed = iframeDoc.defaultView.getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      
      setHoveredElement({
        tag: element.tagName.toLowerCase(),
        classes: element.className || '',
        id: element.id || '',
        bounds: {
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
          top: Math.round(bounds.top),
          left: Math.round(bounds.left)
        },
        styles: {
          width: computed.width,
          height: computed.height,
          padding: computed.padding,
          paddingTop: computed.paddingTop,
          paddingRight: computed.paddingRight,
          paddingBottom: computed.paddingBottom,
          paddingLeft: computed.paddingLeft,
          margin: computed.margin,
          marginTop: computed.marginTop,
          marginRight: computed.marginRight,
          marginBottom: computed.marginBottom,
          marginLeft: computed.marginLeft,
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          fontFamily: computed.fontFamily,
          borderRadius: computed.borderRadius,
          border: computed.border,
          display: computed.display,
          flexDirection: computed.flexDirection,
          justifyContent: computed.justifyContent,
          alignItems: computed.alignItems,
          gap: computed.gap,
          position: computed.position,
          // Новые свойства
          boxShadow: computed.boxShadow,
          textShadow: computed.textShadow,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,
          textAlign: computed.textAlign,
          opacity: computed.opacity,
          transform: computed.transform,
          overflow: computed.overflow,
          zIndex: computed.zIndex
        }
      });
    }
  }, [inspectorEnabled]);

  const handleTargetClick = useCallback((e) => {
    if (!inspectorEnabled || !hoveredElement) return;
    e.preventDefault();
    setSelectedElement(hoveredElement);
  }, [inspectorEnabled, hoveredElement]);

  // Вычисление расстояния между выбранным и наведённым элементом (Alt+hover)
  const calculateDistance = useCallback((start, end) => {
    if (!start || !end) return null;
    
    const startBounds = start.bounds;
    const endBounds = end.bounds;
    
    if (!startBounds || !endBounds) return null;
    
    // Горизонтальное расстояние
    let horizontalDistance = 0;
    if (endBounds.left >= startBounds.left + startBounds.width) {
      horizontalDistance = endBounds.left - (startBounds.left + startBounds.width);
    } else if (startBounds.left >= endBounds.left + endBounds.width) {
      horizontalDistance = startBounds.left - (endBounds.left + endBounds.width);
    }
    
    // Вертикальное расстояние
    let verticalDistance = 0;
    if (endBounds.top >= startBounds.top + startBounds.height) {
      verticalDistance = endBounds.top - (startBounds.top + startBounds.height);
    } else if (startBounds.top >= endBounds.top + endBounds.height) {
      verticalDistance = startBounds.top - (endBounds.top + endBounds.height);
    }
    
    return { horizontal: Math.round(horizontalDistance), vertical: Math.round(verticalDistance) };
  }, []);

  // Отслеживание Alt
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Alt' || e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        setAltPressed(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        e.preventDefault();
        setAltPressed(false);
      }
    };
    
    // Блокируем меню браузера
    const preventAltMenu = (e) => {
      if (e.altKey) {
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('keydown', preventAltMenu, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('keydown', preventAltMenu, { capture: true });
    };
  }, []);

  const handleTargetMouseLeave = useCallback(() => {
    setHoveredElement(null);
  }, []);

  // Обновление целевого iframe
  const updateTargetFrame = useCallback(() => {
    if (!targetFrameRef.current || !selectedLevel) return;
    
    const iframe = targetFrameRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          ${selectedLevel.target_css || ''}
        </style>
      </head>
      <body>
        ${selectedLevel.target_html || ''}
      </body>
      </html>
    `;
    
    doc.open();
    doc.write(fullHtml);
    doc.close();
  }, [selectedLevel]);

  // Обновление превью iframe
  const updatePreviewFrame = useCallback(() => {
    if (!previewFrameRef.current) return;
    
    const iframe = previewFrameRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          ${cssCode}
        </style>
      </head>
      <body>
        ${htmlCode}
      </body>
      </html>
    `;
    
    doc.open();
    doc.write(fullHtml);
    doc.close();
  }, [htmlCode, cssCode]);

  useEffect(() => {
    updateTargetFrame();
  }, [selectedLevel, updateTargetFrame]);

  useEffect(() => {
    const timer = setTimeout(updatePreviewFrame, 300);
    return () => clearTimeout(timer);
  }, [htmlCode, cssCode, updatePreviewFrame]);

  // Сравнение верстки
  const checkLayout = async () => {
    if (!selectedLevel) return;
    
    // Проверка что ученик написал реальный HTML (не только комментарии и пустой контейнер)
    const cleanHtml = htmlCode
      .replace(/<!--[\s\S]*?-->/g, '') // убираем комментарии
      .replace(/<div\s+class="container">\s*<\/div>/g, '') // убираем пустой контейнер
      .replace(/\s+/g, ' ')
      .trim();
    
    // Проверяем есть ли реальные HTML теги с контентом
    const hasRealContent = /<[a-z][^>]*>[^<]+<\/[a-z]+>/i.test(cleanHtml) || 
                          /<[a-z][^>]*\/>/i.test(cleanHtml);
    
    if (!hasRealContent) {
      toast.error('Напишите HTML разметку для проверки (теги с контентом)');
      return;
    }
    
    setIsChecking(true);
    setLastResult(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const html2canvas = (await import('html2canvas')).default;
      
      const targetDoc = targetFrameRef.current?.contentDocument;
      const previewDoc = previewFrameRef.current?.contentDocument;
      
      if (!targetDoc || !previewDoc) {
        throw new Error('Не удалось получить документы');
      }
      
      const width = selectedLevel.canvas_width || 800;
      const height = selectedLevel.canvas_height || 600;
      
      // Рендер целевого макета
      const targetCanvas = await html2canvas(targetDoc.body, {
        width, height, scale: 1, useCORS: true, backgroundColor: '#ffffff'
      });
      
      // Рендер верстки ученика
      const previewCanvas = await html2canvas(previewDoc.body, {
        width, height, scale: 1, useCORS: true, backgroundColor: '#ffffff'
      });
      
      // Сравнение пикселей - ВСЕ пиксели без исключений
      const targetCtx = targetCanvas.getContext('2d');
      const previewCtx = previewCanvas.getContext('2d');
      
      const targetData = targetCtx.getImageData(0, 0, width, height);
      const previewData = previewCtx.getImageData(0, 0, width, height);
      
      let matchingPixels = 0;
      let nonWhiteTargetPixels = 0; // Цветные пиксели в макете
      let nonWhitePreviewPixels = 0; // Цветные пиксели у ученика
      let nonWhiteMatching = 0; // Совпавшие цветные пиксели
      
      const totalPixels = width * height;
      const tolerance = 25;
      const whiteThreshold = 250;
      
      for (let i = 0; i < targetData.data.length; i += 4) {
        const targetR = targetData.data[i];
        const targetG = targetData.data[i + 1];
        const targetB = targetData.data[i + 2];
        
        const previewR = previewData.data[i];
        const previewG = previewData.data[i + 1];
        const previewB = previewData.data[i + 2];
        
        const rDiff = Math.abs(targetR - previewR);
        const gDiff = Math.abs(targetG - previewG);
        const bDiff = Math.abs(targetB - previewB);
        
        const isMatch = rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance;
        
        if (isMatch) {
          matchingPixels++;
        }
        
        // Подсчет цветных (не белых) пикселей
        const isTargetWhite = targetR >= whiteThreshold && targetG >= whiteThreshold && targetB >= whiteThreshold;
        const isPreviewWhite = previewR >= whiteThreshold && previewG >= whiteThreshold && previewB >= whiteThreshold;
        
        if (!isTargetWhite) {
          nonWhiteTargetPixels++;
          if (isMatch) nonWhiteMatching++;
        }
        if (!isPreviewWhite) {
          nonWhitePreviewPixels++;
        }
      }
      
      // Проверка что ученик вообще что-то нарисовал
      if (nonWhitePreviewPixels < 100) {
        toast.error('Ваша верстка пустая или невидимая. Добавьте видимые элементы.');
        setIsChecking(false);
        return;
      }
      
      // Проверка что в макете есть цветные пиксели
      if (nonWhiteTargetPixels < 100) {
        // Макет почти пустой - используем обычное сравнение
        const accuracy = (matchingPixels / totalPixels) * 100;
        await submitResult(accuracy);
        return;
      }
      
      // Основная метрика: насколько хорошо ученик воспроизвел цветные элементы макета
      const colorAccuracy = (nonWhiteMatching / nonWhiteTargetPixels) * 100;
      
      // Штраф за лишние элементы (ученик добавил то, чего нет в макете)
      const extraPixels = Math.max(0, nonWhitePreviewPixels - nonWhiteTargetPixels);
      const extraPenalty = Math.min(30, (extraPixels / nonWhiteTargetPixels) * 50);
      
      // Штраф за недостающие элементы
      const missingPixels = nonWhiteTargetPixels - nonWhiteMatching;
      const missingPenalty = (missingPixels / nonWhiteTargetPixels) * 100;
      
      // Финальная точность
      let accuracy = colorAccuracy - extraPenalty;
      accuracy = Math.max(0, Math.min(100, accuracy));
      
      await submitResult(accuracy);
      
    } catch (error) {
      console.error('Ошибка проверки:', error);
      toast.error('Ошибка при проверке верстки');
      setIsChecking(false);
    }
  };
  
  // Отправка результата
  const submitResult = async (accuracy) => {
    try {
      console.log('submitResult called with accuracy:', accuracy);
      console.log('Sending to:', `/layout-game/levels/${selectedLevel.id}/check`);
      
      const response = await api.post(`/layout-game/levels/${selectedLevel.id}/check`, {
        accuracy
      });

      console.log('Check response:', response.data);
      
      setLastResult(response.data);

      if (response.data.completed) {
        toast.success(`🎉 ${response.data.message}`);
        if (response.data.pointsAwarded > 0) {
          toast.info(`+${response.data.pointsAwarded} очков!`);
        }
        // Обновляем список уровней чтобы разблокировать следующий
        await loadLevels();
        loadStats();
      } else {
        toast.warning(response.data.message);
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Ошибка при сохранении результата');
    } finally {
      setIsChecking(false);
    }
  };

  // Переход к следующему уровню
  const goToNextLevel = useCallback(() => {
    const currentIndex = levels.findIndex(l => l.id === selectedLevel.id);
    if (currentIndex !== -1 && currentIndex < levels.length - 1) {
      const nextLevel = levels[currentIndex + 1];
      selectLevel(nextLevel);
      setLastResult(null);
    }
  }, [levels, selectedLevel]);

  // Проверка есть ли следующий уровень
  const hasNextLevel = useMemo(() => {
    if (!selectedLevel || !levels.length) return false;
    const currentIndex = levels.findIndex(l => l.id === selectedLevel.id);
    return currentIndex !== -1 && currentIndex < levels.length - 1;
  }, [levels, selectedLevel]);

  // Форматирование цвета для отображения
  const formatColor = (color) => {
    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return 'прозрачный';
    return color;
  };

  // Рендер инспектора
  const renderInspector = () => {
    const element = selectedElement || hoveredElement;
    if (!element) {
      return (
        <div className={styles.inspectorEmpty}>
          <FaMousePointer className={styles.inspectorEmptyIcon} />
          <p>Наведите на элемент макета,<br/>чтобы увидеть его свойства</p>
        </div>
      );
    }

    return (
      <div className={styles.inspectorContent}>
        {/* Имя элемента */}
        <div className={styles.inspectorHeader}>
          <span className={styles.tagName}>&lt;{element.tag}&gt;</span>
          {element.classes && <span className={styles.className}>.{element.classes.split(' ').join('.')}</span>}
          {element.id && <span className={styles.idName}>#{element.id}</span>}
        </div>

        {/* Box Model */}
        <div className={styles.boxModel}>
          <div className={styles.boxModelTitle}>Box Model</div>
          <div className={styles.boxModelVisual}>
            <div className={styles.marginBox}>
              <span className={styles.boxLabel}>margin</span>
              <span className={styles.marginTop}>{parseInt(element.styles.marginTop) || 0}</span>
              <span className={styles.marginRight}>{parseInt(element.styles.marginRight) || 0}</span>
              <span className={styles.marginBottom}>{parseInt(element.styles.marginBottom) || 0}</span>
              <span className={styles.marginLeft}>{parseInt(element.styles.marginLeft) || 0}</span>
              
              <div className={styles.paddingBox}>
                <span className={styles.boxLabel}>padding</span>
                <span className={styles.paddingTop}>{parseInt(element.styles.paddingTop) || 0}</span>
                <span className={styles.paddingRight}>{parseInt(element.styles.paddingRight) || 0}</span>
                <span className={styles.paddingBottom}>{parseInt(element.styles.paddingBottom) || 0}</span>
                <span className={styles.paddingLeft}>{parseInt(element.styles.paddingLeft) || 0}</span>
                
                <div className={styles.contentBox}>
                  {element.bounds.width} × {element.bounds.height}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Свойства */}
        <div className={styles.inspectorProps}>
          <div className={styles.propSection}>
            <h4>Размеры</h4>
            <div className={styles.propRow}>
              <span>width</span>
              <span>{element.styles.width}</span>
            </div>
            <div className={styles.propRow}>
              <span>height</span>
              <span>{element.styles.height}</span>
            </div>
          </div>

          <div className={styles.propSection}>
            <h4>Цвета</h4>
            <div className={styles.propRow}>
              <span>background</span>
              <span className={styles.colorValue}>
                <span 
                  className={styles.colorSwatch} 
                  style={{ backgroundColor: element.styles.backgroundColor }}
                />
                {formatColor(element.styles.backgroundColor)}
              </span>
            </div>
            <div className={styles.propRow}>
              <span>color</span>
              <span className={styles.colorValue}>
                <span 
                  className={styles.colorSwatch} 
                  style={{ backgroundColor: element.styles.color }}
                />
                {element.styles.color}
              </span>
            </div>
          </div>

          <div className={styles.propSection}>
            <h4>Типографика</h4>
            <div className={styles.propRow}>
              <span>font-size</span>
              <span>{element.styles.fontSize}</span>
            </div>
            <div className={styles.propRow}>
              <span>font-weight</span>
              <span>{element.styles.fontWeight}</span>
            </div>
            <div className={styles.propRow}>
              <span>font-family</span>
              <span className={styles.fontFamily}>{element.styles.fontFamily?.split(',')[0]}</span>
            </div>
          </div>

          {element.styles.display === 'flex' && (
            <div className={styles.propSection}>
              <h4>Flexbox</h4>
              <div className={styles.propRow}>
                <span>flex-direction</span>
                <span>{element.styles.flexDirection}</span>
              </div>
              <div className={styles.propRow}>
                <span>justify-content</span>
                <span>{element.styles.justifyContent}</span>
              </div>
              <div className={styles.propRow}>
                <span>align-items</span>
                <span>{element.styles.alignItems}</span>
              </div>
              <div className={styles.propRow}>
                <span>gap</span>
                <span className={styles.gapValue}>{element.styles.gap}</span>
              </div>
            </div>
          )}

          {/* Box Shadow */}
          {element.styles.boxShadow && element.styles.boxShadow !== 'none' && (
            <div className={styles.propSection}>
              <h4>🌓 Box Shadow</h4>
              <div className={styles.propRow}>
                <span>box-shadow</span>
                <span className={styles.shadowValue}>
                  <span 
                    className={styles.shadowPreview} 
                    style={{ boxShadow: element.styles.boxShadow }}
                  />
                  {element.styles.boxShadow}
                </span>
              </div>
            </div>
          )}

          {/* Text Shadow */}
          {element.styles.textShadow && element.styles.textShadow !== 'none' && (
            <div className={styles.propSection}>
              <h4>✨ Text Shadow</h4>
              <div className={styles.propRow}>
                <span>text-shadow</span>
                <span className={styles.shadowValue}>
                  <span 
                    className={styles.textShadowPreview}
                    style={{ textShadow: element.styles.textShadow }}
                  >
                    Aa
                  </span>
                  {element.styles.textShadow}
                </span>
              </div>
            </div>
          )}

          {/* Spacing между элементами */}
          <div className={styles.propSection}>
            <h4>📏 Отступы</h4>
            <div className={styles.spacingGrid}>
              <div className={styles.spacingItem}>
                <span className={styles.spacingLabel}>Margin</span>
                <div className={styles.spacingValues}>
                  <span title="top">{parseInt(element.styles.marginTop) || 0}</span>
                  <span title="right">{parseInt(element.styles.marginRight) || 0}</span>
                  <span title="bottom">{parseInt(element.styles.marginBottom) || 0}</span>
                  <span title="left">{parseInt(element.styles.marginLeft) || 0}</span>
                </div>
              </div>
              <div className={styles.spacingItem}>
                <span className={styles.spacingLabel}>Padding</span>
                <div className={styles.spacingValues}>
                  <span title="top">{parseInt(element.styles.paddingTop) || 0}</span>
                  <span title="right">{parseInt(element.styles.paddingRight) || 0}</span>
                  <span title="bottom">{parseInt(element.styles.paddingBottom) || 0}</span>
                  <span title="left">{parseInt(element.styles.paddingLeft) || 0}</span>
                </div>
              </div>
              {element.styles.gap && element.styles.gap !== 'normal' && (
                <div className={styles.spacingItem}>
                  <span className={styles.spacingLabel}>Gap</span>
                  <div className={styles.spacingValues}>
                    <span className={styles.gapHighlight}>{element.styles.gap}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {element.styles.borderRadius !== '0px' && (
            <div className={styles.propSection}>
              <h4>Другое</h4>
              <div className={styles.propRow}>
                <span>border-radius</span>
                <span>{element.styles.borderRadius}</span>
              </div>
              {element.styles.border !== 'none' && element.styles.border !== '0px none rgb(0, 0, 0)' && (
                <div className={styles.propRow}>
                  <span>border</span>
                  <span>{element.styles.border}</span>
                </div>
              )}
              {element.styles.opacity !== '1' && (
                <div className={styles.propRow}>
                  <span>opacity</span>
                  <span>{element.styles.opacity}</span>
                </div>
              )}
              {element.styles.transform !== 'none' && (
                <div className={styles.propRow}>
                  <span>transform</span>
                  <span className={styles.transformValue}>{element.styles.transform}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Экран выбора уровней
  if (!selectedLevel) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={onBack} className={styles.backBtn}>
            <FaArrowLeft /> Назад
          </button>
          <h1 className={styles.title}>
            <FaCode /> Верстка
          </h1>
          {stats && (
            <div className={styles.stats}>
              <span><FaTrophy /> {stats.completed_levels}/{stats.total_levels}</span>
              <span><BsLightningChargeFill /> {parseFloat(stats.average_accuracy).toFixed(1)}%</span>
            </div>
          )}
          <button 
            className={styles.emmetHelpBtn}
            onClick={() => setShowEmmetHelp(true)}
          >
            <FaQuestionCircle /> Справка Emmet
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка уровней...</div>
        ) : levels.length === 0 ? (
          <div className={styles.empty}>
            <FaCode className={styles.emptyIcon} />
            <p>Пока нет доступных уровней</p>
            <p className={styles.emptyHint}>Администратор скоро добавит новые задания</p>
          </div>
        ) : (
          <div className={styles.levelsGrid}>
            {levels.map((level, index) => {
              // Теперь completed уже boolean после нормализации в loadLevels
              const prevCompleted = index === 0 || levels[index - 1].completed;
              const isLocked = !prevCompleted;
              
              return (
                <div 
                  key={level.id}
                  className={`${styles.levelCard} ${level.completed ? styles.completed : ''} ${isLocked ? styles.locked : ''}`}
                  onClick={() => !isLocked && selectLevel(level)}
                >
                  {isLocked && (
                    <div className={styles.lockOverlay}>
                      <FaLock />
                    </div>
                  )}
                  
                  <div className={styles.levelIcon}>
                    <FaCode />
                    <span className={styles.levelNumber}>{index + 1}</span>
                  </div>
                  
                  <div className={styles.levelInfo}>
                    <h3>{level.title}</h3>
                    <p>{level.description}</p>
                    
                    <div className={styles.levelMeta}>
                      <span className={styles.difficulty}>
                        {Array(level.difficulty).fill('⭐').join('')}
                      </span>
                      <span className={styles.points}>+{level.points_reward} очков</span>
                    </div>
                    
                    {level.completed && (
                      <div className={styles.completedBadge}>
                        <FaCheck /> {parseFloat(level.best_accuracy).toFixed(1)}%
                      </div>
                    )}
                    
                    {level.attempts > 0 && !level.completed && (
                      <div className={styles.attemptsBadge}>
                        Попыток: {level.attempts}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Модальное окно справки Emmet */}
        {showEmmetHelp && (
          <div className={styles.modalOverlay} onClick={() => setShowEmmetHelp(false)}>
            <div className={styles.emmetHelpModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2><FaBook /> Справка по Emmet</h2>
                <button className={styles.closeModal} onClick={() => setShowEmmetHelp(false)}>
                  <FaTimes />
                </button>
              </div>
              
              <div className={styles.modalContent}>
                <section className={styles.helpSection}>
                  <h3><FaKeyboard /> Как использовать</h3>
                  <p>Введите аббревиатуру и нажмите <kbd>Tab</kbd> или <kbd>Enter</kbd> для раскрытия.</p>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaTags /> HTML - Базовые теги</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>div</code>
                      <span>→</span>
                      <code>{`<div></div>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>p</code>
                      <span>→</span>
                      <code>{`<p></p>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>a</code>
                      <span>→</span>
                      <code>{`<a href=""></a>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>img</code>
                      <span>→</span>
                      <code>{`<img src="" alt="">`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>input</code>
                      <span>→</span>
                      <code>{`<input type="text">`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>btn</code>
                      <span>→</span>
                      <code>{`<button></button>`}</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaCrosshairs /> Классы и ID</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>div.container</code>
                      <span>→</span>
                      <code>{`<div class="container"></div>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>div#main</code>
                      <span>→</span>
                      <code>{`<div id="main"></div>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>.box</code>
                      <span>→</span>
                      <code>{`<div class="box"></div>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>p.text.large</code>
                      <span>→</span>
                      <code>{`<p class="text large"></p>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>div#id.class</code>
                      <span>→</span>
                      <code>{`<div id="id" class="class"></div>`}</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaSitemap /> Вложенность</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>div{'>'}p</code>
                      <span>→</span>
                      <code>{`<div><p></p></div>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>ul{'>'}li</code>
                      <span>→</span>
                      <code>{`<ul><li></li></ul>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>nav{'>'}ul{'>'}li{'>'}a</code>
                      <span>→</span>
                      <code>вложенная структура</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>div+p</code>
                      <span>→</span>
                      <code>{`<div></div><p></p>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>div{'>'}p^span</code>
                      <span>→</span>
                      <code>подняться на уровень</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaClone /> Умножение</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>li*5</code>
                      <span>→</span>
                      <code>5 элементов li</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>ul{'>'}li*3</code>
                      <span>→</span>
                      <code>ul с 3 li внутри</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>div.item$*3</code>
                      <span>→</span>
                      <code>item1, item2, item3</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>h${'{'}Заголовок{'}'}</code>
                      <span>→</span>
                      <code>h1-h6 с текстом</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaPen /> Текст и атрибуты</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>p{'{'}Текст{'}'}</code>
                      <span>→</span>
                      <code>{`<p>Текст</p>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>a[href=#]</code>
                      <span>→</span>
                      <code>{`<a href="#"></a>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>input[type=email]</code>
                      <span>→</span>
                      <code>{`<input type="email">`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>img[src=img.jpg]</code>
                      <span>→</span>
                      <code>{`<img src="img.jpg">`}</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaPalette /> CSS - Основные свойства</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>m10</code>
                      <span>→</span>
                      <code>margin: 10px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>p20</code>
                      <span>→</span>
                      <code>padding: 20px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>w100</code>
                      <span>→</span>
                      <code>width: 100px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>h50</code>
                      <span>→</span>
                      <code>height: 50px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>w100p</code>
                      <span>→</span>
                      <code>width: 100%;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>fz16</code>
                      <span>→</span>
                      <code>font-size: 16px;</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaBoxes /> CSS - Flexbox</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>df</code>
                      <span>→</span>
                      <code>display: flex;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>jcc</code>
                      <span>→</span>
                      <code>justify-content: center;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>jcsb</code>
                      <span>→</span>
                      <code>justify-content: space-between;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>aic</code>
                      <span>→</span>
                      <code>align-items: center;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>fxd</code>
                      <span>→</span>
                      <code>flex-direction:</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>fww</code>
                      <span>→</span>
                      <code>flex-wrap: wrap;</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaImage /> CSS - Позиционирование</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>posa</code>
                      <span>→</span>
                      <code>position: absolute;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>posr</code>
                      <span>→</span>
                      <code>position: relative;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>posf</code>
                      <span>→</span>
                      <code>position: fixed;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>t0</code>
                      <span>→</span>
                      <code>top: 0;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>l10</code>
                      <span>→</span>
                      <code>left: 10px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>z10</code>
                      <span>→</span>
                      <code>z-index: 10;</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaAdjust /> CSS - Внешний вид</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>bgc#f00</code>
                      <span>→</span>
                      <code>background-color: #f00;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>c#333</code>
                      <span>→</span>
                      <code>color: #333;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>bd1-s-#000</code>
                      <span>→</span>
                      <code>border: 1px solid #000;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>bdr5</code>
                      <span>→</span>
                      <code>border-radius: 5px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>op50p</code>
                      <span>→</span>
                      <code>opacity: 50%;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>bxsh</code>
                      <span>→</span>
                      <code>box-shadow:</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaFont /> CSS - Текст</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>tac</code>
                      <span>→</span>
                      <code>text-align: center;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>fwb</code>
                      <span>→</span>
                      <code>font-weight: bold;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>lh1.5</code>
                      <span>→</span>
                      <code>line-height: 1.5;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>tdn</code>
                      <span>→</span>
                      <code>text-decoration: none;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>ttu</code>
                      <span>→</span>
                      <code>text-transform: uppercase;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>ls2</code>
                      <span>→</span>
                      <code>letter-spacing: 2px;</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaRocket /> Полезные комбинации</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>!</code>
                      <span>→</span>
                      <code>HTML5 шаблон</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>link:css</code>
                      <span>→</span>
                      <code>подключение CSS</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>script:src</code>
                      <span>→</span>
                      <code>подключение JS</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>ul.nav{'>'}li.nav-item*5{'>'}a</code>
                      <span>→</span>
                      <code>навигация</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>table{'>'}tr*3{'>'}td*3</code>
                      <span>→</span>
                      <code>таблица 3x3</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>form{'>'}input*3+button</code>
                      <span>→</span>
                      <code>форма</code>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Экран игры
  return (
    <div className={`${styles.gameContainer} ${isFullscreen ? styles.fullscreen : ''}`}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button onClick={() => setSelectedLevel(null)} className={styles.backBtn}>
          <FaArrowLeft /> К уровням
        </button>
        
        <div className={styles.levelTitle}>
          <h2>{selectedLevel.title}</h2>
          <span className={styles.levelDesc}>{selectedLevel.description}</span>
        </div>
        
        <div className={styles.toolbarActions}>
          <button 
            onClick={() => setInspectorEnabled(!inspectorEnabled)}
            className={`${styles.toolBtn} ${inspectorEnabled ? styles.active : ''}`}
            title="Инспектор элементов"
          >
            <FaRuler />
          </button>
          
          <button 
            onClick={() => setShowTargetOverlay(!showTargetOverlay)}
            className={`${styles.toolBtn} ${showTargetOverlay ? styles.active : ''}`}
            title="Показать/скрыть макет"
          >
            {showTargetOverlay ? <FaEye /> : <FaEyeSlash />}
          </button>
          
          <button 
            onClick={checkLayout} 
            className={styles.checkBtn}
            disabled={isChecking}
          >
            {isChecking ? 'Проверка...' : <><FaPlay /> Проверить</>}
          </button>
          
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className={styles.fullscreenBtn}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      {/* Result bar */}
      {lastResult && (
        <div className={`${styles.resultBar} ${lastResult.completed ? styles.success : styles.warning}`}>
          {lastResult.completed ? (
            <>
              <FaCheck /> Уровень пройден! Точность: {lastResult.accuracy.toFixed(1)}%
              {lastResult.pointsAwarded > 0 && ` (+${lastResult.pointsAwarded} очков)`}
              {hasNextLevel && (
                <button onClick={goToNextLevel} className={styles.nextButton}>
                  <FaRocket /> Следующий уровень
                </button>
              )}
              {!hasNextLevel && (
                <button onClick={() => setSelectedLevel(null)} className={styles.nextButton}>
                  <FaTrophy /> К списку уровней
                </button>
              )}
            </>
          ) : (
            <>
              <FaTimes /> Точность: {lastResult.accuracy.toFixed(1)}% (нужно 95%)
            </>
          )}
        </div>
      )}

      {/* Main content */}
      <div className={styles.workspace}>
        {/* Левая панель - Целевой макет с инспектором */}
        <div className={styles.targetPanel}>
          <div className={styles.panelHeader}>
            <FaRuler /> Макет (цель) 
            <span className={styles.hint}>- наведите чтобы увидеть размеры</span>
          </div>
          <div 
            className={styles.targetFrame}
            onMouseMove={handleTargetMouseMove}
            onMouseLeave={handleTargetMouseLeave}
            onClick={handleTargetClick}
          >
            <iframe
              ref={targetFrameRef}
              className={styles.iframe}
              title="Target"
              style={{
                width: selectedLevel.canvas_width || 800,
                height: selectedLevel.canvas_height || 600,
                pointerEvents: 'none'
              }}
            />
            {/* Подсветка элемента */}
            {hoveredElement && inspectorEnabled && (
              <div 
                className={styles.elementHighlight}
                style={{
                  top: hoveredElement.bounds.top,
                  left: hoveredElement.bounds.left,
                  width: hoveredElement.bounds.width,
                  height: hoveredElement.bounds.height
                }}
              >
                <div className={styles.highlightLabel}>
                  {hoveredElement.bounds.width} × {hoveredElement.bounds.height}
                </div>
              </div>
            )}
            
            {/* Подсветка ВЫБРАННОГО элемента (постоянная) */}
            {selectedElement && inspectorEnabled && (
              <div 
                className={`${styles.elementHighlight} ${styles.selectedHighlight}`}
                style={{
                  top: selectedElement.bounds.top,
                  left: selectedElement.bounds.left,
                  width: selectedElement.bounds.width,
                  height: selectedElement.bounds.height
                }}
              >
                <div className={styles.highlightLabel} style={{ background: '#10b981' }}>
                  {selectedElement.tagName} • {selectedElement.bounds.width} × {selectedElement.bounds.height}
                </div>
              </div>
            )}
            
            {/* Линия расстояния при Alt+hover */}
            {altPressed && selectedElement && hoveredElement && selectedElement !== hoveredElement && (
              <div className={styles.measureLine}>
                {(() => {
                  const dist = calculateDistance(selectedElement, hoveredElement);
                  const startCenter = {
                    x: selectedElement.bounds.left + selectedElement.bounds.width / 2,
                    y: selectedElement.bounds.top + selectedElement.bounds.height / 2
                  };
                  const endCenter = {
                    x: hoveredElement.bounds.left + hoveredElement.bounds.width / 2,
                    y: hoveredElement.bounds.top + hoveredElement.bounds.height / 2
                  };
                  
                  return (
                    <>
                      {/* Подсветка выбранного элемента */}
                      <div 
                        className={`${styles.elementHighlight} ${styles.measureHighlight}`}
                        style={{
                          top: selectedElement.bounds.top,
                          left: selectedElement.bounds.left,
                          width: selectedElement.bounds.width,
                          height: selectedElement.bounds.height,
                          borderColor: '#f59e0b'
                        }}
                      />
                      {/* Подсветка наведённого элемента */}
                      <div 
                        className={`${styles.elementHighlight} ${styles.measureHighlight}`}
                        style={{
                          top: hoveredElement.bounds.top,
                          left: hoveredElement.bounds.left,
                          width: hoveredElement.bounds.width,
                          height: hoveredElement.bounds.height,
                          borderColor: '#3b82f6'
                        }}
                      />
                      <svg className={styles.measureSvg}>
                        <line 
                          x1={startCenter.x} 
                          y1={startCenter.y} 
                          x2={endCenter.x} 
                          y2={endCenter.y}
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                      </svg>
                      <div 
                        className={styles.measureResult}
                        style={{
                          left: (startCenter.x + endCenter.x) / 2,
                          top: (startCenter.y + endCenter.y) / 2
                        }}
                      >
                        <span>↔ {dist?.horizontal || 0}px</span>
                        <span>↕ {dist?.vertical || 0}px</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          
          {/* Инспектор */}
          {inspectorEnabled && (
            <div className={styles.inspector}>
              <div className={styles.inspectorTitle}>
                <FaMousePointer /> Инспектор
                {selectedElement && (
                  <button 
                    className={styles.clearSelection}
                    onClick={() => setSelectedElement(null)}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              {renderInspector()}
              {selectedElement && (
                <div className={styles.measureHintBar}>
                  💡 Зажмите <kbd>Alt</kbd> и наведите на другой элемент для измерения расстояния
                </div>
              )}
            </div>
          )}
        </div>

        {/* Центр - Редактор кода */}
        <div className={styles.editorPanel}>
          <div className={styles.panelHeader}>
            <FaCode /> Редактор
            <span className={styles.emmetHint}>Tab/Enter = Emmet</span>
          </div>
          <div className={styles.editorTabs}>
            <span className={styles.tabActive}>HTML</span>
          </div>
          <div className={styles.editorWrapper}>
            <div ref={htmlHighlightRef} className={styles.highlightContainer}>
              <CodeHighlight code={htmlCode} language="html" />
            </div>
            <textarea
              ref={htmlEditorRef}
              className={styles.codeEditor}
              value={htmlCode}
              onChange={(e) => {
                setHtmlCode(e.target.value);
                handleEditorInput(e, true);
              }}
              onKeyDown={(e) => handleEditorKeyDown(e, true)}
              onScroll={() => syncScroll(htmlEditorRef, htmlHighlightRef)}
              onBlur={() => setTimeout(() => setEmmetSuggestion(null), 200)}
              placeholder="Ваш HTML код... (Emmet: div.class, ul>li*3)"
              spellCheck={false}
            />
          </div>
          <div className={styles.editorTabs}>
            <span className={styles.tabActive}>CSS</span>
          </div>
          <div className={styles.editorWrapper}>
            <div ref={cssHighlightRef} className={styles.highlightContainer}>
              <CodeHighlight code={cssCode} language="css" />
            </div>
            <textarea
              ref={cssEditorRef}
              className={styles.codeEditor}
              value={cssCode}
              onChange={(e) => {
                setCssCode(e.target.value);
                handleEditorInput(e, false);
              }}
              onKeyDown={(e) => handleEditorKeyDown(e, false)}
              onScroll={() => syncScroll(cssEditorRef, cssHighlightRef)}
              onBlur={() => setTimeout(() => setEmmetSuggestion(null), 200)}
              placeholder="Ваши CSS стили... (Emmet: m10, p20, df, jcc)"
              spellCheck={false}
            />
          </div>
          
        </div>

        {/* Emmet подсказка - позиционируется над курсором */}
        {emmetSuggestion && (
          <div 
            className={styles.emmetSuggestionPopup}
            style={{
              top: suggestionPos.top,
              left: suggestionPos.left
            }}
            onClick={applySuggestion}
          >
            <div className={styles.suggestionHeader}>
              <span className={styles.suggestionAbbrev}>{emmetSuggestion.abbreviation}</span>
              <span className={styles.suggestionKeys}>Tab / Enter</span>
            </div>
            <pre className={styles.suggestionPreview}>
              {emmetSuggestion.expanded.length > 200 
                ? emmetSuggestion.expanded.slice(0, 200) + '...' 
                : emmetSuggestion.expanded}
            </pre>
          </div>
        )}

        {/* Правая панель - Превью */}
        <div className={styles.previewPanel}>
          <div className={styles.panelHeader}>
            <FaPlay /> Ваш результат
          </div>
          <div className={styles.previewContainer}>
            <iframe
              ref={previewFrameRef}
              className={styles.iframe}
              title="Preview"
              style={{
                width: selectedLevel.canvas_width || 800,
                height: selectedLevel.canvas_height || 600
              }}
            />
            {/* Полупрозрачный оверлей макета для сравнения */}
            {showTargetOverlay && (
              <div className={styles.overlayFrame}>
                <iframe
                  className={styles.iframe}
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                        ${selectedLevel.target_css || ''}
                      </style>
                    </head>
                    <body>${selectedLevel.target_html || ''}</body>
                    </html>
                  `}
                  title="Overlay"
                  style={{
                    width: selectedLevel.canvas_width || 800,
                    height: selectedLevel.canvas_height || 600
                  }}
                />
              </div>
            )}
          </div>
          <div className={styles.overlayControls}>
            <label>
              <input 
                type="checkbox" 
                checked={showTargetOverlay}
                onChange={(e) => setShowTargetOverlay(e.target.checked)}
              />
              Показать макет поверх (для сравнения)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LayoutGame;
