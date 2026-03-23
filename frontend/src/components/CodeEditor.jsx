import React, { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

// Icons
const Icons = {
  File: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Save: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Play: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Sun: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Terminal: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  Clear: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Code: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Users: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Loader: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  ),
};

// Get file icon based on extension
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const iconColors = {
    js: '#f7df1e',
    jsx: '#61dafb',
    ts: '#3178c6',
    tsx: '#3178c6',
    py: '#3776ab',
    java: '#f89820',
    cpp: '#00599c',
    c: '#00599c',
    html: '#e34c26',
    css: '#264de4',
    json: '#292929',
    md: '#083fa1',
  };
  return iconColors[ext] || 'var(--text-tertiary)';
};

const CodeEditor = ({ user, roomId }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('vs-dark');
  const [isConnected, setIsConnected] = useState(false);
  const [fileList, setFileList] = useState([
    { name: 'index.js', content: '// Welcome to CodeCollab!\n\nfunction helloWorld() {\n  console.log("Hello, CodeCollab!");\n}\n\nhelloWorld();' },
    { name: 'Main.java', content: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter your name: ");\n        String name = sc.nextLine();\n        System.out.print("Enter your age: ");\n        int age = sc.nextInt();\n        System.out.println("Hello " + name + "! You are " + age + " years old.");\n        sc.close();\n    }\n}' },
    { name: 'program.cpp', content: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string name;\n    int age;\n    \n    cout << "Enter your name: ";\n    getline(cin, name);\n    cout << "Enter your age: ";\n    cin >> age;\n    \n    cout << "Hello " << name << "! You are " << age << " years old." << endl;\n    return 0;\n}' },
    { name: 'program.py', content: '# Python code\nname = input("Enter your name: ")\nage = input("Enter your age: ")\nprint(f"Hello {name}! You are {age} years old.")' }
  ]);
  const [currentFile, setCurrentFile] = useState(fileList[0]);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalWaiting, setTerminalWaiting] = useState(false);
  const [terminalResolve, setTerminalResolve] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodide, setPyodide] = useState(null);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(180);
  const terminalEndRef = useRef(null);
  const terminalInputRef = useRef(null);

  // Environment URLs
  const API_URL = import.meta.env.VITE_API_URL;
  const WS_URL = API_URL 
    ? API_URL.replace('https', 'wss').replace('http', 'ws')
    : 'wss://codecollab-backend-omu2.onrender.com';

  // Languages configuration
  const languages = [
    { value: 'javascript', label: 'JavaScript', ext: '.js' },
    { value: 'typescript', label: 'TypeScript', ext: '.ts' },
    { value: 'python', label: 'Python', ext: '.py' },
    { value: 'java', label: 'Java', ext: '.java' },
    { value: 'cpp', label: 'C++', ext: '.cpp' },
    { value: 'csharp', label: 'C#', ext: '.cs' },
    { value: 'go', label: 'Go', ext: '.go' },
    { value: 'rust', label: 'Rust', ext: '.rs' },
    { value: 'php', label: 'PHP', ext: '.php' },
    { value: 'ruby', label: 'Ruby', ext: '.rb' },
    { value: 'html', label: 'HTML', ext: '.html' },
    { value: 'css', label: 'CSS', ext: '.css' },
    { value: 'json', label: 'JSON', ext: '.json' },
    { value: 'sql', label: 'SQL', ext: '.sql' },
  ];

  // Load Pyodide for Python execution
  useEffect(() => {
    if (language === 'python' && !pyodide) {
      const loadPyodide = async () => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js';
        script.onload = async () => {
          const pyodideInstance = await window.loadPyodide();
          setPyodide(pyodideInstance);
          appendToTerminal('Python runtime ready\n', 'success');
        };
        document.head.appendChild(script);
      };
      loadPyodide();
    }
  }, [language]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput]);

  const appendToTerminal = useCallback((text, type = 'default') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTerminalOutput(prev => prev + text);
  }, []);

  const clearTerminal = useCallback(() => {
    setTerminalOutput('');
  }, []);

  const handleTerminalKeyPress = useCallback(async (e) => {
    if (e.key === 'Enter') {
      const input = terminalInput;
      setTerminalInput('');
      appendToTerminal(input + '\n');
      
      if (terminalWaiting && terminalResolve) {
        terminalResolve(input);
        setTerminalWaiting(false);
        setTerminalResolve(null);
      }
    }
  }, [terminalInput, terminalWaiting, terminalResolve, appendToTerminal]);

  const waitForTerminalInput = useCallback(() => {
    return new Promise((resolve) => {
      setTerminalWaiting(true);
      setTerminalResolve(() => resolve);
    });
  }, []);

  // Yjs collaboration setup
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || roomId === 'lobby') return;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      WS_URL,
      `code-${roomId}-${currentFile.name}`,
      ydoc
    );
    const yText = ydoc.getText('monaco');

    const binding = new MonacoBinding(
      yText,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      provider.awareness
    );

    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const users = states.map(([clientId, state]) => ({
        id: clientId,
        name: state.user?.name || 'Anonymous',
        color: state.user?.color || '#10b981'
      })).filter(u => u.id !== provider.awareness.clientID);
      setCollaborators(users);
    });

    const userColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
    provider.awareness.setLocalState({
      user: {
        name: user.username,
        color: userColor,
        avatar: user.username.charAt(0).toUpperCase()
      }
    });

    setIsConnected(true);

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [roomId, currentFile.name, user.username, WS_URL]);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.updateOptions({
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
      fontLigatures: true,
      minimap: { enabled: true, scale: 1 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      bracketPairColorization: { enabled: true },
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      padding: { top: 12 },
    });

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveFile());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => runCode());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => setShowTerminal(prev => !prev));
  }, []);

  const handleLanguageChange = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), newLanguage);
    }
  }, []);

  const saveFile = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.getValue();
      setFileList(prev => prev.map(f => 
        f.name === currentFile.name ? { ...f, content } : f
      ));
      appendToTerminal(`File saved: ${currentFile.name}\n`, 'success');
    }
  }, [currentFile.name, appendToTerminal]);

  const copyCode = useCallback(() => {
    if (editorRef.current) {
      navigator.clipboard.writeText(editorRef.current.getValue());
      appendToTerminal('Code copied to clipboard\n', 'success');
    }
  }, [appendToTerminal]);

  const downloadCode = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.getValue();
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFile.name;
      a.click();
      URL.revokeObjectURL(url);
      appendToTerminal(`Downloaded: ${currentFile.name}\n`, 'success');
    }
  }, [currentFile.name, appendToTerminal]);

  // Code execution functions
  const runJavaScript = useCallback((code) => {
    let logs = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => logs.push('[Error] ' + args.join(' '));
    
    try {
      const result = eval(code);
      if (result !== undefined) {
        logs.push(`> ${result}`);
      }
      return logs.join('\n') || 'Execution completed';
    } catch (err) {
      return `Error: ${err.message}`;
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  }, []);

  const runPython = useCallback(async (code) => {
    if (!pyodide) {
      return "Loading Python runtime... Please wait.";
    }
    try {
      pyodide.globals.set('input', async (prompt) => {
        if (prompt) appendToTerminal(prompt);
        return await waitForTerminalInput();
      });
      
      pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
      `);
      
      await pyodide.runPythonAsync(code);
      
      const stdout = pyodide.runPython('sys.stdout.getvalue()');
      const stderr = pyodide.runPython('sys.stderr.getvalue()');
      
      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += `\n[Error] ${stderr}`;
      
      return output || 'Execution completed';
    } catch (err) {
      return `Error: ${err.message}`;
    }
  }, [pyodide, appendToTerminal, waitForTerminalInput]);

  const runCpp = useCallback(async (code) => {
    try {
      const needsInput = code.includes('cin') || code.includes('scanf');
      
      if (!needsInput) {
        const response = await fetch(`${API_URL}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language: 'cpp', input: '' })
        });
        const data = await response.json();
        return data.output || 'Execution completed';
      }
      
      appendToTerminal('Enter all inputs (separate with spaces):\n');
      const allInputs = await waitForTerminalInput();
      appendToTerminal('Running...\n');
      
      const response = await fetch(`${API_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'cpp', input: allInputs })
      });
      const data = await response.json();
      return data.output || 'Execution completed';
    } catch (err) {
      return `Error: ${err.message}`;
    }
  }, [API_URL, appendToTerminal, waitForTerminalInput]);

  const runJava = useCallback(async (code) => {
    try {
      const needsInput = code.includes('Scanner') || code.includes('System.in');
      
      if (!needsInput) {
        const response = await fetch(`${API_URL}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language: 'java', input: '' })
        });
        const data = await response.json();
        return data.output || 'Execution completed';
      }
      
      appendToTerminal('Enter all inputs (separate with spaces):\n');
      const allInputs = await waitForTerminalInput();
      appendToTerminal('Running...\n');
      
      const response = await fetch(`${API_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'java', input: allInputs })
      });
      const data = await response.json();
      return data.output || 'Execution completed';
    } catch (err) {
      return `Error: ${err.message}`;
    }
  }, [API_URL, appendToTerminal, waitForTerminalInput]);

  const runCode = useCallback(async () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    setIsRunning(true);
    setShowTerminal(true);
    
    const divider = '-'.repeat(50);
    appendToTerminal(`\nRunning ${language.toUpperCase()}...\n${divider}\n`);

    try {
      let result = '';
      
      switch (language) {
        case 'javascript':
        case 'typescript':
          result = runJavaScript(code);
          break;
        case 'python':
          result = await runPython(code);
          break;
        case 'cpp':
          result = await runCpp(code);
          break;
        case 'java':
          result = await runJava(code);
          break;
        default:
          result = `${language.toUpperCase()} requires a local compiler.`;
      }
      
      appendToTerminal(`${result}\n${divider}\n`);
    } catch (err) {
      appendToTerminal(`Error: ${err.message}\n`);
    } finally {
      setIsRunning(false);
      setTerminalWaiting(false);
    }
  }, [language, runJavaScript, runPython, runCpp, runJava, appendToTerminal]);

  const createNewFile = useCallback(() => {
    const fileName = prompt('Enter file name (with extension):');
    if (fileName && fileName.trim()) {
      if (fileList.some(f => f.name === fileName)) {
        alert('A file with this name already exists');
        return;
      }
      
      const ext = fileName.split('.').pop().toLowerCase();
      const extToLang = { js: 'javascript', py: 'python', java: 'java', cpp: 'cpp', ts: 'typescript' };
      const newLang = extToLang[ext] || 'javascript';
      
      const newFile = { name: fileName, content: `// ${fileName}\n` };
      setFileList(prev => [...prev, newFile]);
      setCurrentFile(newFile);
      setLanguage(newLang);
    }
  }, [fileList]);

  const deleteFile = useCallback((fileName) => {
    if (fileList.length === 1) {
      alert('Cannot delete the last file');
      return;
    }
    if (confirm(`Delete ${fileName}?`)) {
      setFileList(prev => prev.filter(f => f.name !== fileName));
      if (currentFile.name === fileName) {
        setCurrentFile(fileList[0]);
      }
    }
  }, [fileList, currentFile.name]);

  const switchFile = useCallback((file) => {
    // Save current file content first
    if (editorRef.current && currentFile) {
      const content = editorRef.current.getValue();
      setFileList(prev => prev.map(f => 
        f.name === currentFile.name ? { ...f, content } : f
      ));
    }
    
    setCurrentFile(file);
    const ext = file.name.split('.').pop().toLowerCase();
    const extToLang = { js: 'javascript', py: 'python', java: 'java', cpp: 'cpp', ts: 'typescript', html: 'html', css: 'css', json: 'json' };
    setLanguage(extToLang[ext] || 'javascript');
  }, [currentFile]);

  // Lobby state
  if (roomId === 'lobby') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'var(--bg-tertiary)',
        color: 'var(--text-tertiary)',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <Icons.Code />
        <p style={{ fontSize: '14px', margin: 0 }}>Join a room to start coding with friends!</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--bg-tertiary)' }}>
      {/* File Explorer Sidebar */}
      {showFileExplorer && (
        <div
          style={{
            width: '200px',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-primary)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          {/* Explorer Header */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Explorer
            </span>
            <button
              onClick={createNewFile}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
              title="New File"
            >
              <Icons.Plus />
            </button>
          </div>

          {/* File List */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
            {fileList.map(file => (
              <div
                key={file.name}
                onClick={() => switchFile(file)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: currentFile.name === file.name ? 'var(--bg-hover)' : 'transparent',
                  marginBottom: '2px',
                  transition: 'all var(--transition-fast)',
                  group: 'file-item',
                }}
                onMouseEnter={e => {
                  if (currentFile.name !== file.name) {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }
                }}
                onMouseLeave={e => {
                  if (currentFile.name !== file.name) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getFileIcon(file.name),
                  }}
                >
                  <Icons.File />
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    color: currentFile.name === file.name ? 'var(--text-primary)' : 'var(--text-secondary)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFile(file.name);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '3px',
                    display: 'flex',
                    opacity: 0,
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--error)';
                    e.currentTarget.style.opacity = '1';
                  }}
                  className="delete-btn"
                >
                  <Icons.Trash />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-primary)',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Left Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowFileExplorer(prev => !prev)}
              style={{
                background: showFileExplorer ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = showFileExplorer ? 'var(--bg-hover)' : 'transparent'}
              title="Toggle Explorer"
            >
              <Icons.File />
            </button>

            <div style={{ width: '1px', height: '20px', background: 'var(--border-primary)' }} />

            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="select"
              style={{ minWidth: '120px' }}
            >
              {languages.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title={theme === 'vs-dark' ? 'Light Theme' : 'Dark Theme'}
            >
              {theme === 'vs-dark' ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>

          {/* Center - File Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center', minWidth: 0 }}>
            <div
              style={{
                background: 'var(--bg-tertiary)',
                padding: '4px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <div style={{ color: getFileIcon(currentFile.name), display: 'flex' }}>
                <Icons.File />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {currentFile.name}
              </span>
            </div>
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Collaborators */}
            {collaborators.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
                {collaborators.slice(0, 3).map(collab => (
                  <div
                    key={collab.id}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: collab.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'white',
                      border: '2px solid var(--bg-secondary)',
                      marginLeft: '-6px',
                    }}
                    title={collab.name}
                  >
                    {collab.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {collaborators.length > 3 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>
                    +{collaborators.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Connection Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: '20px',
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isConnected ? 'var(--success)' : 'var(--error)',
                  boxShadow: isConnected ? '0 0 6px var(--success)' : 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: isConnected ? 'var(--success)' : 'var(--error)', fontWeight: 500 }}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            <div style={{ width: '1px', height: '20px', background: 'var(--border-primary)' }} />

            {/* Action Buttons */}
            <button
              onClick={copyCode}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Copy Code"
            >
              <Icons.Copy />
            </button>

            <button
              onClick={downloadCode}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Download"
            >
              <Icons.Download />
            </button>

            <button
              onClick={saveFile}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Save (Ctrl+S)"
            >
              <Icons.Save />
            </button>

            <button
              onClick={runCode}
              disabled={isRunning}
              style={{
                background: 'var(--primary)',
                border: 'none',
                color: 'white',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                padding: '6px 14px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all var(--transition-fast)',
                opacity: isRunning ? 0.7 : 1,
              }}
              onMouseEnter={e => !isRunning && (e.currentTarget.style.background = 'var(--primary-hover)')}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
            >
              {isRunning ? <Icons.Loader /> : <Icons.Play />}
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <Editor
            height="100%"
            language={language}
            theme={theme}
            value={currentFile.content}
            onMount={handleEditorDidMount}
            options={{
              automaticLayout: true,
              fontSize: 14,
              fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 12 },
            }}
          />
        </div>

        {/* Terminal */}
        {showTerminal && (
          <div
            style={{
              height: terminalHeight,
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-primary)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* Terminal Header */}
            <div
              style={{
                padding: '6px 12px',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.Terminal />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Terminal</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={clearTerminal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                  }}
                >
                  <Icons.Clear />
                  Clear
                </button>
                <button
                  onClick={() => setShowTerminal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                  }}
                >
                  <Icons.Clear />
                </button>
              </div>
            </div>

            {/* Terminal Output */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{terminalOutput}</pre>
              {terminalWaiting && (
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ color: 'var(--primary)', marginRight: '8px' }}>{'>'}</span>
                  <input
                    ref={terminalInputRef}
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyPress={handleTerminalKeyPress}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        )}

        {/* Terminal Toggle (when hidden) */}
        {!showTerminal && (
          <button
            onClick={() => setShowTerminal(true)}
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-md)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Icons.Terminal />
            Terminal
          </button>
        )}
      </div>

      <style>{`
        .delete-btn {
          opacity: 0 !important;
        }
        div:hover > .delete-btn {
          opacity: 1 !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CodeEditor;
