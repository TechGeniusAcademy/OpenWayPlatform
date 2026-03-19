import { useState, useMemo, useCallback } from "react";
import * as Fa  from "react-icons/fa";
import * as Fa6 from "react-icons/fa6";
import * as Ai  from "react-icons/ai";
import * as Hi  from "react-icons/hi";
import * as Md  from "react-icons/md";
import * as Bi  from "react-icons/bi";
import * as Lu  from "react-icons/lu";
import * as Ri  from "react-icons/ri";
import * as Bs  from "react-icons/bs";
import * as Tb  from "react-icons/tb";
import styles from "./StudentIcons.module.css";

// ─── HTML class helpers ───────────────────────────────────────────
function camelToKebab(str) {
  return str.replace(/([A-Z])/g, (m, _, i) =>
    i === 0 ? m.toLowerCase() : "-" + m.toLowerCase()
  );
}
const FA_BRANDS = new Set([
  "github","twitter","instagram","facebook","youtube","telegram","whatsapp",
  "discord","slack","linkedin","google","apple","windows","linux","npm",
  "react","js","html5","css3","python","java","php","swift","rust","git",
  "figma","codepen","dribbble","pinterest","reddit","spotify",
  "vuejs","angular","docker","bitbucket","gitlab","vk",
]);
function getHtmlClass(name, setId) {
  if (setId === "fa" || setId === "fa6") {
    const kebab = camelToKebab(name.replace(/^Fa\d*/, ""));
    const isBrand = FA_BRANDS.has(kebab.split("-")[0]);
    return `<i class="${isBrand ? "fab" : "fas"} fa-${kebab}"></i>`;
  }
  if (setId === "bs") {
    const kebab = camelToKebab(name.replace(/^Bs/, ""));
    return `<i class="bi bi-${kebab}"></i>`;
  }
  if (setId === "md") {
    const snake = camelToKebab(name.replace(/^Md/, "")).replace(/-/g, "_");
    return `<span class="material-icons">${snake}</span>`;
  }
  return null;
}

// ─── Icon catalog ─────────────────────────────────────────────────
const SETS = [
  {
    id: "fa", label: "Font Awesome", pkg: "react-icons/fa", color: "#528dd3",
    icons: [
      "FaHome","FaUser","FaEnvelope","FaCog","FaTrash","FaEdit","FaPlus","FaMinus",
      "FaSearch","FaBell","FaHeart","FaStar","FaCheck","FaTimes","FaArrowLeft",
      "FaArrowRight","FaArrowUp","FaArrowDown","FaDownload","FaUpload","FaFile",
      "FaFolder","FaFolderOpen","FaImage","FaMusic","FaFilm","FaCamera","FaPhone",
      "FaLock","FaUnlock","FaKey","FaGlobe","FaLink","FaCopy","FaPaste","FaCode",
      "FaTerminal","FaDatabase","FaServer","FaCloud","FaWifi","FaBluetooth",
      "FaDesktop","FaMobile","FaTablet","FaPrint","FaScissors","FaShareAlt",
      "FaBookmark","FaTag","FaTags","FaFlag","FaMap","FaMapMarker","FaCompass",
      "FaCalendar","FaClock","FaHourglass","FaHistory","FaRedo","FaUndo",
      "FaPlay","FaPause","FaStop","FaForward","FaBackward","FaVolumeUp",
      "FaVolumeMute","FaHeadphones","FaGamepad","FaTrophy","FaMedal","FaFire",
      "FaRocket","FaBolt","FaMagic","FaWand","FaGift","FaShoppingCart",
      "FaCreditCard","FaMoneyBill","FaChartBar","FaChartLine","FaChartPie",
      "FaTable","FaList","FaTh","FaBars","FaEllipsisH","FaEllipsisV",
      "FaInfoCircle","FaExclamationCircle","FaQuestionCircle","FaCheckCircle",
      "FaTimesCircle","FaPlusCircle","FaMinusCircle","FaArrowCircleRight",
      "FaGithub","FaTwitter","FaInstagram","FaFacebook","FaYoutube","FaTelegram",
      "FaWhatsapp","FaDiscord","FaSlack","FaLinkedin","FaGoogle","FaApple",
      "FaWindows","FaLinux","FaNpm","FaReact","FaJs","FaHtml5","FaCss3",
      "FaPython","FaJava","FaPhp","FaSwift","FaRust","FaGit",
      "FaUserPlus","FaUsers","FaUserCircle","FaAddressCard","FaIdBadge",
      "FaPaperPlane","FaComment","FaComments","FaReply","FaThumbsUp","FaThumbsDown",
      "FaEye","FaEyeSlash","FaFilter","FaSort","FaSortUp","FaSortDown",
      "FaExpand","FaCompress","FaExternalLinkAlt","FaSyncAlt","FaSpinner",
    ],
    lib: Fa,
  },
  {
    id: "ai", label: "Ant Design", pkg: "react-icons/ai", color: "#1677ff",
    icons: [
      "AiOutlineHome","AiOutlineUser","AiOutlineSetting","AiOutlineDelete",
      "AiOutlineEdit","AiOutlinePlus","AiOutlineMinus","AiOutlineSearch",
      "AiOutlineBell","AiOutlineHeart","AiOutlineStar","AiOutlineCheck",
      "AiOutlineClose","AiOutlineArrowLeft","AiOutlineArrowRight","AiOutlineArrowUp",
      "AiOutlineArrowDown","AiOutlineDownload","AiOutlineUpload","AiOutlineFile",
      "AiOutlineFolder","AiOutlinePicture","AiOutlineCloud","AiOutlineLink",
      "AiOutlineCopy","AiOutlineCode","AiOutlineDatabase","AiOutlineDesktop",
      "AiOutlineMobile","AiOutlinePrinter","AiOutlineShareAlt","AiOutlineBookmark",
      "AiOutlineTag","AiOutlineFlag","AiOutlineCalendar","AiOutlineClockCircle",
      "AiOutlineReload","AiOutlinePlayCircle","AiOutlinePauseCircle",
      "AiOutlineStop","AiOutlineSound","AiOutlineShoppingCart","AiOutlineWallet",
      "AiOutlineBarChart","AiOutlineLineChart","AiOutlinePieChart","AiOutlineTable",
      "AiOutlineUnorderedList","AiOutlineAppstore","AiOutlineMenu",
      "AiOutlineInfoCircle","AiOutlineWarning","AiOutlineQuestionCircle",
      "AiOutlineCheckCircle","AiOutlineCloseCircle","AiOutlinePlusCircle",
      "AiOutlineGithub","AiOutlineTwitter","AiOutlineYoutube","AiOutlineGoogle",
      "AiOutlineMail","AiOutlinePhone","AiOutlineLock","AiOutlineUnlock",
      "AiOutlineEye","AiOutlineEyeInvisible","AiOutlineFilter","AiOutlineSort",
      "AiOutlineFullscreen","AiOutlineFullscreenExit","AiOutlineSync",
      "AiOutlineLoading","AiOutlineDashboard","AiOutlineCompass","AiOutlineRocket",
      "AiOutlineThunderbolt","AiOutlineFire","AiOutlineCrown","AiOutlineTrophy",
      "AiOutlineMessage","AiOutlineComment","AiOutlineLike","AiOutlineDislike",
      "AiOutlineTeam","AiOutlineUserAdd","AiOutlineIdcard","AiOutlineSafety",
      "AiOutlineShield","AiOutlineApi","AiOutlineBug","AiOutlineTool",
    ],
    lib: Ai,
  },
  {
    id: "hi", label: "Heroicons", pkg: "react-icons/hi", color: "#7c3aed",
    icons: [
      "HiHome","HiUser","HiCog","HiTrash","HiPencil","HiPlus","HiMinus",
      "HiSearch","HiBell","HiHeart","HiStar","HiCheck","HiX","HiArrowLeft",
      "HiArrowRight","HiArrowUp","HiArrowDown","HiDownload","HiUpload",
      "HiDocument","HiFolder","HiPhotograph","HiCloud","HiLink","HiClipboard",
      "HiCode","HiDatabase","HiDesktopComputer","HiDeviceMobile","HiPrinter",
      "HiShare","HiBookmark","HiTag","HiFlag","HiMap","HiCalendar","HiClock",
      "HiRefresh","HiPlay","HiPause","HiStop","HiVolumeUp","HiShoppingCart",
      "HiCurrencyDollar","HiChartBar","HiChartPie","HiTable","HiViewList",
      "HiViewGrid","HiMenu","HiDotsHorizontal","HiDotsVertical",
      "HiInformationCircle","HiExclamation","HiQuestionMarkCircle",
      "HiCheckCircle","HiXCircle","HiPlusCircle","HiMinusCircle",
      "HiMail","HiPhone","HiLockClosed","HiLockOpen","HiEye","HiEyeOff",
      "HiFilter","HiSortAscending","HiSortDescending","HiExpand","HiZoomIn",
      "HiZoomOut","HiExternalLink","HiSwitchHorizontal","HiAdjustments",
      "HiColorSwatch","HiTemplate","HiPuzzle","HiCube","HiBeaker","HiChip",
      "HiGlobe","HiWifi","HiLightBulb","HiSparkles","HiLightningBolt",
      "HiMusicNote","HiFilm","HiCamera","HiMicrophone","HiSpeakerphone",
      "HiEmojiHappy","HiEmojiSad","HiUserGroup","HiUserAdd","HiUsers",
      "HiAnnotation","HiChatAlt","HiChatAlt2","HiReply","HiThumbUp",
    ],
    lib: Hi,
  },
  {
    id: "md", label: "Material Design", pkg: "react-icons/md", color: "#e53935",
    icons: [
      "MdHome","MdPerson","MdSettings","MdDelete","MdEdit","MdAdd","MdRemove",
      "MdSearch","MdNotifications","MdFavorite","MdStar","MdCheck","MdClose",
      "MdArrowBack","MdArrowForward","MdArrowUpward","MdArrowDownward",
      "MdFileDownload","MdFileUpload","MdInsertDriveFile","MdFolder","MdImage",
      "MdCloud","MdLink","MdContentCopy","MdCode","MdStorage","MdComputer",
      "MdSmartphone","MdPrint","MdShare","MdBookmark","MdLabel","MdFlag",
      "MdMap","MdCalendarToday","MdSchedule","MdRefresh","MdPlayArrow",
      "MdPause","MdStop","MdVolumeUp","MdVolumeOff","MdHeadphones",
      "MdShoppingCart","MdCreditCard","MdAttachMoney","MdBarChart","MdShowChart",
      "MdPieChart","MdTableChart","MdList","MdApps","MdMenu","MdMoreHoriz",
      "MdMoreVert","MdInfo","MdError","MdHelp","MdCheckCircle","MdCancel",
      "MdAddCircle","MdRemoveCircle","MdEmail","MdPhone","MdLock","MdLockOpen",
      "MdVisibility","MdVisibilityOff","MdFilterList","MdSort","MdFullscreen",
      "MdFullscreenExit","MdOpenInNew","MdSync","MdDashboard","MdExplore",
      "MdLightbulb","MdFlashOn","MdMusics","MdMovie","MdCamera","MdMic",
      "MdSpeaker","MdSentimentSatisfied","MdGroup","MdPersonAdd","MdChat",
      "MdForum","MdReply","MdThumbUp","MdThumbDown","MdSecurity","MdBuildCircle",
      "MdRocketLaunch","MdExtension","MdPalette","MdBrush","MdAutoFixHigh",
    ],
    lib: Md,
  },
  {
    id: "bi", label: "Bootstrap Icons", pkg: "react-icons/bi", color: "#7952b3",
    icons: [
      "BiHome","BiUser","BiCog","BiTrash","BiEdit","BiPlus","BiMinus",
      "BiSearch","BiBell","BiHeart","BiStar","BiCheck","BiX","BiArrowLeft",
      "BiArrowRight","BiArrowUp","BiArrowDown","BiDownload","BiUpload",
      "BiFile","BiFolder","BiImage","BiCloud","BiLink","BiCopy","BiCode",
      "BiData","BiDesktop","BiMobile","BiPrinter","BiShare","BiBookmark",
      "BiTag","BiFlag","BiMap","BiCalendar","BiTime","BiRefresh","BiPlay",
      "BiPause","BiStop","BiVolumeFull","BiVolumeMute","BiHeadphone",
      "BiCart","BiCreditCard","BiDollar","BiBarChart","BiLineChart",
      "BiPieChart","BiTable","BiListUl","BiGrid","BiMenu","BiDotsHorizontal",
      "BiDotsVertical","BiInfoCircle","BiError","BiHelpCircle","BiCheckCircle",
      "BiXCircle","BiPlusCircle","BiMinusCircle","BiEnvelope","BiPhone",
      "BiLock","BiLockOpen","BiShow","BiHide","BiFilterAlt","BiSortAlt2",
      "BiFullscreen","BiFullscreenExit","BiLinkExternal","BiSync","BiTachometer",
      "BiCompass","BiBulb","BiBolt","BiMusic","BiMoviePlay","BiCamera",
      "BiMicrophone","BiSpeaker","BiSmile","BiGroup","BiUserPlus","BiChat",
      "BiMessageSquare","BiReply","BiLike","BiDislike","BiShield","BiWrench",
      "BiRocket","BiExtension","BiPalette","BiBrush","BiMagicWand","BiAtom",
      "BiGlobe","BiWifi","BiGitBranch","BiTerminal","BiCodeAlt","BiServer",
    ],
    lib: Bi,
  },
  {
    id: "lu", label: "Lucide", pkg: "react-icons/lu", color: "#f97316",
    icons: [
      "LuHome","LuUser","LuSettings","LuTrash","LuPencil","LuPlus","LuMinus",
      "LuSearch","LuBell","LuHeart","LuStar","LuCheck","LuX","LuArrowLeft",
      "LuArrowRight","LuArrowUp","LuArrowDown","LuDownload","LuUpload",
      "LuFile","LuFolder","LuImage","LuCloud","LuLink","LuCopy","LuCode",
      "LuDatabase","LuMonitor","LuSmartphone","LuPrinter","LuShare","LuBookmark",
      "LuTag","LuFlag","LuMap","LuCalendar","LuClock","LuRefreshCw","LuPlay",
      "LuPause","LuSquare","LuVolume2","LuVolumeX","LuHeadphones","LuShoppingCart",
      "LuCreditCard","LuDollarSign","LuBarChart","LuLineChart","LuPieChart",
      "LuTable","LuList","LuLayoutGrid","LuMenu","LuMoreHorizontal","LuMoreVertical",
      "LuInfo","LuAlertCircle","LuHelpCircle","LuCheckCircle","LuXCircle",
      "LuPlusCircle","LuMinusCircle","LuMail","LuPhone","LuLock","LuUnlock",
      "LuEye","LuEyeOff","LuFilter","LuArrowUpDown","LuMaximize","LuMinimize",
      "LuExternalLink","LuRefreshCcw","LuGauge","LuCompass","LuLightbulb",
      "LuZap","LuMusic","LuFilm","LuCamera","LuMic","LuSpeaker","LuSmile",
      "LuUsers","LuUserPlus","LuMessageSquare","LuMessageCircle","LuReply",
      "LuThumbsUp","LuThumbsDown","LuShield","LuWrench","LuRocket","LuPuzzle",
      "LuPalette","LuBrush","LuWand","LuGlobe","LuWifi","LuGitBranch",
      "LuTerminal","LuCode2","LuServer","LuPackage","LuBox","LuHouse",
    ],
    lib: Lu,
  },
  {
    id: "ri", label: "Remix Icons", pkg: "react-icons/ri", color: "#06b6d4",
    icons: [
      "RiHomeLine","RiUserLine","RiSettings3Line","RiDeleteBin6Line","RiEditLine",
      "RiAddLine","RiSubtractLine","RiSearchLine","RiNotification3Line",
      "RiHeartLine","RiStarLine","RiCheckLine","RiCloseLine","RiArrowLeftLine",
      "RiArrowRightLine","RiArrowUpLine","RiArrowDownLine","RiDownloadLine",
      "RiUpload2Line","RiFileLine","RiFolderLine","RiImageLine","RiCloudLine",
      "RiLinkLine","RiFileCopyLine","RiCodeLine","RiDatabase2Line","RiComputerLine",
      "RiSmartphoneLine","RiPrinterLine","RiShareLine","RiBookmarkLine",
      "RiPriceTag3Line","RiFlagLine","RiMapLine","RiCalendarLine","RiTimeLine",
      "RiRefreshLine","RiPlayLine","RiPauseLine","RiStopLine","RiVolumeLine",
      "RiVolumeMuteLine","RiHeadphoneLine","RiShoppingCartLine","RiBankCard2Line",
      "RiMoneyDollarCircleLine","RiBarChartLine","RiLineChartLine","RiPieChartLine",
      "RiTableLine","RiListCheck","RiLayoutGridLine","RiMenuLine",
      "RiMore2Line","RiMoreLine","RiInformationLine","RiErrorWarningLine",
      "RiQuestionLine","RiCheckboxCircleLine","RiCloseCircleLine",
      "RiAddCircleLine","RiMailLine","RiPhoneLine","RiLockLine","RiLockUnlockLine",
      "RiEyeLine","RiEyeOffLine","RiFilter3Line","RiSortAsc","RiFullscreenLine",
      "RiExternalLinkLine","RiRefreshCwLine","RiDashboardLine","RiCompassLine",
      "RiLightbulbLine","RiFlashlightLine","RiMusicLine","RiFilmLine",
      "RiCameraLine","RiMicLine","RiSpeakerLine","RiEmojiHappyLine",
      "RiGroupLine","RiUserAddLine","RiChat1Line","RiMessage2Line","RiReplyLine",
      "RiThumbUpLine","RiThumbDownLine","RiShieldLine","RiToolsLine",
      "RiRocketLine","RiPlugLine","RiPaletteLine","RiBrushLine","RiMagicLine",
      "RiGlobalLine","RiWifiLine","RiGitBranchLine","RiTerminalLine","RiCodeSLine",
    ],
    lib: Ri,
  },
  {
    id: "bs", label: "Bootstrap", pkg: "react-icons/bs", color: "#712cf9",
    icons: [
      "BsHouse","BsPerson","BsGear","BsTrash","BsPencil","BsPlus","BsDash",
      "BsSearch","BsBell","BsHeart","BsStar","BsCheck","BsX","BsArrowLeft",
      "BsArrowRight","BsArrowUp","BsArrowDown","BsDownload","BsUpload",
      "BsFile","BsFolder","BsImage","BsCloud","BsLink","BsClipboard","BsCode",
      "BsDatabase","BsDisplay","BsPhone","BsPrinter","BsShare","BsBookmark",
      "BsTag","BsFlag","BsMap","BsCalendar","BsClock","BsArrowRepeat","BsPlay",
      "BsPause","BsStopCircle","BsVolumeUp","BsVolumeMute","BsHeadphones",
      "BsCart","BsCreditCard","BsCurrencyDollar","BsBarChart","BsGraphUp",
      "BsPieChart","BsTable","BsListUl","BsGrid","BsList","BsThreeDots",
      "BsThreeDotsVertical","BsInfoCircle","BsExclamationCircle","BsQuestion",
      "BsCheckCircle","BsXCircle","BsPlusCircle","BsDashCircle",
      "BsEnvelope","BsTelephone","BsLock","BsUnlock","BsEye","BsEyeSlash",
      "BsFunnel","BsSortAlphaUp","BsFullscreen","BsFullscreenExit",
      "BsBoxArrowUpRight","BsArrowClockwise","BsSpeedometer","BsCompass",
      "BsLightbulb","BsLightning","BsMusicNote","BsCameraVideo","BsCamera",
      "BsMic","BsSpeaker","BsEmojiSmile","BsPeople","BsPersonPlus","BsChatLeft",
      "BsChatSquare","BsReply","BsHandThumbsUp","BsHandThumbsDown","BsShield",
      "BsTools","BsRocketTakeoff","BsPuzzle","BsPalette","BsBrush","BsMagic",
      "BsGlobe","BsWifi","BsGit","BsTerminal","BsCodeSlash","BsServer",
    ],
    lib: Bs,
  },
  {
    id: "fa6", label: "Font Awesome 6", pkg: "react-icons/fa6", color: "#1d4ed8",
    icons: [
      "FaHouse","FaUser","FaEnvelope","FaGear","FaTrash","FaPen","FaPlus","FaMinus",
      "FaMagnifyingGlass","FaBell","FaHeart","FaStar","FaCheck","FaXmark",
      "FaArrowLeft","FaArrowRight","FaArrowUp","FaArrowDown",
      "FaDownload","FaUpload","FaFile","FaFolder","FaFolderOpen",
      "FaImage","FaMusic","FaFilm","FaCamera","FaPhone",
      "FaLock","FaUnlock","FaKey","FaGlobe","FaLink","FaCopy","FaCode",
      "FaDatabase","FaServer","FaCloud","FaDesktop","FaMobile","FaTablet",
      "FaPrint","FaShareNodes","FaBookmark","FaTag","FaTags","FaFlag",
      "FaMap","FaLocationDot","FaCompass","FaCalendar","FaClock",
      "FaRepeat","FaPlay","FaPause","FaStop","FaForward","FaBackward",
      "FaVolumeHigh","FaVolumeXmark","FaHeadphones",
      "FaGamepad","FaTrophy","FaMedal","FaFire","FaRocket","FaBolt",
      "FaWandMagicSparkles","FaGift","FaCartShopping","FaCreditCard","FaMoneyBill",
      "FaChartBar","FaChartLine","FaChartPie","FaTable","FaList",
      "FaTableCells","FaBars","FaEllipsis","FaEllipsisVertical",
      "FaCircleInfo","FaCircleExclamation","FaCircleQuestion",
      "FaCircleCheck","FaCircleXmark","FaCirclePlus","FaCircleMinus",
      "FaGithub","FaTwitter","FaInstagram","FaFacebook","FaYoutube",
      "FaTelegram","FaWhatsapp","FaDiscord","FaSlack","FaLinkedin",
      "FaGoogle","FaApple","FaWindows","FaLinux","FaNpm","FaPython",
      "FaGit","FaFigma","FaUsers","FaUserPlus","FaPaperPlane",
      "FaComment","FaComments","FaReply","FaThumbsUp","FaThumbsDown",
      "FaEye","FaEyeSlash","FaFilter","FaSort",
      "FaBrain","FaRobot","FaShield","FaShieldHalved","FaFingerprint","FaMicrochip",
      "FaGraduationCap","FaBook","FaBookOpen","FaNewspaper","FaPencil",
      "FaPalette","FaBrush","FaAtom","FaCar","FaCarSide","FaPlane","FaTrain","FaBus",
      "FaLeaf","FaTree","FaSun","FaMoon","FaSnowflake","FaUmbrella",
      "FaCoffee","FaMugHot","FaPizzaSlice","FaAppleWhole","FaBeer",
      "FaDog","FaCat","FaDragon","FaSpider",
      "FaFaceSmile","FaFaceFrown","FaFaceAngry","FaFaceLaughBeam",
      "FaChevronDown","FaChevronUp","FaChevronLeft","FaChevronRight",
      "FaAngleDown","FaAngleUp","FaAngleLeft","FaAngleRight",
      "FaSpinner","FaRotate","FaArrowsRotate","FaExpand","FaCompress",
      "FaArrowUpRightFromSquare","FaWrench","FaScrewdriver","FaHammer",
      "FaMicrophone","FaMicrophoneSlash","FaHeartbeat","FaVirus","FaDna",
      "FaBriefcase","FaBuilding","FaIndustry","FaHandshake",
      "FaPersonWalking","FaPersonRunning","FaChild","FaPerson",
      "FaCrown","FaDiamond","FaGun","FaBomb","FaSkull","FaGhost",
    ],
    lib: Fa6,
  },
  {
    id: "tb", label: "Tabler Icons", pkg: "react-icons/tb", color: "#0ea5e9",
    icons: [
      "TbHome","TbUser","TbSettings","TbTrash","TbEdit","TbPlus","TbMinus",
      "TbSearch","TbBell","TbHeart","TbStar","TbCheck","TbX","TbArrowLeft",
      "TbArrowRight","TbArrowUp","TbArrowDown","TbDownload","TbUpload",
      "TbFile","TbFolder","TbFolderOpen","TbPhoto","TbCloud","TbLink","TbCopy","TbCode",
      "TbDatabase","TbDeviceDesktop","TbDeviceMobile","TbDeviceLaptop",
      "TbPrinter","TbShare","TbBookmark","TbTag","TbFlag",
      "TbMap","TbMapPin","TbCompass","TbCalendar","TbClock","TbRefresh",
      "TbPlayerPlay","TbPlayerPause","TbPlayerStop",
      "TbVolume","TbVolumeOff","TbHeadphones",
      "TbShoppingCart","TbCreditCard","TbCurrencyDollar",
      "TbChartBar","TbChartLine","TbChartDonut","TbChartPie",
      "TbTable","TbList","TbLayoutGrid","TbMenu","TbDots","TbDotsVertical",
      "TbInfoCircle","TbAlertCircle","TbHelpCircle",
      "TbCircleCheck","TbCircleX","TbCirclePlus","TbCircleMinus",
      "TbMail","TbPhone","TbLock","TbLockOpen","TbEye","TbEyeOff",
      "TbFilter","TbArrowsSort","TbMaximize","TbMinimize",
      "TbExternalLink","TbReload","TbGauge","TbBulb","TbBolt",
      "TbMusic","TbMovie","TbCamera","TbMicrophone","TbSpeaker",
      "TbMoodSmile","TbMoodSad","TbMoodHappy",
      "TbUsers","TbUserPlus","TbMessage","TbMessageCircle",
      "TbArrowBackUp","TbThumbUp","TbThumbDown",
      "TbShield","TbShieldCheck","TbTool","TbTools","TbRocket","TbPuzzle",
      "TbPalette","TbBrush","TbWand","TbWorld","TbWifi",
      "TbBrandGithub","TbBrandTwitter","TbBrandInstagram","TbBrandFacebook",
      "TbBrandYoutube","TbBrandTelegram","TbBrandDiscord","TbBrandReact",
      "TbBrandHtml5","TbBrandCss3","TbBrandJavascript","TbBrandPython",
      "TbBrandVscode","TbBrandFigma","TbBrandGit","TbBrandSlack",
      "TbBrandLinkedin","TbBrandGoogle","TbBrandApple","TbBrandWindows",
      "TbBrandDocker","TbBrandNpm","TbBrandTrello","TbBrandNotion",
      "TbTerminal","TbBug","TbApi","TbPackage","TbBox","TbAtom","TbCpu",
      "TbKeyboard","TbMouse","TbServer","TbRouter","TbNetwork",
      "TbSun","TbMoon","TbSnowflake","TbUmbrella","TbCloud",
      "TbTree","TbLeaf","TbPlant","TbFlame",
      "TbCrown","TbMedal","TbTrophy","TbGift","TbDiamond",
      "TbHourglass","TbPen","TbPencil","TbEraser","TbClipboard",
      "TbQrcode","TbBarcode","TbFingerprint",
      "TbCar","TbPlane","TbTrain","TbBus","TbBike","TbShip",
      "TbBook","TbBookmark","TbNewspaper","TbFileText","TbFileCode",
      "TbCoffee","TbPizza","TbApple","TbCherry","TbIceCream",
      "TbDog","TbCat","TbDeer","TbBug",
      "TbSkateboard","TbSwim","TbRun","TbBike","TbGolf",
      "TbGuitar","TbDrum","TbPiano",
      "TbRuler","TbRuler2","TbCompass","TbDivide","TbMath",
    ],
    lib: Tb,
  },
];

// ─── CodeBlock ────────────────────────────────────────────────────
function CodeBlock({ code }) {
  const [cp, setCp] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCp(true);
    setTimeout(() => setCp(false), 1500);
  };
  return (
    <div className={styles.codeBlock}>
      <pre className={styles.codePre}><code>{code}</code></pre>
      <button className={styles.codeBlockCopy} onClick={copy}>
        {cp ? "✓" : "Копировать"}
      </button>
    </div>
  );
}

// ─── IconCard ─────────────────────────────────────────────────────
function IconCard({ name, Icon, pkg, setId, onCopy, copied }) {
  const isCopied = copied === name;
  return (
    <button
      className={`${styles.iconCard} ${isCopied ? styles.iconCardCopied : ""}`}
      onClick={() => onCopy(name, pkg, setId)}
      title={`Нажми чтобы скопировать`}
    >
      <span className={styles.iconSvg}><Icon /></span>
      <span className={styles.iconName}>{name}</span>
      {isCopied && <span className={styles.copiedBadge}>✓</span>}
    </button>
  );
}

export default function StudentIcons() {
  const [search, setSearch]       = useState("");
  const [activeSet, setActiveSet] = useState("all");
  const [copied, setCopied]       = useState("");
  const [copyMode, setCopyMode]   = useState("import");
  const [showGuide, setShowGuide] = useState(false);
  const [guideTab, setGuideTab]   = useState("react");

  const handleCopy = useCallback((name, pkg, setId) => {
    let text = "";
    if (copyMode === "import") text = `import { ${name} } from '${pkg}';`;
    else if (copyMode === "jsx")  text = `<${name} />`;
    else if (copyMode === "html") {
      const cls = getHtmlClass(name, setId);
      text = cls || `import { ${name} } from '${pkg}';`;
    }
    else text = name;

    navigator.clipboard?.writeText(text).catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(name);
    setTimeout(() => setCopied(""), 1800);
  }, [copyMode]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return SETS
      .filter((s) => activeSet === "all" || s.id === activeSet)
      .map((set) => {
        const icons = set.icons
          .filter((name) => !q || name.toLowerCase().includes(q))
          .map((name) => ({ name, Icon: set.lib[name] }))
          .filter((x) => x.Icon); // иконка должна реально существовать
        return { ...set, icons };
      })
      .filter((s) => s.icons.length > 0);
  }, [search, activeSet]);

  const totalVisible = useMemo(
    () => filtered.reduce((sum, s) => sum + s.icons.length, 0),
    [filtered]
  );

  return (
    <div className={styles.page}>
      {/* ── Шапка ─────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>⬡</span>
            Icon Library
          </h1>
          <p className={styles.subtitle}>
            {totalVisible.toLocaleString()} иконок из {SETS.length} наборов
            &nbsp;·&nbsp; нажми на иконку, чтобы скопировать
          </p>
        </div>
        <div className={styles.copyModeGroup}>
          <span className={styles.copyModeLabel}>Копировать:</span>
          {[
            { v: "import", label: "import" },
            { v: "jsx",    label: "<JSX />" },
            { v: "html",   label: "HTML" },
            { v: "name",   label: "Имя" },
          ].map(({ v, label }) => (
            <button
              key={v}
              className={`${styles.copyModeBtn} ${copyMode === v ? styles.copyModeBtnActive : ""}`}
              onClick={() => setCopyMode(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Гайд ──────────────────────────────────────────────────── */}
      <div className={styles.guideWrap}>
        <button className={styles.guideToggle} onClick={() => setShowGuide((s) => !s)}>
          <span className={styles.guideToggleIcon}>{showGuide ? "▾" : "▸"}</span>
          Как использовать иконки
          {!showGuide && <span className={styles.guideToggleHint}>· React &amp; HTML</span>}
        </button>

        {showGuide && (
          <div className={styles.guidePanel}>
            <div className={styles.guideTabs}>
              {[
                { id: "react",   label: "⚛  React" },
                { id: "fa_html", label: "Font Awesome HTML" },
                { id: "bs_html", label: "Bootstrap Icons HTML" },
                { id: "md_html", label: "Material Icons HTML" },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`${styles.guideTab} ${guideTab === t.id ? styles.guideTabActive : ""}`}
                  onClick={() => setGuideTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {guideTab === "react" && (
              <div className={styles.guideBody}>
                <p className={styles.guideStep}><span className={styles.guideNum}>1</span> Установи пакет в своём React-проекте:</p>
                <CodeBlock code={`npm install react-icons`} />
                <p className={styles.guideStep}><span className={styles.guideNum}>2</span> Импортируй нужную иконку из набора:</p>
                <CodeBlock code={`import { FaHome } from 'react-icons/fa';       // Font Awesome\nimport { FaHouse } from 'react-icons/fa6';    // Font Awesome 6\nimport { MdSettings } from 'react-icons/md';  // Material Design\nimport { BsHouse } from 'react-icons/bs';     // Bootstrap Icons\nimport { TbHome } from 'react-icons/tb';      // Tabler Icons\nimport { LuSearch } from 'react-icons/lu';    // Lucide`} />
                <p className={styles.guideStep}><span className={styles.guideNum}>3</span> Используй в JSX:</p>
                <CodeBlock code={`// Минимально\n<FaHome />\n\n// С размером\n<FaHome size={24} />\n\n// С цветом\n<FaHome color="#6d28d9" />\n\n// Со стилем\n<FaHome style={{ fontSize: 32, marginRight: 8, color: 'red' }} />\n\n// С className (задай в CSS)\n<FaHome className={styles.icon} />`} />
                <div className={styles.guideTip}>
                  <strong>Лайфхак:</strong> выбери режим <strong>import</strong> выше и нажми на любую иконку — скопируется готовый <code>import</code>
                </div>
              </div>
            )}

            {guideTab === "fa_html" && (
              <div className={styles.guideBody}>
                <p className={styles.guideStep}><span className={styles.guideNum}>1</span> Добавь CDN в <code>&lt;head&gt;</code> HTML-файла:</p>
                <CodeBlock code={`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">`} />
                <p className={styles.guideStep}><span className={styles.guideNum}>2</span> Используй <code>&lt;i class="..."&gt;</code> в теге body:</p>
                <CodeBlock code={`<!-- Обычная иконка (solid) -->\n<i class="fas fa-house"></i>\n<i class="fas fa-gear"></i>\n<i class="fas fa-magnifying-glass"></i>\n\n<!-- Иконка бренда (brands) -->\n<i class="fab fa-github"></i>\n<i class="fab fa-youtube"></i>\n<i class="fab fa-react"></i>`} />
                <p className={styles.guideStep}><span className={styles.guideNum}>3</span> Размер и цвет:</p>
                <CodeBlock code={`<!-- Классы размера: fa-xs  fa-sm  fa-lg  fa-xl  fa-2x  fa-3x  fa-10x -->\n<i class="fas fa-house fa-2x"></i>\n\n<!-- Цвет через style -->\n<i class="fas fa-heart" style="color: red; font-size: 32px;"></i>\n\n<!-- Цвет через свой CSS-класс -->\n<style>.icon { color: #6d28d9; font-size: 24px; }</style>\n<i class="fas fa-star icon"></i>`} />
                <div className={styles.guideTip}>
                  Выбери режим <strong>HTML</strong> вверху и нажми на иконку из <strong>Font Awesome</strong> — скопируется готовый <code>&lt;i&gt;</code> тег
                </div>
              </div>
            )}

            {guideTab === "bs_html" && (
              <div className={styles.guideBody}>
                <p className={styles.guideStep}><span className={styles.guideNum}>1</span> Добавь CDN в <code>&lt;head&gt;</code>:</p>
                <CodeBlock code={`<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">`} />
                <p className={styles.guideStep}><span className={styles.guideNum}>2</span> Используй иконку тегом <code>&lt;i&gt;</code>:</p>
                <CodeBlock code={`<i class="bi bi-house"></i>\n<i class="bi bi-person"></i>\n<i class="bi bi-search"></i>`} />
                <p className={styles.guideStep}><span className={styles.guideNum}>3</span> Размер и цвет через CSS:</p>
                <CodeBlock code={`<!-- Размер через font-size -->\n<i class="bi bi-house" style="font-size: 32px;"></i>\n\n<!-- Цвет -->\n<i class="bi bi-heart-fill" style="color: #e11d48; font-size: 24px;"></i>\n\n<!-- Bootstrap утилиты (если подключён Bootstrap) -->\n<i class="bi bi-star text-warning fs-3"></i>`} />
                <div className={styles.guideTip}>
                  Выбери режим <strong>HTML</strong> и нажми на иконку из набора <strong>Bootstrap</strong>
                </div>
              </div>
            )}

            {guideTab === "md_html" && (
              <div className={styles.guideBody}>
                <p className={styles.guideStep}><span className={styles.guideNum}>1</span> Добавь Google Fonts в <code>&lt;head&gt;</code>:</p>
                <CodeBlock code={`<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">`} />
                <p className={styles.guideStep}><span className={styles.guideNum}>2</span> Имя иконки — это <code>snake_case</code> текст внутри тега:</p>
                <CodeBlock code={`<span class="material-icons">home</span>\n<span class="material-icons">settings</span>\n<span class="material-icons">search</span>\n<span class="material-icons">favorite</span>\n<span class="material-icons">rocket_launch</span>`} />
                <p className={styles.guideStep}><span className={styles.guideNum}>3</span> Размер и цвет:</p>
                <CodeBlock code={`<!-- Размер через font-size -->\n<span class="material-icons" style="font-size: 48px;">home</span>\n\n<!-- Цвет -->\n<span class="material-icons" style="font-size: 32px; color: #1677ff;">star</span>\n\n<!-- Через CSS-класс -->\n<style>.icon { font-size: 24px; color: #6d28d9; }</style>\n<span class="material-icons icon">rocket_launch</span>`} />
                <div className={styles.guideTip}>
                  Выбери режим <strong>HTML</strong> и нажми на <strong>Material Design</strong> иконку — скопируется <code>&lt;span&gt;</code> тег
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Поиск ─────────────────────────────────────────────────── */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>⌕</span>
        <input
          className={styles.searchInput}
          placeholder="Поиск иконки… (например: home, arrow, brand, github)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {search && (
          <button className={styles.searchClear} onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {/* ── Табы ──────────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeSet === "all" ? styles.tabActive : ""}`}
          onClick={() => setActiveSet("all")}
        >
          Все
        </button>
        {SETS.map((s) => (
          <button
            key={s.id}
            className={`${styles.tab} ${activeSet === s.id ? styles.tabActive : ""}`}
            style={activeSet === s.id ? { "--tab-accent": s.color } : {}}
            onClick={() => setActiveSet(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Контент ───────────────────────────────────────────────── */}
      <div className={styles.content}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🔍</span>
            <p>Иконки не найдены по запросу «{search}»</p>
          </div>
        ) : (
          filtered.map((set) => (
            <section key={set.id} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionDot} style={{ background: set.color }} />
                <h2 className={styles.sectionTitle}>{set.label}</h2>
                <code className={styles.sectionPkg}>{set.pkg}</code>
                <span className={styles.sectionCount}>{set.icons.length}</span>
              </div>
              <div className={styles.grid}>
                {set.icons.map(({ name, Icon }) => (
                  <IconCard
                    key={name}
                    name={name}
                    Icon={Icon}
                    pkg={set.pkg}
                    setId={set.id}
                    onCopy={handleCopy}
                    copied={copied}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {copied && <div className={styles.toast}>✓ Скопировано</div>}
    </div>
  );
}
