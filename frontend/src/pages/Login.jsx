import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Terminal state
  const [terminalLines, setTerminalLines] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState('/home/user');
  const terminalRef = useRef(null);
  
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // File system structure
  const fileSystem = {
    '/': ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'opt', 'root', 'tmp', 'usr', 'var'],
    '/home': ['user', 'guest'],
    '/home/user': ['Documents', 'Downloads', 'Pictures', 'Music', 'Videos', 'Desktop', 'Projects', 'Scripts'],
    '/home/user/Documents': ['readme.txt', 'notes.txt', 'project.txt'],
    '/home/user/Downloads': ['file1.zip', 'image.jpg', 'video.mp4'],
    '/home/user/Pictures': ['photo1.jpg', 'photo2.png', 'screenshot.png'],
    '/home/user/Music': ['song1.mp3', 'song2.mp3', 'playlist.m3u'],
    '/home/user/Videos': ['movie.mp4', 'tutorial.avi'],
    '/home/user/Desktop': ['notes.txt', 'todo.md'],
    '/home/user/Projects': ['openway', 'website', 'app'],
    '/home/user/Projects/openway': ['backend', 'frontend', 'README.md', 'package.json'],
    '/home/user/Scripts': ['backup.sh', 'deploy.sh', 'monitor.sh'],
    '/etc': ['passwd', 'hosts', 'fstab', 'crontab', 'ssh', 'nginx', 'apache2'],
    '/var': ['log', 'www', 'tmp', 'cache'],
    '/var/log': ['syslog', 'auth.log', 'kern.log', 'apache2'],
    '/usr': ['bin', 'lib', 'share', 'local', 'src'],
    '/usr/bin': ['python', 'python3', 'node', 'npm', 'git', 'vim', 'nano'],
    '/tmp': ['temp1.txt', 'cache.dat']
  };

  // Helper function to normalize path
  const normalizePath = (path, currentDir) => {
    if (path === '~') return '/home/user';
    if (path === '/') return '/';
    if (path === '..') {
      const parts = currentDir.split('/').filter(p => p);
      parts.pop();
      return '/' + parts.join('/') || '/';
    }
    if (path === '.') return currentDir;
    if (path.startsWith('/')) return path;
    if (path.startsWith('~/')) return '/home/user' + path.substring(1);
    
    // Relative path
    const newPath = currentDir === '/' ? '/' + path : currentDir + '/' + path;
    return newPath;
  };

  // Helper function to get directory contents
  const getDirectoryContents = (path) => {
    return fileSystem[path] || null;
  };

  // Перенаправление если пользователь уже авторизован
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'student') {
        navigate('/student');
      }
    }
  }, [user, navigate]);

  // Terminal commands and responses
  const terminalCommands = {
    // Базовые команды
    'ls': ['Documents', 'Downloads', 'Pictures', 'Music', 'Videos', 'Desktop', 'Projects', 'Scripts'],
    'ls -la': [
      'total 48',
      'drwxr-xr-x  8 user user 4096 Oct 17 12:30 .',
      'drwxr-xr-x  3 root root 4096 Oct 15 09:20 ..',
      '-rw-r--r--  1 user user  220 Oct 15 09:20 .bash_logout',
      '-rw-r--r--  1 user user 3771 Oct 15 09:20 .bashrc',
      'drwxr-xr-x  2 user user 4096 Oct 17 12:30 Desktop',
      'drwxr-xr-x  2 user user 4096 Oct 17 12:30 Documents',
      'drwxr-xr-x  2 user user 4096 Oct 17 12:30 Downloads'
    ],
    'pwd': ['/home/user'],
    'whoami': ['user'],
    'date': [new Date().toLocaleDateString('ru-RU', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })],
    'clear': ['clear'],

    // Системная информация
    'ps': ['PID  COMMAND', '1234 bash', '5678 node', '9012 vscode', '1111 firefox', '2222 spotify'],
    'ps aux': [
      'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
      'user      1234  0.1  0.5  21532  5164 pts/0    Ss   12:30   0:00 bash',
      'user      5678  2.1  8.2 912345 84521 ?        Sl   12:31   0:15 node',
      'user      9012  1.5  12.3 1234567 126543 ?      Sl   12:25   0:32 code'
    ],
    'top': [
      'Tasks: 142 total,   1 running, 141 sleeping',
      'Cpu(s):  2.1%us,  1.2%sy,  0.0%ni, 96.7%id',
      'Mem:  8192000k total, 3276800k used, 4915200k free',
      'PID USER      PR  NI    VIRT    RES    SHR S  %CPU %MEM     TIME+ COMMAND',
      '1234 user      20   0   21532   5164   3428 S   0.0  0.1   0:00.15 bash'
    ],
    'uname': ['Linux'],
    'uname -a': ['Linux openway 5.15.0-48-generic #54-Ubuntu SMP x86_64 GNU/Linux'],
    'uname -r': ['5.15.0-48-generic'],
    'hostname': ['openway-platform'],
    'uptime': ['12:34:56 up 2 days, 5:42, 1 user, load average: 0.15, 0.18, 0.12'],
    'w': ['12:34:56 up 2 days, 5:42, 1 user, load average: 0.15, 0.18, 0.12', 'USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT', 'user     pts/0    192.168.1.100    12:30    0.00s  0.15s  0.01s bash'],

    // Память и диски
    'free': ['              total        used        free      shared  buff/cache   available', 'Mem:        8192000     3276800     2867200      256000     2048000     4659200', 'Swap:       2097152           0     2097152'],
    'free -h': ['              total        used        free      shared  buff/cache   available', 'Mem:           8.0G        3.2G        2.8G        256M        2.0G        4.5G', 'Swap:          2.0G          0B        2.0G'],
    'df': ['Filesystem     1K-blocks    Used Available Use% Mounted on', '/dev/sda1      20971520 12582912   7864320  63% /', '/dev/sda2       1048576   524288    524288  50% /boot'],
    'df -h': ['Filesystem      Size  Used Avail Use% Mounted on', '/dev/sda1       20G   12G  7.3G  63% /', '/dev/sda2      1.0G  512M  512M  50% /boot', 'tmpfs          4.0G     0  4.0G   0% /dev/shm'],
    'du -h': ['4.0K	./Documents', '8.0K	./Downloads', '12K	./Pictures', '16K	./Music', '20K	./Videos', '44K	.'],
    'lsblk': ['NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT', 'sda      8:0    0   20G  0 disk', '├─sda1   8:1    0   19G  0 part /', '└─sda2   8:2    0    1G  0 part /boot'],

    // Сетевые команды
    'ifconfig': [
      'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500',
      '        inet 192.168.1.100  netmask 255.255.255.0  broadcast 192.168.1.255',
      '        inet6 fe80::a00:27ff:fe4e:66a1  prefixlen 64  scopeid 0x20<link>',
      '        ether 08:00:27:4e:66:a1  txqueuelen 1000  (Ethernet)'
    ],
    'ping google.com': ['PING google.com (172.217.16.174) 56(84) bytes of data.', '64 bytes from google.com: icmp_seq=1 ttl=118 time=12.3 ms', '64 bytes from google.com: icmp_seq=2 ttl=118 time=11.8 ms'],
    'wget --version': ['GNU Wget 1.21.2 built on linux-gnu.'],
    'curl --version': ['curl 7.81.0 (x86_64-pc-linux-gnu)'],

    // Файловые операции
    'cat /etc/passwd': ['root:x:0:0:root:/root:/bin/bash', 'user:x:1000:1000:User,,:/home/user:/bin/bash', 'nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin'],
    'cat /etc/os-release': ['NAME="Ubuntu"', 'VERSION="22.04.1 LTS (Jammy Jellyfish)"', 'ID=ubuntu', 'ID_LIKE=debian', 'PRETTY_NAME="Ubuntu 22.04.1 LTS"'],
    'cat /proc/version': ['Linux version 5.15.0-48-generic (buildd@lcy02-amd64-044)'],
    'cat /proc/cpuinfo': ['processor	: 0', 'vendor_id	: GenuineIntel', 'cpu family	: 6', 'model		: 142', 'model name	: Intel(R) Core(TM) i7-8565U CPU @ 1.80GHz'],
    'head /var/log/syslog': ['Oct 17 12:30:01 openway systemd[1]: Started OpenWay Platform.', 'Oct 17 12:30:15 openway kernel: [12345.678] USB disconnect'],
    'tail /var/log/auth.log': ['Oct 17 12:30:01 openway sudo: user : TTY=pts/0 ; USER=root ; COMMAND=/bin/bash'],

    // Пользователи и права
    'id': ['uid=1000(user) gid=1000(user) groups=1000(user),4(adm),24(cdrom),27(sudo)'],
    'groups': ['user adm cdrom sudo dip plugdev'],
    'sudo -l': ['User user may run the following commands on openway:', '    (ALL : ALL) ALL'],
    'finger user': ['Login: user           Name: OpenWay User', 'Directory: /home/user        Shell: /bin/bash', 'Last login Thu Oct 17 12:30 (MSK) on pts/0'],

    // История и алиасы
    'history': ['1  ls', '2  pwd', '3  whoami', '4  date', '5  ps', '6  uname -a', '7  free -h', '8  df -h', '9  history'],
    'alias': ['alias l="ls -CF"', 'alias la="ls -A"', 'alias ll="ls -alF"', 'alias ls="ls --color=auto"'],

    // Поиск и текст
    'find /home -name "*.txt"': ['/home/user/Documents/readme.txt', '/home/user/Documents/notes.txt'],
    'grep -r "TODO" .': ['./Documents/project.txt:TODO: Fix the bug', './Scripts/deploy.sh:# TODO: Add error handling'],
    'locate bash': ['/bin/bash', '/usr/bin/bash', '/etc/bash.bashrc'],
    'which python': ['/usr/bin/python'],
    'which python3': ['/usr/bin/python3'],
    'which node': ['/usr/bin/node'],
    'which npm': ['/usr/bin/npm'],
    'which git': ['/usr/bin/git'],
    'which vim': ['/usr/bin/vim'],
    'which nano': ['/usr/bin/nano'],

    // Переменные окружения
    'env': ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'HOME=/home/user', 'SHELL=/bin/bash', 'USER=user', 'LANG=en_US.UTF-8'],
    'echo $PATH': ['/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
    'echo $HOME': ['/home/user'],
    'echo $USER': ['user'],
    'echo $SHELL': ['/bin/bash'],
    'printenv': ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'HOME=/home/user', 'USER=user'],

    // Процессы и задачи
    'jobs': ['No active jobs'],
    'crontab -l': ['# Edit this file to introduce tasks to be run by cron.', '0 0 * * * /home/user/backup.sh', '*/5 * * * * /home/user/monitor.sh'],
    'systemctl status': ['● openway-platform.service - OpenWay Platform', '   Loaded: loaded (/etc/systemd/system/openway.service; enabled)', '   Active: active (running) since Thu 2025-10-17 12:30:00 MSK'],

    // Git команды
    'git --version': ['git version 2.34.1'],
    'git status': ['On branch main', 'Your branch is up to date with \'origin/main\'.', '', 'nothing to commit, working tree clean'],
    'git branch': ['* main', '  development', '  feature/login'],
    'git log --oneline': ['a1b2c3d Add terminal functionality', 'e4f5g6h Fix authentication bug', 'h7i8j9k Initial commit'],

    // Архивы
    'tar --version': ['tar (GNU tar) 1.34'],
    'zip -v': ['This is Zip 3.0'],
    'unzip -v': ['UnZip 6.00 of 20 April 2009, by Debian'],

    // Разработка
    'node --version': ['v18.17.0'],
    'npm --version': ['9.6.7'],
    'python --version': ['Python 3.10.6'],
    'python3 --version': ['Python 3.10.6'],
    'java -version': ['openjdk version "11.0.19" 2023-04-18'],
    'gcc --version': ['gcc (Ubuntu 11.3.0-1ubuntu1~22.04) 11.3.0'],
    'make --version': ['GNU Make 4.3'],

    // Текстовые редакторы
    'vim --version': ['VIM - Vi IMproved 8.2'],
    'nano --version': ['GNU nano, version 6.2'],
    'emacs --version': ['GNU Emacs 27.1'],

    // Веб и загрузки
    'firefox --version': ['Mozilla Firefox 106.0.5'],
    'chromium-browser --version': ['Chromium 106.0.5249.119'],

    // Развлекательные команды
    'cowsay hello': ['  _______', '< hello >', '  -------', '        \\   ^__^', '         \\  (oo)\\_______', '            (__)\\       )\\/\\', '                ||----w |', '                ||     ||'],
    'fortune': ['The best way to predict the future is to invent it. - Alan Kay'],
    'figlet OpenWay': [' ___                 __    __          ', '/ _ \\ ___  ___ ___  / / /\\ \\ \\__ _ _   _ ', '| | | | _ \\/ _ | _ \\/ /\\ V  V / _` | | | |', '| |_| |  _/  __/   / /  \\_/\\_/ (_| | |_| |', ' \\___/|_|  \\___|_|_\\_\\           \\__,_|\\__, |', '                                    |___/ '],
    'cal': ['    October 2025      ', 'Su Mo Tu We Th Fr Sa  ', '          1  2  3  4  ', ' 5  6  7  8  9 10 11  ', '12 13 14 15 16 17 18  ', '19 20 21 22 23 24 25  ', '26 27 28 29 30 31     '],

    // Простые echo команды
    'echo hello': ['hello'],
    'echo "Hello World"': ['Hello World'],
    'echo OpenWay Platform': ['OpenWay Platform'],

    // Справка
    'help': [
      'Available commands:',
      '─── System Info ───',
      'uname, hostname, uptime, w, whoami, id, groups',
      '─── Files & Dirs ───', 
      'ls, pwd, cd, find, cat, head, tail, du, locate',
      '─── Memory & Disk ───',
      'free, df, lsblk, du',
      '─── Processes ───',
      'ps, top, jobs, systemctl',
      '─── Network ───',
      'ifconfig, ping, wget, curl',
      '─── Development ───',
      'git, node, npm, python, java, gcc, vim',
      '─── Environment ───',
      'env, echo, printenv, alias, history',
      '─── Fun Stuff ───',
      'cowsay, fortune, figlet, cal',
      '─── Utilities ───',
      'clear, date, which, finger, crontab',
      '',
      'Navigation:',
      'cd <dir>  - change directory (cd .., cd ~, cd /path)',
      'pwd       - print working directory',
      'ls        - list directory contents',
      '',
      'Type any command to try it out!'
    ],
    'man': ['What manual page do you want? Try: man ls, man grep, man git'],
    'info': ['Available info documents in /usr/share/info:']
  };

  // Initialize terminal with welcome message
  useEffect(() => {
    const welcomeLines = [
      { type: 'output', content: 'OpenWay Terminal v1.0' },
      { type: 'output', content: 'Welcome to the interactive terminal!' },
      { type: 'output', content: 'Type "help" for available commands.' },
      { type: 'output', content: '' }
    ];
    setTerminalLines(welcomeLines);
  }, []);

  const processCommand = (command) => {
    const newLines = [...terminalLines];
    
    // Add command line with current directory
    newLines.push({
      type: 'command',
      content: `user@openway:${currentDirectory}$ ${command}`
    });

    // Handle cd command
    if (command.trim().startsWith('cd ')) {
      const targetPath = command.trim().substring(3).trim() || '/home/user';
      const newPath = normalizePath(targetPath, currentDirectory);
      
      if (getDirectoryContents(newPath) !== null || newPath === '/') {
        setCurrentDirectory(newPath);
        newLines.push({ type: 'output', content: '' });
        setTerminalLines(newLines);
        return;
      } else {
        newLines.push({
          type: 'error',
          content: `bash: cd: ${targetPath}: No such file or directory`
        });
        newLines.push({ type: 'output', content: '' });
        setTerminalLines(newLines);
        return;
      }
    }

    // Handle cd without arguments (go to home)
    if (command.trim() === 'cd') {
      setCurrentDirectory('/home/user');
      newLines.push({ type: 'output', content: '' });
      setTerminalLines(newLines);
      return;
    }

    // Add command output
    if (command === 'clear') {
      setTerminalLines([]);
      return;
    }

    // Update pwd to show current directory
    if (command.toLowerCase() === 'pwd') {
      newLines.push({
        type: 'output',
        content: currentDirectory
      });
      newLines.push({ type: 'output', content: '' });
      setTerminalLines(newLines);
      return;
    }

    // Update ls to show current directory contents
    if (command.toLowerCase() === 'ls') {
      const contents = getDirectoryContents(currentDirectory);
      if (contents) {
        contents.forEach(item => {
          newLines.push({
            type: 'output',
            content: item
          });
        });
      }
      newLines.push({ type: 'output', content: '' });
      setTerminalLines(newLines);
      return;
    }

    let output;
    
    // Handle dynamic echo commands
    if (command.startsWith('echo ')) {
      const echoText = command.substring(5).replace(/^["'](.*)["']$/, '$1');
      output = [echoText];
    }
    // Handle cowsay with custom text
    else if (command.startsWith('cowsay ')) {
      const cowText = command.substring(7);
      const border = '_'.repeat(cowText.length + 2);
      output = [
        ' ' + border,
        `< ${cowText} >`,
        ' ' + '-'.repeat(cowText.length + 2),
        '        \\   ^__^',
        '         \\  (oo)\\_______',
        '            (__)\\       )\\/\\',
        '                ||----w |',
        '                ||     ||'
      ];
    }
    // Handle figlet with custom text
    else if (command.startsWith('figlet ')) {
      const figletText = command.substring(7);
      output = [`ASCII Art: ${figletText}`, '╔═══════════════════╗', `║   ${figletText.padEnd(15)}   ║`, '╚═══════════════════╝'];
    }
    // Handle man pages
    else if (command.startsWith('man ')) {
      const manPage = command.substring(4);
      output = [
        `Manual page for ${manPage}`,
        `NAME: ${manPage} - command description`,
        'SYNOPSIS: Usage information would be here',
        'DESCRIPTION: Detailed description would be here',
        'Type "q" to quit man page'
      ];
    }
    // Handle ls with path
    else if (command.startsWith('ls ')) {
      const path = command.substring(3).trim();
      if (path === '/') {
        output = ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'opt', 'root', 'tmp', 'usr', 'var'];
      } else if (path === '/home') {
        output = ['user', 'guest'];
      } else if (path === '/etc') {
        output = ['passwd', 'hosts', 'fstab', 'crontab', 'ssh'];
      } else {
        output = [`ls: cannot access '${path}': No such file or directory`];
      }
    }
    // Handle cat with different files
    else if (command.startsWith('cat ')) {
      const file = command.substring(4).trim();
      if (file === '/etc/hosts') {
        output = ['127.0.0.1       localhost', '127.0.1.1       openway', '::1             localhost ip6-localhost ip6-loopback'];
      } else if (file === 'README.md') {
        output = ['# OpenWay Platform', '', 'Welcome to the interactive terminal!', '', 'This is a demo terminal interface.'];
      } else {
        output = terminalCommands[command.toLowerCase()] || [`cat: ${file}: No such file or directory`];
      }
    }
    // Default command lookup
    else {
      output = terminalCommands[command.toLowerCase()] || [`bash: ${command}: command not found`];
    }
    
    output.forEach(line => {
      newLines.push({
        type: command.toLowerCase() === 'help' ? 'output' : 
              line.includes('command not found') || line.includes('No such file') ? 'error' : 'output',
        content: line
      });
    });

    newLines.push({ type: 'output', content: '' });
    setTerminalLines(newLines);

    // Scroll to bottom
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleTerminalKeyPress = (e) => {
    if (e.key === 'Enter' && currentInput.trim()) {
      processCommand(currentInput.trim());
      setCurrentInput('');
    }
  };

  const handleTerminalClick = () => {
    // Focus on the hidden input when terminal is clicked
    const input = document.querySelector('.terminal-input');
    if (input) {
      input.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Пожалуйста, заполните все поля');
      setLoading(false);
      return;
    }

    const result = await login(email, password);
    
    if (result.success) {
      // Перенаправление в зависимости от роли
      if (result.user.role === 'admin') {
        navigate('/admin');
      } else if (result.user.role === 'student') {
        navigate('/student');
      }
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Animated Background */}
      <div className="background-container">
        <div className="background-wrap">
          <div className="background-pattern"></div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <h1>Вход в систему</h1>
          <p>Введите ваши данные для входа</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>

      {/* Terminal Window */}
      <div className="terminal-window" onClick={handleTerminalClick}>
        <div className="terminal-header">
          <div className="terminal-buttons">
            <div className="terminal-button close"></div>
            <div className="terminal-button minimize"></div>
            <div className="terminal-button maximize"></div>
          </div>
          <div className="terminal-title">Terminal — bash — 80×24</div>
        </div>
        
        <div className="terminal-content" ref={terminalRef}>
          {terminalLines.map((line, index) => (
            <div key={index} className="terminal-line">
              {line.type === 'command' && (
                <span className="terminal-prompt">{line.content}</span>
              )}
              {line.type === 'output' && (
                <span className="terminal-output">{line.content}</span>
              )}
              {line.type === 'error' && (
                <span className="terminal-error">{line.content}</span>
              )}
            </div>
          ))}
          
          {/* Current input line */}
          <div className="terminal-line">
            <span className="terminal-prompt">user@openway:{currentDirectory}$ </span>
            <span className="terminal-command">{currentInput}</span>
            <span className="terminal-cursor">█</span>
          </div>
          
          {/* Hidden input for capturing keystrokes */}
          <input
            type="text"
            className="terminal-input"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleTerminalKeyPress}
            style={{ position: 'absolute', left: '-9999px' }}
          />
        </div>
      </div>
    </div>
  );
}

export default Login;
