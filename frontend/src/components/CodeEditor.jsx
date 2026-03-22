import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

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
  const [inputBuffer, setInputBuffer] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodide, setPyodide] = useState(null);
  const terminalEndRef = useRef(null);
  const terminalInputRef = useRef(null);

  // Load Pyodide for Python execution
  useEffect(() => {
    if (language === 'python' && !pyodide) {
      const loadPyodide = async () => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js';
        script.onload = async () => {
          const pyodideInstance = await window.loadPyodide();
          setPyodide(pyodideInstance);
          appendToTerminal('✅ Python ready\n');
        };
        document.head.appendChild(script);
      };
      loadPyodide();
    }
  }, [language]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput]);

  const appendToTerminal = (text) => {
    setTerminalOutput(prev => prev + text);
  };

  const clearTerminal = () => {
    setTerminalOutput('');
  };

  const handleTerminalKeyPress = async (e) => {
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
  };

  const waitForTerminalInput = () => {
    return new Promise((resolve) => {
      setTerminalWaiting(true);
      setTerminalResolve(() => resolve);
    });
  };

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'sql', label: 'SQL' },
  ];

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
  `${import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:5001'}`,
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
        color: state.user?.color || '#4CAF50'
      })).filter(u => u.id !== provider.awareness.clientID);
      setCollaborators(users);
    });

    provider.awareness.setLocalState({
      user: {
        name: user.username,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        avatar: user.username.charAt(0).toUpperCase()
      }
    });

    setIsConnected(true);

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [roomId, currentFile.name, user.username]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on'
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      runCode();
    });
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), newLanguage);
  };

  const saveFile = () => {
    const content = editorRef.current.getValue();
    const updatedFiles = fileList.map(f => 
      f.name === currentFile.name ? { ...f, content } : f
    );
    setFileList(updatedFiles);
    appendToTerminal('✅ File saved\n');
  };

  const runJavaScript = (code) => {
    let logs = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => logs.push('❌ ' + args.join(' '));
    
    try {
      const result = eval(code);
      if (result !== undefined) {
        logs.push(`> ${result}`);
      }
      return logs.join('\n') || '✅ Done';
    } catch (err) {
      return `❌ Error: ${err.message}`;
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  };

  const runPython = async (code) => {
    if (!pyodide) {
      return "⏳ Loading Python... Please wait.";
    }
    try {
      pyodide.globals.set('input', async (prompt) => {
        if (prompt) {
          appendToTerminal(prompt);
        }
        const userInput = await waitForTerminalInput();
        return userInput;
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
      if (stderr) output += `\n❌ ${stderr}`;
      
      return output || '✅ Done';
    } catch (err) {
      return `❌ Error: ${err.message}`;
    }
  };

  // C++ execution that properly handles multiple inputs
  const runCpp = async (code) => {
    try {
      const needsInput = code.includes('cin') || code.includes('scanf');
      
      if (!needsInput) {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language: 'cpp', input: '' })
        });
        const data = await response.json();
        return data.output || '✅ Done';
      }
      
      // For programs that need input, we need to simulate interactive input
      // First, run the program to get prompts
      let allOutput = '';
      let currentInput = '';
      
      // Since JDoodle requires all input at once, we need to collect all inputs first
      // We'll parse the program to find all prompts
      // But simpler: ask user for all inputs at once
      appendToTerminal('📝 Enter all inputs (separate with spaces):\n');
      const allInputs = await waitForTerminalInput();
      
      appendToTerminal('⏳ Running...\n');
      
      const response = await fetch('http://localhost:5000/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'cpp', input: allInputs })
      });
      const data = await response.json();
      
      return data.output || '✅ Done';
    } catch (err) {
      return `❌ Error: ${err.message}`;
    }
  };

  const runJava = async (code) => {
    try {
      const needsInput = code.includes('Scanner') || code.includes('System.in');
      
      if (!needsInput) {
        const response = await fetch('http://localhost:5000/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language: 'java', input: '' })
        });
        const data = await response.json();
        return data.output || '✅ Done';
      }
      
      appendToTerminal('📝 Enter all inputs (separate with spaces):\n');
      const allInputs = await waitForTerminalInput();
      
      appendToTerminal('⏳ Running...\n');
      
      const response = await fetch('http://localhost:5000/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'java', input: allInputs })
      });
      const data = await response.json();
      return data.output || '✅ Done';
    } catch (err) {
      return `❌ Error: ${err.message}`;
    }
  };

  const runCode = async () => {
    const code = editorRef.current.getValue();
    setIsRunning(true);
    appendToTerminal(`\n🚀 Running ${language.toUpperCase()}...\n${'─'.repeat(40)}\n`);

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
          result = `📝 ${language.toUpperCase()} requires local compiler.`;
      }
      
      appendToTerminal(`${result}\n${'─'.repeat(40)}\n`);
    } catch (err) {
      appendToTerminal(`❌ Error: ${err.message}\n`);
    } finally {
      setIsRunning(false);
      setTerminalWaiting(false);
    }
  };

  const createNewFile = () => {
    const fileName = prompt('Enter file name:');
    if (fileName) {
      const extension = fileName.split('.').pop();
      const lang = languages.find(l => {
        const extMap = { js: 'javascript', py: 'python', java: 'java', cpp: 'cpp' };
        return extMap[extension] === l.value;
      }) || languages[0];
      
      const newFile = { name: fileName, content: `// ${fileName}\n` };
      setFileList([...fileList, newFile]);
      setCurrentFile(newFile);
      setLanguage(lang.value);
    }
  };

  const deleteFile = (fileName) => {
    if (fileList.length === 1) {
      alert('Cannot delete the last file');
      return;
    }
    setFileList(fileList.filter(f => f.name !== fileName));
    setCurrentFile(fileList[0]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#1e1e1e' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px', background: '#252526', borderBottom: '1px solid #3e3e42',
        flexWrap: 'wrap', gap: '8px', flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select value={currentFile.name} onChange={(e) => {
            const file = fileList.find(f => f.name === e.target.value);
            setCurrentFile(file);
            const ext = file.name.split('.').pop();
            const extMap = { js: 'javascript', py: 'python', java: 'java', cpp: 'cpp' };
            setLanguage(extMap[ext] || 'javascript');
          }} style={{ padding: '4px 8px', background: '#3c3c3c', color: 'white', border: 'none', borderRadius: '4px' }}>
            {fileList.map(file => (<option key={file.name} value={file.name}>📄 {file.name}</option>))}
          </select>
          <button onClick={createNewFile} style={{ padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>➕</button>
          <button onClick={() => deleteFile(currentFile.name)} style={{ padding: '4px 8px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} style={{ padding: '4px 8px', background: '#3c3c3c', color: 'white', border: 'none', borderRadius: '4px' }}>
            {languages.map(lang => (<option key={lang.value} value={lang.value}>{lang.label}</option>))}
          </select>
          <button onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')} style={{ padding: '4px 8px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {theme === 'vs-dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={saveFile} style={{ padding: '4px 8px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>💾</button>
          <button onClick={runCode} disabled={isRunning} style={{ padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isRunning ? '⏳' : '▶️'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {collaborators.map(collab => (
            <div key={collab.id} style={{ width: '24px', height: '24px', borderRadius: '50%', background: collab.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: 'white', position: 'relative' }} title={collab.name}>
              {collab.name.charAt(0).toUpperCase()}
              <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '6px', height: '6px', background: '#4CAF50', borderRadius: '50%' }} />
            </div>
          ))}
          {isConnected && <span style={{ fontSize: '10px', color: '#4CAF50' }}>● Live</span>}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor height="100%" language={language} theme={theme} value={currentFile.content} onMount={handleEditorDidMount} options={{ automaticLayout: true, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on' }} />
      </div>

      {/* Terminal - VS Code Style */}
      <div style={{ height: '180px', background: '#1e1e1e', borderTop: '1px solid #3e3e42', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '4px 10px', background: '#252526', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #3e3e42' }}>
          <span style={{ color: 'white', fontSize: '11px', fontWeight: 'bold' }}>TERMINAL</span>
          <button onClick={clearTerminal} style={{ padding: '2px 6px', background: '#3c3c3c', color: '#ccc', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>Clear</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#d4d4d4' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace' }}>{terminalOutput}</pre>
          {terminalWaiting && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                ref={terminalInputRef}
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyPress={handleTerminalKeyPress}
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#d4d4d4', fontFamily: 'Consolas, monospace', fontSize: '12px', outline: 'none' }}
                autoFocus
              />
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;